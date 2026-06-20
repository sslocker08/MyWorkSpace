"""Deterministic tests for the composite Ceiling Score engine.

NO LIVE NETWORK. Every external seam is mocked:
  * ``core.market_intelligence.collect_all`` (the macro/sentiment collectors)
  * the injected ``data_fetcher`` (``get_sector_prices`` / ``get_ohlcv``)

The score arithmetic is hand-computed in each assertion so a silent change to the
weighting / renormalization surfaces as a HARD failure (conftest determinism
contract: no real network, no sleep, no wall-clock-dependent assertions).
"""
from __future__ import annotations

from datetime import datetime

import numpy as np
import pandas as pd
import pytest

import core.market_intelligence as mi
from core.market_intelligence import (
    AXIS_WEIGHTS,
    CeilingScore,
    MarketIntelligenceEngine,
    NEUTRAL,
    regime_label,
)
from core.sentiment_macro import CollectorResult


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------
def _ok(source: str, normalized, **raw) -> CollectorResult:
    return CollectorResult(
        source=source, ok=True, normalized=normalized, raw=raw, as_of=datetime(2026, 6, 1)
    )


def _degraded(source: str) -> CollectorResult:
    return CollectorResult(source=source, ok=False, error="degraded")


class _StubFetcher:
    """Injectable data fetcher returning fixed frames; configurable failures."""

    def __init__(self, sector_prices=None, soxx_df=None, fail=False):
        self._sector_prices = sector_prices
        self._soxx_df = soxx_df
        self._fail = fail

    async def get_sector_prices(self, tickers, days=365):
        if self._fail or self._sector_prices is None:
            raise RuntimeError("sector fetch failed")
        return self._sector_prices

    async def get_ohlcv(self, ticker, days=252):
        if self._fail or self._soxx_df is None:
            raise RuntimeError("ohlcv fetch failed")
        return self._soxx_df


def _flat_prices(value: float, n: int = 60) -> pd.DataFrame:
    idx = pd.date_range("2026-01-01", periods=n, freq="B")
    cols = ["XLU", "XLP", "XLV", "XLK", "XLY", "XLB"]
    return pd.DataFrame({c: np.full(n, value) for c in cols}, index=idx)


def _rotation_prices(defensive_ret: float, cyclical_ret: float, n: int = 60) -> pd.DataFrame:
    """Build sector prices whose last-21-day return equals the given values.

    Each column is flat for the first n-22 bars then steps so that
    close[-1]/close[-22] - 1 == the requested basket return.
    """
    idx = pd.date_range("2026-01-01", periods=n, freq="B")
    out = {}
    for cols, ret in ((["XLU", "XLP", "XLV"], defensive_ret), (["XLK", "XLY", "XLB"], cyclical_ret)):
        arr = np.full(n, 100.0)
        # bar -(21+1) is the base; final bar is base*(1+ret).
        arr[-1] = 100.0 * (1.0 + ret)
        for c in cols:
            out[c] = arr.copy()
    return pd.DataFrame(out, index=idx)


def _soxx(macd_negative: bool, n: int = 80) -> pd.DataFrame:
    """SOXX OHLCV whose final MACD(12/26/9) sign is controllable.

    Steady downtrend -> MACD line negative; steady uptrend -> positive.
    """
    idx = pd.date_range("2026-01-01", periods=n, freq="B")
    rate = -0.01 if macd_negative else 0.01
    close = 100.0 * np.cumprod(1.0 + np.full(n, rate))
    return pd.DataFrame(
        {"open": close, "high": close * 1.001, "low": close * 0.999, "close": close, "volume": np.full(n, 1e6)},
        index=idx,
    )


def _all_ok_collected() -> dict:
    """Every collector OK with KNOWN normalized values for hand-computation."""
    return {
        "aaii_sentiment": _ok("aaii_sentiment", 0.80, bull_pct=55.0),
        "put_call": _ok("put_call", 0.60, put_call_5d=0.72),
        "fear_greed": _ok("fear_greed", 0.40, score=70.0),
        "margin_debt": _ok("margin_debt", 0.90, margin_debt_yoy=0.45),
        "yield_curve": _ok("yield_curve", None, t10y2y=0.2),
        "vix": _ok("vix", None, vix=12.0),  # very low -> complacency proxy ~1.0
    }


def _patch_collect(monkeypatch, collected: dict):
    async def fake_collect_all(collector=None):
        return collected
    monkeypatch.setattr(mi, "collect_all", fake_collect_all)


