"""Composite Ceiling Score engine (market-top detector, 0-100).

This module ASSEMBLES the independently-degradable macro/sentiment collectors
from :mod:`core.sentiment_macro` plus a few locally-COMPUTED axes (sector
rotation, semiconductor cycle, a partial VIX signal) into a single weighted
"Ceiling Score" in ``[0, 100]`` where **HIGH == elevated market-top risk**.

Design contract
===============
* **Never raises, never NaN.** Every axis yields either a ``float`` in ``[0, 1]``
  OR ``None`` (its source is degraded / unavailable). A failure in any single
  source or fetch NEVER propagates: the computed axes are each wrapped so a
  data-fetch error degrades that axis to ``None`` instead of raising.
* **Weight renormalization over AVAILABLE axes.** The final score is the weighted
  average over ONLY the axes that produced a value, with their weights
  renormalized to sum to 1. So if some sources are down the score is still a valid
  0-100 over the rest — missing axes are SKIPPED, never silently treated as 0.
  Crucially this means an axis with no live feed must be ``None`` (unavailable),
  NOT a 0.5 stand-in: a 0.5 placeholder would stay "available" and drag every
  real reading toward 50, so the placeholder axes below are ``None`` until a real
  feed lands and therefore drop out of renormalization (they do NOT dilute).
  If NO axis is available the engine returns a degraded :class:`CeilingScore`
  flagged ``degraded=True`` with a neutral ``50.0`` (documented placeholder).
* **Minimum-axes reliability floor.** Even with renormalization, a score built
  from only 1-3 axes is too thin to trust. ``_assemble`` still returns the
  computed ``total`` but flags ``degraded=True`` whenever fewer than
  ``MIN_RELIABLE_AXES`` axes are available (see that constant). Consumers should
  treat a degraded ceiling as neutral (skip the ceiling multiplier) rather than
  acting on a 1-3-axis reading.
* **Provenance inline.** Each axis documents its source, what its [0,1]
  normalization MEANS (1.0 == max top-risk / froth, 0.0 == max fear), and — for
  the placeholder axes without a live feed — why they are ``None``/unavailable
  and what would replace them. (per llm-context-engineering-repo: comment the WHY.)

Axis inventory (weights from the plan; sum of the full set == 1.00)
-------------------------------------------------------------------
| axis                  | weight | source                                          |
|-----------------------|--------|-------------------------------------------------|
| baa_bull_bear         | 0.15   | override if injected, else None (no free API)   |
| aaii_sentiment        | 0.10   | collector (contrarian bull%)                    |
| put_call_ratio        | 0.10   | collector (5-day equity P/C, inverted)          |
| fear_greed            | 0.08   | collector (CNN F&G, greed==top)                 |
| margin_debt           | 0.10   | collector (FINRA/Fed YoY)                       |
| breadth_deterioration | 0.12   | None until a real breadth feed lands            |
| vix_term_structure    | 0.10   | vix_utils if available, else VIX-level proxy    |
| valuation_composite   | 0.10   | None until a real CAPE/valuation source lands   |
| sector_rotation       | 0.10   | COMPUTED (defensive vs cyclical 21d spread)     |
| semi_cycle            | 0.05   | COMPUTED (SOXX MACD sign)                       |
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd

from core.indicators import macd
from core.sentiment_macro import MacroSentimentCollector, collect_all

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Axis weights (the FULL set sums to 1.00). Renormalization (below) takes a
# SUBSET of these — the available axes — and rescales them to sum to 1.
# ---------------------------------------------------------------------------
AXIS_WEIGHTS: dict[str, float] = {
    "baa_bull_bear": 0.15,
    "aaii_sentiment": 0.10,
    "put_call_ratio": 0.10,
    "fear_greed": 0.08,
    "margin_debt": 0.10,
    "breadth_deterioration": 0.12,
    "vix_term_structure": 0.10,
    "valuation_composite": 0.10,
    "sector_rotation": 0.10,
    "semi_cycle": 0.05,
}

# Neutral value used for the all-degraded fallback total. 0.5 == "no opinion" on
# the [0,1] top-risk scale. NOTE: this is NOT used as a per-axis placeholder —
# axes without a live feed are None (so they drop out of renormalization rather
# than dragging real readings toward 50). Kept for the all-empty fallback and as
# a public constant other modules/tests reference.
NEUTRAL = 0.5

# Minimum number of available axes for the composite score to be considered
# reliable. Below this floor the score is too thin to trust (a 1-3-axis reading
# is dominated by whichever few axes happened to be up), so it is flagged
# ``degraded=True``. The total is STILL computed and returned so the endpoint can
# surface it WITH the degraded flag; consumers should treat a degraded ceiling as
# neutral (skip the ceiling multiplier) rather than acting on it.
MIN_RELIABLE_AXES = 4

# Regime thresholds (on the 0-100 score). >70 == top-zone caution, 40-70 ==
# watch, <40 == safe. (Matches the spec's 天井圏/警戒/安全 banding.)
REGIME_HIGH = 70.0
REGIME_LOW = 40.0

# --- sector_rotation tuning -------------------------------------------------
# Defensive (XLU/XLP/XLV) vs cyclical (XLK/XLY/XLB) 21-trading-day total-return
# spread. Defensive OUTPERFORMING cyclicals == late-cycle risk-off rotation == a
# market-top signal. We map the spread (defensive_ret - cyclical_ret) to [0,1]:
#   spread >= +6%  -> ~1.0  (strong defensive leadership == top risk)
#   spread <= -6%  -> ~0.0  (cyclicals leading == risk-on, healthy)
#   spread ==  0%  -> 0.5   (neutral)
# i.e. clamp(0.5 + spread/0.12, 0, 1). The ±6% band ~ a meaningful one-month
# rotation between sector baskets; chosen as a documented heuristic (no single
# canonical threshold exists for this composite). DEBT: could be calibrated
# against historical pre-top windows in a later iteration.
SECTOR_ROTATION_LOOKBACK = 21       # ~1 trading month
SECTOR_ROTATION_SPREAD_FULL = 0.12  # spread that saturates the [0,1] edges (±6%)
DEFENSIVE_SECTORS = ["XLU", "XLP", "XLV"]
CYCLICAL_SECTORS = ["XLK", "XLY", "XLB"]

# --- semi_cycle tuning ------------------------------------------------------
# Semiconductors (SOXX) lead the tech/cap-ex cycle; a NEGATIVE MACD (12/26/9) on
# SOXX == momentum has rolled over == a leading top signal for the broad market.
# Book-to-bill (the other classic semi top tell) has no free feed -> manual/None.
# We map only the MACD sign to a coarse [0,1]:
#   MACD < 0 -> 0.8   (semis rolling over == elevated top risk)
#   MACD >= 0 -> 0.2  (semis healthy == low top risk)
# A coarse two-level mapping is intentional: this is a 5%-weight confirming axis,
# not a precise gauge. DEBT: book-to-bill would refine it if a feed appears.
SEMI_TICKER = "SOXX"
SEMI_MACD_TOP = 0.8
SEMI_MACD_OK = 0.2

# --- vix_term_structure tuning ---------------------------------------------
# Preferred: real VIX term structure (front vs second month) via `vix_utils`;
# backwardation (M1>M2) == acute stress, contango (M1<M2, the normal state) is
# the baseline and a VERY FLAT/low VIX == complacency. We don't have a guaranteed
# vix_utils install, so the implemented fallback derives a PARTIAL signal from the
# VIX collector LEVEL: a very low VIX == complacency == top risk.
#   VIX <= 12 -> ~1.0 (deep complacency == top risk)
#   VIX >= 22 -> ~0.0 (elevated fear / no complacency)
# i.e. clamp((22 - vix)/10, 0, 1). 12/22 bracket the historical "calm" band.
# DEBT: this is a LEVEL proxy, not a true term-structure slope.
VIX_COMPLACENCY_LOW = 12.0
VIX_COMPLACENCY_HIGH = 22.0


def _clamp01(x: float) -> Optional[float]:
    """Clamp to [0,1]; return None on NaN/inf so a bad value degrades (not 0)."""
    if x is None:
        return None
    xf = float(x)
    if not np.isfinite(xf):
        return None
    return max(0.0, min(1.0, xf))


@dataclass
class CeilingScore:
    """Result of a composite ceiling-score computation.

    Attributes
    ----------
    total : float
        Final score in ``[0, 100]`` (HIGH == elevated market-top risk).
    breakdown : dict[str, float | None]
        Per-axis normalized contribution in ``[0,1]``, or ``None`` for a
        degraded/unavailable axis (kept so the absence is explicit, not 0).
    weights_used : dict[str, float]
        The RENORMALIZED weights actually applied (only the available axes;
        sum == 1.0). Empty when fully degraded.
    available_axes : int
        Count of axes that produced a value.
    degraded : bool
        True when fewer than ``MIN_RELIABLE_AXES`` axes were available (the score
        is too thin to trust); the all-degraded fallback also sets this True (with
        ``available_axes == 0`` and ``total == 50``).
    raw : dict
        Raw underlying values captured for persistence (aaii bull%, P/C, etc.).
    computed_at : datetime
        UTC timestamp of the computation.
    """

    total: float
    breakdown: dict[str, Optional[float]]
    weights_used: dict[str, float]
    available_axes: int
    degraded: bool
    raw: dict = field(default_factory=dict)
    computed_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def regime(self) -> str:
        return regime_label(self.total)


def regime_label(total: float) -> str:
    """Map a 0-100 ceiling score to its regime label.

    >70  -> "天井圏" (CAUTION-high, top-zone)
    40-70 -> "警戒"  (watch)
    <40  -> "安全"  (safe)
    """
    if total > REGIME_HIGH:
        return "天井圏"
    if total >= REGIME_LOW:
        return "警戒"
    return "安全"


class MarketIntelligenceEngine:
    """Assembles the 10 axes into a single weighted ceiling score.

    Parameters
    ----------
    collector : MacroSentimentCollector, optional
        Source of the external macro/sentiment readings. A shared module-level
        instance is used if omitted (so its in-process cache is reused).
    data_fetcher : object, optional
        Provides ``get_sector_prices(tickers, days)`` and ``get_ohlcv(ticker,
        days)`` for the computed axes. Defaults to the signal-engine's shared
        fetcher (imported lazily so importing this module never pulls in the
        Polygon client / API keys at import time, and tests can inject a stub).
    baa_bull_bear_override : float, optional
        Optional injected value (in ``[0,1]``) for the BAA bull/bear axis, which
        has no free API. When None the axis uses the documented neutral default.
    """

    def __init__(
        self,
        collector: Optional[MacroSentimentCollector] = None,
        data_fetcher: Optional[object] = None,
        baa_bull_bear_override: Optional[float] = None,
    ) -> None:
        self.collector = collector
        self._data_fetcher = data_fetcher
        self.baa_bull_bear_override = baa_bull_bear_override

    @property
    def data_fetcher(self):
        """Lazily resolve the shared data fetcher (avoids import-time API client)."""
        if self._data_fetcher is None:
            from core.signal_engine import _fetcher  # lazy: needs API keys
            self._data_fetcher = _fetcher
        return self._data_fetcher

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------
    async def compute_ceiling_score(self) -> CeilingScore:
        """Compute the composite ceiling score. Never raises; never NaN.

        Gathers the collector readings and the three computed axes concurrently,
        maps each to a [0,1] top-risk contribution (or None when degraded), then
        renormalizes the available axes' weights and returns a CeilingScore.
        """
        # collect_all already swallows per-source errors; guard the whole call too
        # so even an unexpected failure degrades to "all collectors down".
        try:
            collected = await collect_all(self.collector)
        except Exception as exc:  # noqa: BLE001 — defensive backstop
            logger.warning("compute_ceiling_score: collect_all failed (%s)", exc)
            collected = {}

        # The three COMPUTED axes run concurrently and each is fully wrapped.
        sector_axis, semi_axis = await asyncio.gather(
            self._compute_sector_rotation(),
            self._compute_semi_cycle(),
        )

        raw: dict = {}

        # --- collector-derived axes ------------------------------------
        aaii = collected.get("aaii_sentiment")
        pc = collected.get("put_call")
        fg = collected.get("fear_greed")
        md = collected.get("margin_debt")
        vix = collected.get("vix")

        if aaii and aaii.ok:
            raw["aaii_bull_pct"] = aaii.raw.get("bull_pct")
        if pc and pc.ok:
            raw["put_call_5d"] = pc.raw.get("put_call_5d")
        if fg and fg.ok:
            raw["fear_greed_score"] = fg.raw.get("score")
        if md and md.ok:
            raw["margin_debt_yoy"] = md.raw.get("margin_debt_yoy")
        if vix and vix.ok:
            raw["vix"] = vix.raw.get("vix")

        vix_axis, vix_raw = self._vix_term_structure(vix)
        if vix_raw is not None:
            raw["vix_m1_m2_spread"] = vix_raw

        if sector_axis is not None:
            raw["sector_rotation_signal"] = sector_axis
        if semi_axis is not None:
            raw["semi_cycle_signal"] = semi_axis
        # book-to-bill has no free feed -> left for manual entry (None).
        raw.setdefault("semi_book_to_bill", None)

        # --- BAA bull/bear: no free API -> override or unavailable (None) ---
        # DEBT: the BAA-rated corporate-bond bull/bear oscillator has no free
        # endpoint and production NEVER supplies the override. Accept an injected
        # override when present; otherwise the axis is unavailable (None) until a
        # real feed lands, so it does NOT dilute the score (a 0.5 stand-in would
        # stay "available" and drag every real reading toward 50).
        baa = _clamp01(self.baa_bull_bear_override) if self.baa_bull_bear_override is not None else None
        raw["baa_bull_bear"] = baa

        breakdown: dict[str, Optional[float]] = {
            "baa_bull_bear": baa,
            "aaii_sentiment": (_clamp01(aaii.normalized) if (aaii and aaii.ok) else None),
            "put_call_ratio": (_clamp01(pc.normalized) if (pc and pc.ok) else None),
            "fear_greed": (_clamp01(fg.normalized) if (fg and fg.ok) else None),
            "margin_debt": (_clamp01(md.normalized) if (md and md.ok) else None),
            # DEBT: full market-breadth (advance/decline, new highs/lows,
            # distribution days) is a later iteration -> unavailable (None) until a
            # real feed lands, so it does NOT dilute the score.
            "breadth_deterioration": None,
            "vix_term_structure": vix_axis,
            # DEBT: valuation composite (CAPE / fwd P/E / market-cap-to-GDP)
            # needs a paid/scraped source -> unavailable (None) until a real feed
            # lands, so it does NOT dilute the score.
            "valuation_composite": None,
            "sector_rotation": sector_axis,
            "semi_cycle": semi_axis,
        }

        return self._assemble(breakdown, raw)

    # ------------------------------------------------------------------
    # Weighted renormalization over the AVAILABLE axes
    # ------------------------------------------------------------------
    def _assemble(
        self, breakdown: dict[str, Optional[float]], raw: dict
    ) -> CeilingScore:
        """Weighted-average the non-None axes with renormalized weights.

        Only axes that produced a value (not None) participate; placeholder axes
        without a live feed are None/unavailable and are dropped, so they neither
        count as zero NOR pin weight at a neutral 0.5.

        Worked example: suppose only aaii (w0.10, val0.8), margin_debt
        (w0.10, val0.6) and sector_rotation (w0.10, val0.4) are available; the
        rest are None. Their weights {0.10,0.10,0.10} renormalize to
        {1/3,1/3,1/3}, so total = (0.8+0.6+0.4)/3 * 100 = 60.0 — a valid 0-100
        score over just those three, NOT diluted by treating the missing ones
        as zero.

        Reliability floor: the computed ``total`` is always returned, but the
        result is flagged ``degraded=True`` when fewer than ``MIN_RELIABLE_AXES``
        axes are available (below the floor the score is too thin to trust;
        consumers should treat a degraded ceiling as neutral — skip the ceiling
        multiplier — rather than acting on a 1-3-axis reading). The all-empty
        path (available_axes == 0) returns a neutral 50.0, also degraded.
        """
        available = {
            axis: val for axis, val in breakdown.items() if val is not None
        }
        if not available:
            # All-degraded fallback: neutral 50, flagged, no axes.
            logger.warning("compute_ceiling_score: NO axis available — neutral 50 fallback")
            return CeilingScore(
                total=50.0,
                breakdown=breakdown,
                weights_used={},
                available_axes=0,
                degraded=True,
                raw=raw,
            )

        weight_sum = sum(AXIS_WEIGHTS[axis] for axis in available)
        # weight_sum > 0 is guaranteed (all AXIS_WEIGHTS are positive and
        # `available` is non-empty), so this division is always safe.
        weights_used = {
            axis: AXIS_WEIGHTS[axis] / weight_sum for axis in available
        }
        total01 = sum(available[axis] * weights_used[axis] for axis in available)
        total = round(float(total01) * 100.0, 2)
        # Final NaN backstop: if anything slipped through, fall back to neutral.
        if not np.isfinite(total):  # pragma: no cover — defensive
            total = 50.0

        # Below the reliability floor the score is too thin to trust (dominated by
        # whichever few axes were up); flag it degraded so consumers can treat the
        # ceiling as neutral and skip the multiplier rather than acting on it.
        degraded = len(available) < MIN_RELIABLE_AXES
        return CeilingScore(
            total=total,
            breakdown=breakdown,
            weights_used=weights_used,
            available_axes=len(available),
            degraded=degraded,
            raw=raw,
        )

    # ------------------------------------------------------------------
    # VIX term-structure axis (proxy from the VIX level when vix_utils absent)
    # ------------------------------------------------------------------
    def _vix_term_structure(self, vix_result) -> tuple[Optional[float], Optional[float]]:
        """Return (normalized [0,1] or None, raw_spread or None).

        Preferred path: real term structure via the optional ``vix_utils`` pkg
        (front vs second-month future). If unavailable, derive a PARTIAL signal
        from the VIX collector LEVEL: a very low VIX == complacency == top risk.
        Any failure -> (None, None) so the axis degrades, never raises.
        """
        # 1) Try a real term-structure slope via vix_utils (optional dep).
        try:
            import vix_utils  # type: ignore  # noqa: F401

            spread = self._vix_utils_spread()
            if spread is not None:
                # Backwardation (front > second, spread>0) == acute stress (NOT a
                # complacency top); contango (spread<0, normal) is baseline. We
                # invert: deeper contango (very calm) == higher top risk.
                #   spread <= -2 (steep contango/calm) -> ~1.0
                #   spread >= +2 (backwardation/stress) -> ~0.0
                norm = _clamp01((2.0 - spread) / 4.0)
                return norm, spread
        except Exception as exc:  # noqa: BLE001 — vix_utils missing or failing
            logger.debug("vix_utils term structure unavailable (%s) — level proxy", exc)

        # 2) Fallback: VIX-level complacency proxy from the collector reading.
        if vix_result is None or not vix_result.ok:
            return None, None
        level = vix_result.raw.get("vix")
        if level is None or not np.isfinite(float(level)):
            return None, None
        norm = _clamp01(
            (VIX_COMPLACENCY_HIGH - float(level))
            / (VIX_COMPLACENCY_HIGH - VIX_COMPLACENCY_LOW)
        )
        return norm, None

    @staticmethod
    def _vix_utils_spread() -> Optional[float]:  # pragma: no cover — needs the dep
        """Best-effort front-minus-second-month VIX-future spread via vix_utils.

        Returns None on any shape mismatch so the caller falls back to the level
        proxy. Kept tiny + defensive because the package's API has drifted across
        versions; we only need a scalar spread or nothing.
        """
        try:
            import vix_utils

            data = vix_utils.load_vix_term_structure()  # type: ignore[attr-defined]
            if data is None or len(data) < 2:
                return None
            latest = data.iloc[-1].dropna().to_numpy(dtype=float)
            if len(latest) < 2:
                return None
            return float(latest[0] - latest[1])
        except Exception:  # noqa: BLE001
            return None

    # ------------------------------------------------------------------
    # COMPUTED axis: sector rotation (defensive vs cyclical 21d spread)
    # ------------------------------------------------------------------
    async def _compute_sector_rotation(self) -> Optional[float]:
        """Defensive-minus-cyclical 21d return spread -> [0,1] top-risk, or None.

        Defensive (XLU/XLP/XLV) leading cyclical (XLK/XLY/XLB) over ~1 month ==
        late-cycle risk-off == top signal (high). Any fetch failure / missing
        data -> None (degraded), never raises.
        """
        try:
            tickers = DEFENSIVE_SECTORS + CYCLICAL_SECTORS
            # +50 cushion of days so 21 trading-day returns are well-covered.
            prices = await self.data_fetcher.get_sector_prices(
                tickers, days=SECTOR_ROTATION_LOOKBACK + 50
            )
            return self._sector_rotation_from_prices(prices)
        except Exception as exc:  # noqa: BLE001 — degrade the axis, never raise
            logger.warning("sector_rotation axis degraded: %s", exc)
            return None

    @staticmethod
    def _sector_rotation_from_prices(prices: pd.DataFrame) -> Optional[float]:
        """Pure, testable core of the sector-rotation axis (no I/O)."""
        if prices is None or prices.empty:
            return None

        def basket_return(group: list[str]) -> Optional[float]:
            cols = [t for t in group if t in prices.columns]
            if not cols:
                return None
            rets = []
            for t in cols:
                s = pd.to_numeric(prices[t], errors="coerce").dropna()
                if len(s) <= SECTOR_ROTATION_LOOKBACK:
                    continue
                start = float(s.iloc[-(SECTOR_ROTATION_LOOKBACK + 1)])
                end = float(s.iloc[-1])
                if start == 0 or not np.isfinite(start) or not np.isfinite(end):
                    continue
                rets.append((end - start) / start)
            if not rets:
                return None
            return float(np.mean(rets))

        defensive = basket_return(DEFENSIVE_SECTORS)
        cyclical = basket_return(CYCLICAL_SECTORS)
        if defensive is None or cyclical is None:
            return None

        spread = defensive - cyclical  # >0 == defensive leadership == top risk
        return _clamp01(0.5 + spread / SECTOR_ROTATION_SPREAD_FULL)

    # ------------------------------------------------------------------
    # COMPUTED axis: semiconductor cycle (SOXX MACD sign)
    # ------------------------------------------------------------------
    async def _compute_semi_cycle(self) -> Optional[float]:
        """SOXX MACD sign -> coarse [0,1] top-risk, or None on failure.

        MACD<0 (semis rolling over) == leading top signal (0.8); MACD>=0 == low
        (0.2). Any fetch/compute failure -> None (degraded), never raises.
        """
        try:
            df = await self.data_fetcher.get_ohlcv(SEMI_TICKER, days=120)
            return self._semi_cycle_from_ohlcv(df)
        except Exception as exc:  # noqa: BLE001 — degrade the axis, never raise
            logger.warning("semi_cycle axis degraded: %s", exc)
            return None

    @staticmethod
    def _semi_cycle_from_ohlcv(df: pd.DataFrame) -> Optional[float]:
        """Pure, testable core of the semi-cycle axis (no I/O)."""
        if df is None or df.empty or "close" not in df.columns:
            return None
        close = pd.to_numeric(df["close"], errors="coerce").dropna()
        # MACD(12/26/9) needs ~26+9 bars to produce a non-NaN final value.
        if len(close) < 35:
            return None
        macd_line, _signal, _hist = macd(close)
        last = macd_line.dropna()
        if last.empty:
            return None
        value = float(last.iloc[-1])
        if not np.isfinite(value):
            return None
        return SEMI_MACD_TOP if value < 0 else SEMI_MACD_OK

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    async def compute_and_persist(self, db, score: Optional[CeilingScore] = None) -> CeilingScore:
        """Compute the ceiling score (or persist a pre-computed one) into a snapshot.

        The compute step never raises. The DB write is wrapped so a persistence
        error (bad session, schema mismatch, connectivity) is logged and the
        computed score is still returned — persistence failure must NOT crash the
        caller (scheduler / endpoint).

        ``score`` lets a caller that already computed the ceiling BEFORE the scan
        (to feed it into scoring) reuse that exact score for the snapshot instead
        of computing it a SECOND time — avoiding a double network/compute round and
        guaranteeing the persisted snapshot matches what scoring actually used.
        """
        if score is None:
            score = await self.compute_ceiling_score()
        try:
            from models.market_intel import MarketIntelSnapshot

            raw = score.raw
            snapshot = MarketIntelSnapshot(
                ceiling_score=score.total,
                breakdown=_jsonable_breakdown(score),
                baa_bull_bear=score.breakdown.get("baa_bull_bear"),
                aaii_bull_pct=raw.get("aaii_bull_pct"),
                put_call_5d=raw.get("put_call_5d"),
                fear_greed_score=raw.get("fear_greed_score"),
                margin_debt_yoy=raw.get("margin_debt_yoy"),
                vix_m1_m2_spread=raw.get("vix_m1_m2_spread"),
                sector_rotation_signal=raw.get("sector_rotation_signal"),
                semi_book_to_bill=raw.get("semi_book_to_bill"),
                computed_at=score.computed_at,
            )
            db.add(snapshot)
            await db.commit()
        except Exception as exc:  # noqa: BLE001 — persistence must not crash caller
            logger.warning("compute_and_persist: snapshot write failed (%s)", exc)
            try:
                await db.rollback()
            except Exception:  # noqa: BLE001
                pass
        return score


def _jsonable_breakdown(score: CeilingScore) -> dict:
    """Serialize the CeilingScore into the JSON `breakdown` column shape.

    Stores the per-axis values, the renormalized weights, axis count and the
    degraded flag so a stored snapshot is self-describing for the endpoint.
    """
    return {
        "axes": score.breakdown,
        "weights_used": score.weights_used,
        "available_axes": score.available_axes,
        "degraded": score.degraded,
        "regime": score.regime,
    }
