"""Deterministic tests for the macro / sentiment collectors.

NO LIVE NETWORK. Per the spec we mock every network seam:
  * ``pd.read_excel``      (AAII .xls)
  * ``pd.read_csv``        (CBOE equity put/call)
  * ``fear_greed.get``     (CNN Fear & Greed)
  * the ``fredapi.Fred`` client (margin debt / yield curve / VIX)

The optional deps ``fredapi``, ``fear_greed`` and ``xlrd`` are NOT guaranteed to
be installed in the test runtime (and indeed are absent here), so we inject light
stub modules into ``sys.modules`` BEFORE the collector imports them. This keeps
the tests hermetic and version-independent (conftest determinism contract: no
real network, no sleep, no wall-clock-dependent assertions).

Each test asserts EITHER a correct+bounded normalized value for a known input, OR
graceful degradation (ok=False, never raises) when a seam fails.
"""
from __future__ import annotations

import builtins
import sys
import types
from datetime import datetime

import numpy as np
import pandas as pd
import pytest

import core.sentiment_macro as sm
from core.sentiment_macro import (
    MacroSentimentCollector,
    CollectorResult,
    collect_all,
    _normalize_aaii_bull,
    _normalize_put_call,
    _normalize_fear_greed,
    _normalize_margin_yoy,
)


# ---------------------------------------------------------------------------
# Stub the optional modules so the guarded imports inside the collector succeed.
# Individual tests monkeypatch the relevant callable on these stubs.
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def _stub_optional_modules(monkeypatch):
    # xlrd: the collector only does `import xlrd` to confirm the engine exists.
    if "xlrd" not in sys.modules:
        monkeypatch.setitem(sys.modules, "xlrd", types.ModuleType("xlrd"))

    # fear_greed: provide a module with a patchable .get().
    fg = sys.modules.get("fear_greed")
    if fg is None:
        fg = types.ModuleType("fear_greed")
        fg.get = lambda: types.SimpleNamespace(score=50)  # neutral default
        monkeypatch.setitem(sys.modules, "fear_greed", fg)

    # fredapi: provide a module with a patchable Fred class.
    fa = sys.modules.get("fredapi")
    if fa is None:
        fa = types.ModuleType("fredapi")

        class _Fred:  # default no-op; tests patch get_series via _FakeFred below
            def __init__(self, *a, **k):
                pass

            def get_series(self, series_id):  # pragma: no cover - overridden
                raise RuntimeError("not configured")

        fa.Fred = _Fred
        monkeypatch.setitem(sys.modules, "fredapi", fa)

    # The collector reads settings.fred_api_key; give it a value so the FRED path
    # is exercised. Individual degradation tests blank it explicitly.
    monkeypatch.setattr(sm.settings, "fred_api_key", "test-key", raising=False)
    yield


def _fresh() -> MacroSentimentCollector:
    """A collector with an isolated (empty) cache."""
    return MacroSentimentCollector()


# ===========================================================================
# Pure normalization math — correctness + bounds for known inputs
# ===========================================================================
def test_normalize_aaii_bounds_and_values():
    assert _normalize_aaii_bull(60) == pytest.approx(1.0)   # 60 -> (60-35)/25 = 1.0
    assert _normalize_aaii_bull(25) == pytest.approx(0.0)   # below mean -> 0
    assert _normalize_aaii_bull(35) == pytest.approx(0.0)   # at mean -> 0
    assert _normalize_aaii_bull(47.5) == pytest.approx(0.5)
    # bounded even on out-of-range input
    assert 0.0 <= _normalize_aaii_bull(120) <= 1.0
    assert _normalize_aaii_bull(120) == 1.0


def test_normalize_put_call_inverted_and_bounded():
    assert _normalize_put_call(0.55) == pytest.approx(1.0)  # complacency -> ~1.0
    assert _normalize_put_call(0.60) == pytest.approx(1.0)
    assert _normalize_put_call(0.90) == pytest.approx(0.0)  # fear -> 0
    assert _normalize_put_call(0.75) == pytest.approx(0.5)
    assert 0.0 <= _normalize_put_call(1.5) <= 1.0


def test_normalize_fear_greed_bounds():
    assert _normalize_fear_greed(80) == pytest.approx(0.6)   # greed -> high
    assert _normalize_fear_greed(80) > 0.5
    assert _normalize_fear_greed(50) == pytest.approx(0.0)
    assert _normalize_fear_greed(100) == pytest.approx(1.0)
    assert 0.0 <= _normalize_fear_greed(0) <= 1.0