# ---------------------------------------------------------------------------
# 1. All axes available -> correct weighted 0-100 score
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_all_axes_available_weighted_score(monkeypatch):
    _patch_collect(monkeypatch, _all_ok_collected())
    # defensive +5%, cyclical -1% -> spread +6% -> sector_rotation ~= 1.0
    sector_prices = _rotation_prices(defensive_ret=0.05, cyclical_ret=-0.01)
    soxx = _soxx(macd_negative=True)  # -> semi_cycle = 0.8
    engine = MarketIntelligenceEngine(
        data_fetcher=_StubFetcher(sector_prices=sector_prices, soxx_df=soxx),
        baa_bull_bear_override=0.95,
    )
    score = await engine.compute_ceiling_score()

    # baa supplied via override; the two remaining placeholders (breadth,
    # valuation) have NO live feed -> None -> dropped from renormalization. So 8
    # axes are available; recompute the weighted average over exactly those.
    # Resolve the computed axes from the actual result (their exact mapped values
    # are validated in dedicated tests); plug them into the hand-computation.
    vals = {
        "baa_bull_bear": 0.95,
        "aaii_sentiment": 0.80,
        "put_call_ratio": 0.60,
        "fear_greed": 0.40,
        "margin_debt": 0.90,
        "vix_term_structure": score.breakdown["vix_term_structure"],
        "sector_rotation": score.breakdown["sector_rotation"],
        "semi_cycle": score.breakdown["semi_cycle"],
    }
    # 8 axes available (the 2 unfed placeholders dropped); above the floor.
    assert score.available_axes == 8
    assert score.degraded is False
    assert score.breakdown["breadth_deterioration"] is None
    assert score.breakdown["valuation_composite"] is None
    for axis, v in vals.items():
        assert v is not None, f"{axis} unexpectedly None"
    # Renormalize the available axes' weights to sum to 1, then weighted-average.
    wsum = sum(AXIS_WEIGHTS[a] for a in vals)
    expected = sum(vals[a] * (AXIS_WEIGHTS[a] / wsum) for a in vals) * 100.0
    assert score.total == pytest.approx(round(expected, 2), abs=1e-9)
    assert np.isfinite(score.total)
    # sanity: known computed axis values
    assert score.breakdown["semi_cycle"] == 0.8
    assert score.breakdown["sector_rotation"] == pytest.approx(1.0, abs=1e-6)
    assert score.breakdown["vix_term_structure"] == pytest.approx(1.0, abs=1e-6)


# ---------------------------------------------------------------------------
# 2. Weight renormalization when some axes are None
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_weight_renormalization_partial(monkeypatch):
    # Only aaii, margin_debt OK; everything else degraded. Computed axes fail too.
    collected = {
        "aaii_sentiment": _ok("aaii_sentiment", 0.80, bull_pct=55.0),
        "put_call": _degraded("put_call"),
        "fear_greed": _degraded("fear_greed"),
        "margin_debt": _ok("margin_debt", 0.60, margin_debt_yoy=0.30),
        "yield_curve": _degraded("yield_curve"),
        "vix": _degraded("vix"),  # -> vix axis None
    }
    _patch_collect(monkeypatch, collected)
    # baa via override so we have a 3rd available axis but still below the
    # MIN_RELIABLE_AXES floor of 4 -> exercises renormalization AND the degraded
    # flag together.
    engine = MarketIntelligenceEngine(
        data_fetcher=_StubFetcher(fail=True),  # sector + semi -> None
        baa_bull_bear_override=0.50,  # baa -> 0.5 (only available because injected)
    )
    score = await engine.compute_ceiling_score()

    # Available: baa(0.5,w.15), aaii(0.8,w.10), margin_debt(0.6,w.10). The two
    # unfed placeholders (breadth, valuation) are now None -> dropped. Others None.
    avail = {
        "baa_bull_bear": (0.5, 0.15),
        "aaii_sentiment": (0.8, 0.10),
        "margin_debt": (0.6, 0.10),
    }
    assert score.available_axes == len(avail)
    assert score.degraded is True  # 3 < MIN_RELIABLE_AXES (4)
    assert score.breakdown["breadth_deterioration"] is None
    assert score.breakdown["valuation_composite"] is None
    assert score.breakdown["put_call_ratio"] is None
    assert score.breakdown["sector_rotation"] is None
    assert score.breakdown["semi_cycle"] is None
    assert score.breakdown["vix_term_structure"] is None

    wsum = sum(w for _, w in avail.values())
    expected = sum(v * (w / wsum) for v, w in avail.values()) * 100.0
    assert score.total == pytest.approx(round(expected, 2), abs=1e-9)
    assert np.isfinite(score.total)


