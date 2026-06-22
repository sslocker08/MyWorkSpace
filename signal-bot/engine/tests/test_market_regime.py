"""Deterministic tests for HMM-based market regime detection.

Follows the conftest analytic / RNG-free contract for any series whose label is
asserted: the benchmark paths here are built from explicit constant ramps and a
fixed alternating-sign or sinusoid jitter (NEVER numpy.random), so the rule-based
labels are byte-stable across numpy versions and machines.

The HMM tests are gated behind ``pytest.importorskip("hmmlearn")`` so they SKIP
cleanly when hmmlearn (and its scikit-learn dependency) is not installed, rather
than failing — matching the production fallback contract in market_regime.py.
"""
import numpy as np
import pandas as pd
import pytest

from core.market_regime import (
    classify_rule_based,
    detect_regime,
    HMMRegimeDetector,
    BULL,
    BEAR,
    HIGH_VOL,
    NEUTRAL,
    VALID_LABELS,
    MIN_HMM_BARS,
)

ANCHOR = pd.Timestamp("2020-01-01")


def _index(n: int) -> pd.DatetimeIndex:
    return pd.date_range(start=ANCHOR, periods=n, freq="B")


def _frame(close: np.ndarray) -> pd.DataFrame:
    """Build a minimal valid OHLCV frame from an analytic close path (no RNG)."""
    close = np.asarray(close, dtype=float)
    n = len(close)
    open_ = np.empty(n)
    open_[0] = close[0]
    open_[1:] = close[:-1]
    return pd.DataFrame(
        {
            "open": open_,
            "high": np.maximum(open_, close) * 1.001,
            "low": np.minimum(open_, close) * 0.999,
            "close": close,
            "volume": np.full(n, 1_000_000.0),
        },
        index=_index(n),
    )


# ---------------------------------------------------------------------------
# Analytic benchmark fixtures (RNG-free; verified mid-band margins)
# ---------------------------------------------------------------------------

def _bull_benchmark() -> pd.DataFrame:
    """Steady uptrend, comfortably above its 200MA, very low realized vol.

    Verified: realized vol ~= 0.002 (<< 0.35 VOL_HIGH), price > 200MA -> BULL.
    """
    n = 300
    rets = np.full(n, 0.0008) + 0.0002 * np.sin(np.arange(n) / 5.0)
    close = 100.0 * np.cumprod(1.0 + rets)
    return _frame(close)


def _bear_benchmark() -> pd.DataFrame:
    """Downtrend below its 200MA with ELEVATED (not crisis) realized vol.

    A constant negative drift plus a fixed alternating-sign jitter (period 2)
    gives a genuine high per-bar std without averaging out. Verified: realized
    vol ~= 0.407 (inside [0.35 VOL_HIGH, 0.50 VOL_VERY_HIGH)) and price < 200MA
    -> BEAR.
    """
    n = 300
    jitter = 0.025 * ((-1.0) ** np.arange(n))
    rets = np.full(n, -0.0020) + jitter
    close = 200.0 * np.cumprod(1.0 + rets)
    return _frame(close)


def _highvol_benchmark() -> pd.DataFrame:
    """Large swings -> crisis-level realized vol regardless of trend.

    Verified: realized vol ~= 0.589 (>= 0.50 VOL_VERY_HIGH) -> HIGH_VOL.
    """
    n = 300
    rets = 0.05 * np.sin(np.arange(n) / 2.0)
    close = 100.0 * np.cumprod(1.0 + rets)
    return _frame(close)


# ---------------------------------------------------------------------------
# Rule-based path — always runnable (no hmmlearn needed)
# ---------------------------------------------------------------------------

def test_rule_based_bull():
    assert classify_rule_based(_bull_benchmark()) == BULL


def test_rule_based_bear():
    assert classify_rule_based(_bear_benchmark()) == BEAR


def test_rule_based_high_vol():
    assert classify_rule_based(_highvol_benchmark()) == HIGH_VOL


def test_rule_based_returns_valid_label_on_short_series():
    """A very short series must still return a valid label, never raise."""
    close = 100.0 * np.cumprod(1.0 + np.full(30, 0.001))
    label = classify_rule_based(_frame(close))
    assert label in VALID_LABELS