def test_normalize_margin_yoy_bounds():
    assert _normalize_margin_yoy(0.45) == pytest.approx(0.9)  # +45% -> 0.9
    assert _normalize_margin_yoy(0.50) == pytest.approx(1.0)
    assert _normalize_margin_yoy(0.0) == pytest.approx(0.0)
    assert 0.0 <= _normalize_margin_yoy(2.0) <= 1.0


# ===========================================================================
# AAII collector
# ===========================================================================
def _aaii_frame(bull_values, dates=None):
    n = len(bull_values)
    data = {"Bullish": bull_values, "Bull-Bear Spread": [0.0] * n}
    if dates is not None:
        data["Date"] = dates
    return pd.DataFrame(data)


@pytest.mark.asyncio
async def test_aaii_happy_path(monkeypatch):
    frame = _aaii_frame([0.40, 0.50, 0.60])  # fractional; latest 0.60 -> 60%
    calls = {"n": 0}

    def fake_read_excel(*a, **k):
        calls["n"] += 1
        return frame

    monkeypatch.setattr(sm.pd, "read_excel", fake_read_excel)
    c = _fresh()
    res = await c.get_aaii_sentiment()
    assert res.ok is True
    assert res.raw["bull_pct"] == pytest.approx(60.0)
    assert res.normalized == pytest.approx(1.0)
    assert 0.0 <= res.normalized <= 1.0
    assert calls["n"] == 1


@pytest.mark.asyncio
async def test_aaii_low_bull(monkeypatch):
    monkeypatch.setattr(sm.pd, "read_excel", lambda *a, **k: _aaii_frame([0.25]))
    res = await _fresh().get_aaii_sentiment()
    assert res.ok is True
    assert res.normalized == pytest.approx(0.0)


@pytest.mark.asyncio
async def test_aaii_degrades_on_raise(monkeypatch):
    def boom(*a, **k):
        raise IOError("network down")

    monkeypatch.setattr(sm.pd, "read_excel", boom)
    res = await _fresh().get_aaii_sentiment()
    assert res.ok is False
    assert res.normalized is None
    assert res.error  # populated


@pytest.mark.asyncio
async def test_aaii_degrades_without_xlrd(monkeypatch):
    # Simulate xlrd not installed: removing it makes the guarded import fail.
    monkeypatch.delitem(sys.modules, "xlrd", raising=False)
    monkeypatch.setattr(builtins, "__import__", _import_raiser("xlrd"))
    res = await _fresh().get_aaii_sentiment()
    assert res.ok is False
    assert res.normalized is None


def _import_raiser(blocked: str):
    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == blocked:
            raise ImportError(f"No module named {blocked!r}")
        return real_import(name, *args, **kwargs)

    return fake_import


# ===========================================================================
# CBOE Put/Call collector
# ===========================================================================
def _pc_frame(ratios, col="P/C Ratio"):
    idx = pd.to_datetime([f"2026-06-{10+i:02d}" for i in range(len(ratios))])
    idx.name = "DATE"
    return pd.DataFrame({col: ratios}, index=idx)


@pytest.mark.asyncio
async def test_put_call_happy_path_complacency(monkeypatch):
    # 5-day mean = 0.55 -> complacency -> normalized ~1.0
    frame = _pc_frame([0.55, 0.55, 0.55, 0.55, 0.55])
    monkeypatch.setattr(sm.pd, "read_csv", lambda *a, **k: frame)
    res = await _fresh().get_put_call()
    assert res.ok is True
    assert res.raw["put_call_5d"] == pytest.approx(0.55)
    assert res.normalized == pytest.approx(1.0)


@pytest.mark.asyncio
async def test_put_call_robust_column_name(monkeypatch):
    # Different header capitalization / wording -> still found via "ratio" match.
    frame = _pc_frame([0.90, 0.90, 0.90, 0.90, 0.90], col="Equity Put/Call RATIO")
    monkeypatch.setattr(sm.pd, "read_csv", lambda *a, **k: frame)
    res = await _fresh().get_put_call()
    assert res.ok is True
    assert res.normalized == pytest.approx(0.0)  # fear -> 0


@pytest.mark.asyncio
async def test_put_call_5d_mean_uses_last_five(monkeypatch):
    # 7 rows; last 5 are [0.6,0.7,0.8,0.75,0.65] mean=0.70
    frame = _pc_frame([0.55, 0.50, 0.60, 0.70, 0.80, 0.75, 0.65])
    monkeypatch.setattr(sm.pd, "read_csv", lambda *a, **k: frame)
    res = await _fresh().get_put_call()
    assert res.raw["put_call_5d"] == pytest.approx(0.70)