# ---------------------------------------------------------------------------
# 3. All degraded -> degraded=True, neutral 50, no raise
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_all_degraded_neutral_50(monkeypatch):
    # Every source is down: collect_all blows up (so all collector axes None),
    # the computed axes' fetcher fails (sector + semi None), and no baa override
    # is supplied (baa None). The placeholder axes are now None (not 0.5), so this
    # genuinely reaches available_axes == 0 -> the neutral-50 all-degraded path.
    async def boom(collector=None):
        raise RuntimeError("collectors exploded")
    monkeypatch.setattr(mi, "collect_all", boom)

    engine = MarketIntelligenceEngine(
        data_fetcher=_StubFetcher(fail=True), baa_bull_bear_override=None
    )
    score = await engine.compute_ceiling_score()

    assert isinstance(score, CeilingScore)
    assert score.available_axes == 0
    assert score.total == 50.0
    assert score.degraded is True
    assert score.weights_used == {}
    assert np.isfinite(score.total)
    # every axis is genuinely unavailable
    assert all(v is None for v in score.breakdown.values())


@pytest.mark.asyncio
async def test_empty_available_fallback():
    """Directly exercise the no-axis fallback path of _assemble."""
    engine = MarketIntelligenceEngine(data_fetcher=_StubFetcher(fail=True))
    breakdown = {axis: None for axis in AXIS_WEIGHTS}
    score = engine._assemble(breakdown, raw={})
    assert score.total == 50.0
    assert score.available_axes == 0
    assert score.degraded is True
    assert score.weights_used == {}
    assert np.isfinite(score.total)


# ---------------------------------------------------------------------------
# 3b. No dilution at a genuine top: 7 live axes all at 0.80 -> total 80.0
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_no_dilution_at_genuine_top(monkeypatch):
    """Regression for the placeholder-dilution defect.

    With all 7 LIVE axes (aaii, put_call, fear_greed, margin_debt,
    vix_term_structure, sector_rotation, semi_cycle) reading a genuine-top 0.80
    and the 3 placeholder axes (baa, breadth, valuation) unavailable, the score
    must be 80.0 — NOT the old ~68.9 produced when 0.37 of weight was pinned at a
    neutral 0.5.
    """
    collected = {
        "aaii_sentiment": _ok("aaii_sentiment", 0.80, bull_pct=55.0),
        "put_call": _ok("put_call", 0.80, put_call_5d=0.60),
        "fear_greed": _ok("fear_greed", 0.80, score=80.0),
        "margin_debt": _ok("margin_debt", 0.80, margin_debt_yoy=0.40),
        "vix": _ok("vix", None, vix=15.0),  # set below so the proxy reads 0.80
        "yield_curve": _ok("yield_curve", None, t10y2y=0.2),
    }
    _patch_collect(monkeypatch, collected)

    engine = MarketIntelligenceEngine(
        data_fetcher=_StubFetcher(),  # frames injected via monkeypatch below
        baa_bull_bear_override=None,  # baa unavailable
    )

    # Pin the three computed/proxy axes to exactly 0.80 so all 7 live axes match.
    async def _sector(self):
        return 0.80
    async def _semi(self):
        return 0.80
    monkeypatch.setattr(
        mi.MarketIntelligenceEngine, "_compute_sector_rotation", _sector
    )
    monkeypatch.setattr(mi.MarketIntelligenceEngine, "_compute_semi_cycle", _semi)
    monkeypatch.setattr(
        mi.MarketIntelligenceEngine,
        "_vix_term_structure",
        lambda self, vix_result: (0.80, None),
    )

    score = await engine.compute_ceiling_score()

    assert score.available_axes == 7
    assert score.breakdown["baa_bull_bear"] is None
    assert score.breakdown["breadth_deterioration"] is None
    assert score.breakdown["valuation_composite"] is None
    # The fix: no placeholder dilution -> a genuine top reads 80.0, not ~68.9.
    assert score.total == 80.0
    assert score.total != pytest.approx(68.9, abs=0.5)
    assert score.degraded is False  # 7 >= MIN_RELIABLE_AXES
    assert score.regime == "天井圏"  # >70 top-zone (was mis-banded as 警戒)