def test_rule_based_degenerate_series():
    """Single-bar / empty-ish series -> NEUTRAL, no exception."""
    one = _frame(np.array([100.0]))
    assert classify_rule_based(one) == NEUTRAL


# ---------------------------------------------------------------------------
# detect_regime fallback — <250 bars must use rule-based without raising
# ---------------------------------------------------------------------------

def test_detect_regime_falls_back_on_insufficient_data():
    """Below MIN_HMM_BARS, detect_regime uses rule-based and returns a valid label."""
    n = MIN_HMM_BARS - 1
    assert n < MIN_HMM_BARS
    close = 100.0 * np.cumprod(1.0 + np.full(n, 0.001))
    label = detect_regime(_frame(close))
    assert label in VALID_LABELS


def test_detect_regime_empty_returns_neutral():
    empty = pd.DataFrame({"open": [], "high": [], "low": [], "close": [], "volume": []})
    assert detect_regime(empty) == NEUTRAL


def test_detect_regime_matches_rule_based_when_hmm_disabled():
    """With use_hmm=False, detect_regime is exactly the rule-based classifier."""
    bull = _bull_benchmark()
    assert detect_regime(bull, use_hmm=False) == classify_rule_based(bull) == BULL


# ---------------------------------------------------------------------------
# HMM path — skips cleanly when hmmlearn is unavailable
# ---------------------------------------------------------------------------

def _bull_then_bear_series() -> pd.DataFrame:
    """Concatenated strong-bull then strong-bear regime for HMM training.

    Two clearly separable return distributions so the 3-state EM fit has real
    structure to learn. Analytic / RNG-free for reproducibility.
    """
    n_bull, n_bear = 200, 200
    bull = np.full(n_bull, 0.004) + 0.001 * np.sin(np.arange(n_bull) / 4.0)
    bear = np.full(n_bear, -0.004) + 0.003 * np.sin(np.arange(n_bear) / 4.0)
    rets = np.concatenate([bull, bear])
    close = 100.0 * np.cumprod(1.0 + rets)
    return _frame(close)


def test_hmm_fit_is_deterministic():
    """Two independent fits on the same data yield IDENTICAL state labelings.

    This proves determinism is anchored to the data (random_state=42 + emission-
    statistics labeling), not to hmmlearn's arbitrary internal state numbering.
    """
    pytest.importorskip("hmmlearn")
    df = _bull_then_bear_series()

    d1 = HMMRegimeDetector().fit(df)
    d2 = HMMRegimeDetector().fit(df)

    # Same per-bar label sequence across both fits (the externally observable,
    # state-numbering-independent contract).
    feat = HMMRegimeDetector.build_features(df)
    seq1 = [d1.state_labels[int(s)] for s in d1.model.predict(feat.to_numpy(dtype=float))]
    seq2 = [d2.state_labels[int(s)] for s in d2.model.predict(feat.to_numpy(dtype=float))]
    assert seq1 == seq2

    # And the final prediction is identical and valid.
    assert d1.predict(df) == d2.predict(df)
    assert d1.predict(df) in VALID_LABELS


def test_hmm_predict_returns_valid_label():
    pytest.importorskip("hmmlearn")
    df = _bull_then_bear_series()
    detector = HMMRegimeDetector().fit(df)
    label = detector.predict(df)
    assert label in {BULL, BEAR, HIGH_VOL}


def test_hmm_labels_cover_distinct_states():
    """All three trained states get the three distinct labels (no collisions)."""
    pytest.importorskip("hmmlearn")
    df = _bull_then_bear_series()
    detector = HMMRegimeDetector().fit(df)
    assert set(detector.state_labels.values()) == {BULL, BEAR, HIGH_VOL}


def test_detect_regime_uses_hmm_when_available():
    """With >= MIN_HMM_BARS and hmmlearn present, detect_regime returns a valid
    HMM label (one of the three trained labels, never NEUTRAL)."""
    pytest.importorskip("hmmlearn")
    df = _bull_then_bear_series()
    assert len(df) >= MIN_HMM_BARS
    label = detect_regime(df, use_hmm=True)
    assert label in {BULL, BEAR, HIGH_VOL}