@pytest.mark.asyncio
async def test_put_call_degrades_on_raise(monkeypatch):
    monkeypatch.setattr(sm.pd, "read_csv", _raise(ValueError("bad csv")))
    res = await _fresh().get_put_call()
    assert res.ok is False and res.normalized is None


# ===========================================================================
# CNN Fear & Greed collector
# ===========================================================================
@pytest.mark.asyncio
async def test_fear_greed_happy_path(monkeypatch):
    monkeypatch.setattr(
        sys.modules["fear_greed"], "get",
        lambda: types.SimpleNamespace(score=80),
    )
    res = await _fresh().get_fear_greed()
    assert res.ok is True
    assert res.raw["score"] == 80
    assert res.normalized == pytest.approx(0.6)
    assert res.normalized > 0.5


@pytest.mark.asyncio
async def test_fear_greed_dict_shape(monkeypatch):
    monkeypatch.setattr(sys.modules["fear_greed"], "get", lambda: {"score": 90})
    res = await _fresh().get_fear_greed()
    assert res.ok is True
    assert res.normalized == pytest.approx(0.8)


@pytest.mark.asyncio
async def test_fear_greed_degrades_on_raise(monkeypatch):
    monkeypatch.setattr(sys.modules["fear_greed"], "get", _raise(RuntimeError("endpoint 503")))
    res = await _fresh().get_fear_greed()
    assert res.ok is False and res.normalized is None


@pytest.mark.asyncio
async def test_fear_greed_degrades_without_package(monkeypatch):
    monkeypatch.delitem(sys.modules, "fear_greed", raising=False)
    monkeypatch.setattr(builtins, "__import__", _import_raiser("fear_greed"))
    res = await _fresh().get_fear_greed()
    assert res.ok is False and res.normalized is None


# ===========================================================================
# FRED margin debt / yield curve / VIX
# ===========================================================================
class _FakeFred:
    """Stand-in for fredapi.Fred returning a configured series per id."""

    def __init__(self, series_map):
        self._map = series_map
        self.calls = 0

    def __call__(self, *a, **k):  # so it can replace the class constructor
        return self

    def get_series(self, series_id):
        self.calls += 1
        s = self._map.get(series_id)
        if s is None:
            raise ValueError(f"no series {series_id}")
        return s


def _quarterly_series(values):
    idx = pd.date_range("2023-01-01", periods=len(values), freq="QS")
    return pd.Series(values, index=idx)


@pytest.mark.asyncio
async def test_margin_debt_yoy_happy_path(monkeypatch):
    # 5 quarters; latest=145, value ~1y prior (4 quarters back)=100 -> YoY=0.45
    series = _quarterly_series([100.0, 110.0, 120.0, 130.0, 145.0])
    fake = _FakeFred({sm.FRED_MARGIN_DEBT: series})
    monkeypatch.setattr(sys.modules["fredapi"], "Fred", fake)
    res = await _fresh().get_margin_debt()
    assert res.ok is True
    assert res.raw["margin_debt_yoy"] == pytest.approx(0.45)
    assert res.normalized == pytest.approx(0.9)


@pytest.mark.asyncio
async def test_margin_debt_degrades_without_key(monkeypatch):
    monkeypatch.setattr(sm.settings, "fred_api_key", "", raising=False)
    series = _quarterly_series([100.0, 145.0, 145.0, 145.0, 145.0])
    monkeypatch.setattr(sys.modules["fredapi"], "Fred", _FakeFred({sm.FRED_MARGIN_DEBT: series}))
    res = await _fresh().get_margin_debt()
    assert res.ok is False
    assert res.normalized is None
    assert "FRED_API_KEY" in (res.error or "")


@pytest.mark.asyncio
async def test_margin_debt_degrades_on_raise(monkeypatch):
    monkeypatch.setattr(sys.modules["fredapi"], "Fred", _FakeFred({}))  # series absent -> raises
    res = await _fresh().get_margin_debt()
    assert res.ok is False and res.normalized is None


@pytest.mark.asyncio
async def test_yield_curve_and_vix_raw_only(monkeypatch):
    yc = pd.Series([0.5, 0.2, -0.1], index=pd.date_range("2026-06-01", periods=3, freq="D"))
    vix = pd.Series([14.0, 15.0, 18.5], index=pd.date_range("2026-06-01", periods=3, freq="D"))
    fake = _FakeFred({sm.FRED_T10Y2Y: yc, sm.FRED_VIXCLS: vix})
    monkeypatch.setattr(sys.modules["fredapi"], "Fred", fake)
    c = _fresh()
    yres = await c.get_yield_curve()
    vres = await c.get_vix()
    assert yres.ok is True and yres.raw["t10y2y"] == pytest.approx(-0.1)
    assert yres.normalized is None  # raw-only contribution deferred
    assert vres.ok is True and vres.raw["vix"] == pytest.approx(18.5)
    assert vres.normalized is None