# ---------------------------------------------------------------------------
# 3c. Minimum-axes reliability floor
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_min_axes_floor(monkeypatch):
    """3 available axes -> degraded True; >=4 -> degraded False."""
    base = {
        "aaii_sentiment": _ok("aaii_sentiment", 0.50, bull_pct=40.0),
        "put_call": _ok("put_call", 0.50, put_call_5d=0.90),
        "margin_debt": _ok("margin_debt", 0.50, margin_debt_yoy=0.10),
        "fear_greed": _degraded("fear_greed"),
        "vix": _degraded("vix"),
        "yield_curve": _degraded("yield_curve"),
    }

    # 3 axes available -> below floor -> degraded.
    _patch_collect(monkeypatch, base)
    engine3 = MarketIntelligenceEngine(
        data_fetcher=_StubFetcher(fail=True), baa_bull_bear_override=None
    )
    score3 = await engine3.compute_ceiling_score()
    assert score3.available_axes == 3
    assert score3.degraded is True

    # Add a 4th axis (baa via override) -> at the floor -> NOT degraded.
    engine4 = MarketIntelligenceEngine(
        data_fetcher=_StubFetcher(fail=True), baa_bull_bear_override=0.50
    )
    score4 = await engine4.compute_ceiling_score()
    assert score4.available_axes == 4
    assert score4.degraded is False
    # all four available axes read 0.50 -> total is exactly neutral 50.0
    assert score4.total == pytest.approx(50.0, abs=1e-9)


# ---------------------------------------------------------------------------
# 4. sector_rotation computation (defensive vs cyclical)
# ---------------------------------------------------------------------------
def test_sector_rotation_defensive_leadership_high():
    prices = _rotation_prices(defensive_ret=0.05, cyclical_ret=-0.02)  # spread +7%
    val = MarketIntelligenceEngine._sector_rotation_from_prices(prices)
    assert val is not None
    assert val > 0.5  # defensive outperforming -> top signal -> high


def test_sector_rotation_cyclical_leadership_low():
    prices = _rotation_prices(defensive_ret=-0.02, cyclical_ret=0.05)  # spread -7%
    val = MarketIntelligenceEngine._sector_rotation_from_prices(prices)
    assert val is not None
    assert val < 0.5  # cyclicals leading -> risk-on -> low


def test_sector_rotation_neutral_when_flat():
    prices = _rotation_prices(defensive_ret=0.0, cyclical_ret=0.0)
    val = MarketIntelligenceEngine._sector_rotation_from_prices(prices)
    assert val == pytest.approx(0.5, abs=1e-9)


def test_sector_rotation_empty_returns_none():
    assert MarketIntelligenceEngine._sector_rotation_from_prices(pd.DataFrame()) is None


# ---------------------------------------------------------------------------
# 5. semi_cycle (SOXX MACD sign)
# ---------------------------------------------------------------------------
def test_semi_cycle_macd_negative_elevated():
    val = MarketIntelligenceEngine._semi_cycle_from_ohlcv(_soxx(macd_negative=True))
    assert val == 0.8


def test_semi_cycle_macd_positive_low():
    val = MarketIntelligenceEngine._semi_cycle_from_ohlcv(_soxx(macd_negative=False))
    assert val == 0.2


def test_semi_cycle_short_series_none():
    short = _soxx(macd_negative=True, n=20)
    assert MarketIntelligenceEngine._semi_cycle_from_ohlcv(short) is None


# ---------------------------------------------------------------------------
# 6. compute_and_persist writes a snapshot
# ---------------------------------------------------------------------------
class _FakeSession:
    def __init__(self, fail_commit=False):
        self.added = []
        self.committed = False
        self.rolled_back = False
        self._fail_commit = fail_commit

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        if self._fail_commit:
            raise RuntimeError("commit failed")
        self.committed = True

    async def rollback(self):
        self.rolled_back = True


@pytest.mark.asyncio
async def test_compute_and_persist_writes_snapshot(monkeypatch):
    _patch_collect(monkeypatch, _all_ok_collected())
    sector_prices = _rotation_prices(0.05, -0.01)
    engine = MarketIntelligenceEngine(
        data_fetcher=_StubFetcher(sector_prices=sector_prices, soxx_df=_soxx(True)),
        baa_bull_bear_override=0.9,
    )
    session = _FakeSession()
    score = await engine.compute_and_persist(session)
    assert session.committed is True
    assert len(session.added) == 1
    snap = session.added[0]
    assert snap.ceiling_score == score.total
    assert isinstance(snap.breakdown, dict)
    assert snap.aaii_bull_pct == 55.0
    assert snap.margin_debt_yoy == 0.45


