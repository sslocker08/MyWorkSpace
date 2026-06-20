"""HMM-based market regime detection (Bull / Bear / High-Vol) for signal scoring.

The signal scorer (``core/signal_scorer.py``) gives a +10% bonus to LONG signals
in a "BULL" regime and to SHORT signals in a "BEAR" regime, so the regime string
feeds money logic and MUST be deterministic and crash-proof.

Two layers:

1. ``HMMRegimeDetector`` — a 3-state GaussianHMM (hmmlearn) fitted on benchmark
   (SPY) features. The hidden-state INDEX that hmmlearn assigns is arbitrary and
   not stable across fits, so we NEVER expose it directly: after fitting we map
   the three states to the fixed string labels BULL/BEAR/HIGH_VOL by ordering the
   learned per-state means/variances (highest mean-return -> BULL, lowest mean-
   return -> BEAR, highest variance -> HIGH_VOL). This makes the emitted label a
   pure function of the data, independent of hmmlearn's internal numbering.

2. ``classify_rule_based`` — a dependency-free SPY-vs-200MA + realized-vol rule.

WHY a rule-based fallback exists (per llm-context-engineering-repo: document the
WHY, not just the WHAT): the HMM path can be unavailable for two independent
reasons that must never crash a scan — (a) ``hmmlearn`` (and its scikit-learn
dependency) may not be installed in the runtime, and (b) even when installed, an
EM fit needs a long, clean history (>= ~250 bars); on short or degenerate series
hmmlearn raises / fails to converge. ``detect_regime`` therefore tries the HMM
only when it is importable AND there are enough bars, and falls back to the
rule-based classifier on ANY exception or insufficient data. The fallback uses
only pandas/numpy, so the regime feature degrades gracefully instead of breaking
the scan when the heavy ML stack is absent.
"""
from __future__ import annotations

import logging
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Guard the heavy/optional ML import. hmmlearn pulls in scikit-learn; if either is
# missing we must still be able to detect a regime via the rule-based path. Never
# let an ImportError here propagate into the scan.
try:  # pragma: no cover - exercised by environment, not unit tests
    from hmmlearn import hmm
except ImportError:  # pragma: no cover
    hmm = None
    logger.warning(
        "hmmlearn not available — market regime detection will use the "
        "rule-based fallback (SPY vs 200MA + realized vol)."
    )

# Canonical regime labels. NEUTRAL is produced only by the rule-based path / a
# fetch failure; the HMM always emits one of the three trained labels.
BULL = "BULL"
BEAR = "BEAR"
HIGH_VOL = "HIGH_VOL"
NEUTRAL = "NEUTRAL"
VALID_LABELS = {BULL, BEAR, HIGH_VOL, NEUTRAL}

# Minimum bars required to attempt an HMM fit. An EM fit on a 3-state full-cov
# Gaussian needs a long, clean history; below this we go straight to rule-based.
MIN_HMM_BARS = 250


def _close_series(benchmark_df: pd.DataFrame) -> pd.Series:
    """Extract the close column as a float Series (case-insensitive)."""
    if "close" in benchmark_df.columns:
        col = "close"
    elif "Close" in benchmark_df.columns:
        col = "Close"
    else:
        raise ValueError("benchmark_df has no 'close' column")
    return benchmark_df[col].astype(float)