# ===========================================================================
# collect_all — every source present even when some fail
# ===========================================================================
@pytest.mark.asyncio
async def test_collect_all_returns_every_source_with_mixed_health(monkeypatch):
    # AAII ok, put/call ok, fear&greed RAISES, FRED series for margin missing
    monkeypatch.setattr(sm.pd, "read_excel", lambda *a, **k: _aaii_frame([0.60]))
    monkeypatch.setattr(sm.pd, "read_csv", lambda *a, **k: _pc_frame([0.55] * 5))
    monkeypatch.setattr(sys.modules["fear_greed"], "get", _raise(RuntimeError("down")))
    # FRED: provide yield curve + vix but NOT margin debt -> margin degrades.
    yc = pd.Series([0.1], index=pd.date_range("2026-06-01", periods=1, freq="D"))
    vix = pd.Series([20.0], index=pd.date_range("2026-06-01", periods=1, freq="D"))
    monkeypatch.setattr(
        sys.modules["fredapi"], "Fred",
        _FakeFred({sm.FRED_T10Y2Y: yc, sm.FRED_VIXCLS: vix}),
    )
    out = await collect_all(_fresh())
    expected = {"aaii_sentiment", "put_call", "fear_greed", "margin_debt", "yield_curve", "vix"}
    assert set(out.keys()) == expected
    assert all(isinstance(r, CollectorResult) for r in out.values())
    assert out["aaii_sentiment"].ok is True
    assert out["put_call"].ok is True
    assert out["fear_greed"].ok is False  # degraded, not raised
    assert out["margin_debt"].ok is False
    assert out["yield_curve"].ok is True
    assert out["vix"].ok is True


@pytest.mark.asyncio
async def test_collect_all_never_raises_when_everything_down(monkeypatch):
    monkeypatch.setattr(sm.pd, "read_excel", _raise(IOError("down")))
    monkeypatch.setattr(sm.pd, "read_csv", _raise(IOError("down")))
    monkeypatch.setattr(sys.modules["fear_greed"], "get", _raise(IOError("down")))
    monkeypatch.setattr(sys.modules["fredapi"], "Fred", _FakeFred({}))
    out = await collect_all(_fresh())
    assert len(out) == 6
    assert all(r.ok is False for r in out.values())
    assert all(r.normalized is None for r in out.values())


# ===========================================================================
# Caching — second call within TTL does not re-invoke the fetch
# ===========================================================================
@pytest.mark.asyncio
async def test_cache_avoids_second_fetch(monkeypatch):
    calls = {"n": 0}

    def counting(*a, **k):
        calls["n"] += 1
        return _aaii_frame([0.60])

    monkeypatch.setattr(sm.pd, "read_excel", counting)
    c = _fresh()
    r1 = await c.get_aaii_sentiment()
    r2 = await c.get_aaii_sentiment()
    assert r1.ok and r2.ok
    assert calls["n"] == 1  # second call served from cache
    assert r2.normalized == r1.normalized


@pytest.mark.asyncio
async def test_failed_fetch_is_not_cached(monkeypatch):
    # A degraded result must NOT pin the cache; the next call retries the source.
    state = {"fail": True, "calls": 0}

    def flaky(*a, **k):
        state["calls"] += 1
        if state["fail"]:
            raise IOError("transient")
        return _aaii_frame([0.60])

    monkeypatch.setattr(sm.pd, "read_excel", flaky)
    c = _fresh()
    r1 = await c.get_aaii_sentiment()
    assert r1.ok is False
    state["fail"] = False
    r2 = await c.get_aaii_sentiment()
    assert r2.ok is True  # retried, not served stale-degraded from cache
    assert state["calls"] == 2


@pytest.mark.asyncio
async def test_cache_ttl_expiry_triggers_refetch(monkeypatch):
    calls = {"n": 0}

    def counting(*a, **k):
        calls["n"] += 1
        return _aaii_frame([0.60])

    monkeypatch.setattr(sm.pd, "read_excel", counting)
    c = _fresh()
    await c.get_aaii_sentiment()
    assert calls["n"] == 1
    # Force the cached entry to look expired by rewinding its stored timestamp.
    result, _ts = c._cache["aaii_sentiment"]
    c._cache["aaii_sentiment"] = (result, datetime(2000, 1, 1))
    await c.get_aaii_sentiment()
    assert calls["n"] == 2  # TTL expired -> refetched


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _raise(exc):
    def _f(*a, **k):
        raise exc
    return _f