@pytest.mark.asyncio
async def test_compute_and_persist_db_error_does_not_raise(monkeypatch):
    _patch_collect(monkeypatch, _all_ok_collected())
    engine = MarketIntelligenceEngine(
        data_fetcher=_StubFetcher(sector_prices=_rotation_prices(0.05, -0.01), soxx_df=_soxx(True)),
    )
    session = _FakeSession(fail_commit=True)
    # Must NOT raise even though commit() blows up.
    score = await engine.compute_and_persist(session)
    assert isinstance(score, CeilingScore)
    assert session.rolled_back is True


# ---------------------------------------------------------------------------
# 7. regime label helper
# ---------------------------------------------------------------------------
def test_regime_label_bands():
    assert regime_label(85.0) == "天井圏"
    assert regime_label(71.0) == "天井圏"
    assert regime_label(70.0) == "警戒"
    assert regime_label(55.0) == "警戒"
    assert regime_label(40.0) == "警戒"
    assert regime_label(39.0) == "安全"
    assert regime_label(10.0) == "安全"


# ---------------------------------------------------------------------------
# 8. endpoint fallback chain (live fail -> snapshot -> labelled default)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_endpoint_live_success(monkeypatch):
    import routes.market_intel as route
    route._ceiling_cache = None
    route._ceiling_cache_at = None

    class _FakeScore:
        total = 64.0
        regime = "警戒"
        breakdown = {"aaii_sentiment": 0.5}
        weights_used = {"aaii_sentiment": 1.0}
        available_axes = 1
        degraded = True
        computed_at = datetime(2026, 6, 1)

    async def fake_compute(self):
        return _FakeScore()
    monkeypatch.setattr(route.MarketIntelligenceEngine, "compute_ceiling_score", fake_compute)

    out = await route.get_ceiling_score(db=None)
    assert out["source"] == "live"
    assert out["ceiling_score"] == 64.0
    assert out["regime"] == "警戒"


@pytest.mark.asyncio
async def test_endpoint_falls_back_to_snapshot(monkeypatch):
    import routes.market_intel as route
    route._ceiling_cache = None
    route._ceiling_cache_at = None

    async def boom(self):
        raise RuntimeError("live failed")
    monkeypatch.setattr(route.MarketIntelligenceEngine, "compute_ceiling_score", boom)

    class _Snap:
        ceiling_score = 58.0
        breakdown = {"available_axes": 7, "degraded": True, "axes": {}}
        computed_at = datetime(2026, 6, 1)

    class _Result:
        def scalar_one_or_none(self):
            return _Snap()

    class _DB:
        async def execute(self, *a, **k):
            return _Result()

    out = await route.get_ceiling_score(db=_DB())
    assert out["source"] == "db_snapshot"
    assert out["ceiling_score"] == 58.0
    assert out["available_axes"] == 7


@pytest.mark.asyncio
async def test_endpoint_falls_back_to_static(monkeypatch):
    import routes.market_intel as route
    route._ceiling_cache = None
    route._ceiling_cache_at = None

    async def boom(self):
        raise RuntimeError("live failed")
    monkeypatch.setattr(route.MarketIntelligenceEngine, "compute_ceiling_score", boom)

    class _Result:
        def scalar_one_or_none(self):
            return None

    class _DB:
        async def execute(self, *a, **k):
            return _Result()

    out = await route.get_ceiling_score(db=_DB())
    assert out["source"] == "static_reference_fallback"
    assert out["degraded"] is True
    assert "warning" in out
    assert out["ceiling_score"] == 72.0


@pytest.mark.asyncio
async def test_endpoint_db_error_falls_back_to_static(monkeypatch):
    import routes.market_intel as route
    route._ceiling_cache = None
    route._ceiling_cache_at = None

    async def boom(self):
        raise RuntimeError("live failed")
    monkeypatch.setattr(route.MarketIntelligenceEngine, "compute_ceiling_score", boom)

    class _DB:
        async def execute(self, *a, **k):
            raise RuntimeError("db down")

    out = await route.get_ceiling_score(db=_DB())
    assert out["source"] == "static_reference_fallback"