class HMMRegimeDetector:
    """3-state GaussianHMM regime detector with deterministic state labeling.

    States are labeled by their learned emission statistics, NOT by hmmlearn's
    arbitrary internal state index, so the string label for a given dataset is
    stable across fits (verified by the determinism test).
    """

    N_COMPONENTS = 3

    def __init__(self) -> None:
        self.model = None
        # state_index -> label ("BULL"/"BEAR"/"HIGH_VOL"), filled by fit().
        self.state_labels: dict[int, str] = {}

    # ------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------
    @staticmethod
    def build_features(
        benchmark_df: pd.DataFrame, vix: Optional[pd.Series] = None
    ) -> pd.DataFrame:
        """Build the HMM feature matrix from a benchmark price series.

        Features: daily return, rolling 5-day return std, rolling 20-day return
        mean, and (when a vix series is provided) the aligned vix level. NaN rows
        from the rolling warmup are dropped so hmmlearn receives a clean matrix.
        """
        close = _close_series(benchmark_df)
        ret = close.pct_change()
        feat = pd.DataFrame(
            {
                "ret": ret,
                "vol5": ret.rolling(5).std(),
                "mean20": ret.rolling(20).mean(),
            },
            index=close.index,
        )
        if vix is not None:
            # Align the vix series to the benchmark index; only return-based
            # volatility is used when vix is absent (per spec).
            feat["vix"] = pd.Series(vix, index=close.index).astype(float).reindex(close.index)
        return feat.dropna()

    # ------------------------------------------------------------------
    # Fit
    # ------------------------------------------------------------------
    def fit(self, benchmark_df: pd.DataFrame, vix: Optional[pd.Series] = None) -> "HMMRegimeDetector":
        """Fit the 3-state GaussianHMM and assign deterministic state labels.

        Determinism is enforced by ``random_state=42`` AND by re-labeling states
        from their learned means/variances rather than trusting hmmlearn's state
        numbering (which can permute between runs).
        """
        if hmm is None:
            raise RuntimeError("hmmlearn is not installed; cannot fit HMM")

        feat = self.build_features(benchmark_df, vix)
        if len(feat) < self.N_COMPONENTS:
            raise ValueError(
                f"Not enough feature rows ({len(feat)}) to fit a "
                f"{self.N_COMPONENTS}-state HMM"
            )

        X = feat.to_numpy(dtype=float)
        model = hmm.GaussianHMM(
            n_components=self.N_COMPONENTS,
            covariance_type="full",
            n_iter=1000,
            random_state=42,
        )
        model.fit(X)

        self.model = model
        self.state_labels = self._label_states(model)
        return self

    @staticmethod
    def _label_states(model) -> dict[int, str]:
        """Map each hidden-state index to a stable BULL/BEAR/HIGH_VOL label.

        Ordering rule (deterministic function of the learned emissions):
          - HIGH_VOL = state with the highest total emission variance,
          - among the remaining two, BULL = higher mean return, BEAR = lower.

        The mean RETURN is feature column 0 ("ret"). Variance is summed across the
        diagonal of each state's covariance so it is a single comparable scalar.
        """
        means_ret = model.means_[:, 0]                 # per-state mean daily return
        # Sum of diagonal variances per state (total dispersion of emissions).
        covars = model.covars_                          # shape (n, d, d) for "full"
        variances = np.array([np.trace(c) for c in covars])

        n = model.n_components
        high_vol_state = int(np.argmax(variances))

        # The two non-high-vol states ranked by mean return -> BULL (high) / BEAR.
        others = [s for s in range(n) if s != high_vol_state]
        others_sorted = sorted(others, key=lambda s: means_ret[s], reverse=True)
        bull_state = others_sorted[0]
        bear_state = others_sorted[-1]

        labels = {high_vol_state: HIGH_VOL, bull_state: BULL, bear_state: BEAR}
        # Defensive: if a tie collapsed two roles onto one index, fill any unset
        # state so every index has a label (should not happen with distinct stats).
        for s in range(n):
            labels.setdefault(s, HIGH_VOL)
        return labels

    # ------------------------------------------------------------------
    # Predict
    # ------------------------------------------------------------------
    def predict(self, recent_df: pd.DataFrame, vix: Optional[pd.Series] = None) -> str:
        """Return the regime label of the MOST RECENT bar in ``recent_df``."""
        if self.model is None:
            raise RuntimeError("HMMRegimeDetector.predict called before fit()")

        feat = self.build_features(recent_df, vix)
        if feat.empty:
            raise ValueError("No feature rows available for prediction")

        states = self.model.predict(feat.to_numpy(dtype=float))
        last_state = int(states[-1])
        return self.state_labels.get(last_state, HIGH_VOL)


def classify_rule_based(benchmark_df: pd.DataFrame) -> str:
    """Dependency-free regime classification (always works, no hmmlearn).

    Uses SPY vs its 200-day moving average plus realized (annualized) volatility:
      - HIGH_VOL  if realized vol is very high (regardless of trend),
      - BULL      if price > 200MA and vol is low,
      - BEAR      if price < 200MA and vol is high,
      - NEUTRAL   otherwise (mixed signals).

    Falls back to whatever MA window the data supports when < 200 bars exist, so
    short series still return a sensible label instead of raising.
    """
    close = _close_series(benchmark_df)
    if len(close) < 2:
        return NEUTRAL

    window = min(200, len(close))
    ma = close.rolling(window).mean().iloc[-1]
    price = float(close.iloc[-1])

    ret = close.pct_change().dropna()
    # Annualized realized vol from the most recent ~20 trading days (or all we have).
    recent = ret.iloc[-20:] if len(ret) >= 20 else ret
    realized_vol = float(recent.std() * np.sqrt(252)) if len(recent) > 1 else 0.0

    # Thresholds: ~35% annualized = elevated, ~50% = crisis-level churn.
    VOL_HIGH = 0.35
    VOL_VERY_HIGH = 0.50

    if realized_vol >= VOL_VERY_HIGH:
        return HIGH_VOL

    above_ma = pd.notna(ma) and price > float(ma)
    below_ma = pd.notna(ma) and price < float(ma)

    if above_ma and realized_vol < VOL_HIGH:
        return BULL
    if below_ma and realized_vol >= VOL_HIGH:
        return BEAR
    return NEUTRAL


def detect_regime(
    benchmark_df: pd.DataFrame,
    vix: Optional[pd.Series] = None,
    use_hmm: bool = True,
) -> str:
    """Detect the current market regime, preferring HMM with rule-based fallback.

    Tries the GaussianHMM only when it is importable AND there is enough history
    (>= MIN_HMM_BARS). Falls back to ``classify_rule_based`` on insufficient data
    or ANY exception during fit/predict, so the scan never crashes because the ML
    stack is missing or the series is too short. Returns one of
    BULL/BEAR/HIGH_VOL/NEUTRAL.
    """
    if benchmark_df is None or len(benchmark_df) == 0:
        return NEUTRAL

    if use_hmm and hmm is not None and len(benchmark_df) >= MIN_HMM_BARS:
        try:
            detector = HMMRegimeDetector()
            detector.fit(benchmark_df, vix)
            return detector.predict(benchmark_df, vix)
        except Exception as exc:  # noqa: BLE001 - any HMM failure -> safe fallback
            logger.warning(
                "HMM regime detection failed (%s) — falling back to rule-based.",
                exc,
            )

    return classify_rule_based(benchmark_df)


async def compute_market_regime(fetcher) -> str:
    """Fetch the benchmark (SPY) and return its detected regime.

    Computed ONCE per scan (not per ticker). On any fetch failure returns
    "NEUTRAL" so a data outage degrades the regime bonus to a no-op rather than
    failing the scan.
    """
    from universe import UniverseManager

    benchmark = UniverseManager().get_benchmark()  # "SPY"
    try:
        # Request enough history for the HMM path (>= MIN_HMM_BARS trading days).
        df = await fetcher.get_ohlcv(benchmark, days=400)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not fetch benchmark %s for regime: %s", benchmark, exc)
        return NEUTRAL

    if df is None or len(df) == 0:
        return NEUTRAL

    try:
        return detect_regime(df)
    except Exception as exc:  # noqa: BLE001 - defensive; detect_regime already guards
        logger.warning("detect_regime raised unexpectedly (%s) — NEUTRAL.", exc)
        return NEUTRAL
