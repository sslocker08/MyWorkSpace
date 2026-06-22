"""OHLCV route tests — the candle/volume shape contract the frontend depends on.

These prove the invariants web/components/chart/CandleChart.tsx relies on:
  * a known ticker returns {ticker, candles[], volume[]} with ascending,
    unique, integer unix-second `time` values and numeric OHLC,
  * an unknown ticker (allowlist miss) is rejected 404 — untrusted symbols
    never reach the fetcher (web-security),
  * an upstream fetch failure degrades to 503 (never an opaque 500),
  * empty upstream data degrades to 503,
  * NaN/partial bars are dropped rather than emitted as malformed candles.

We call the async route handler directly (like tests/test_event_bus.py drives
the SSE generator directly) so the suite needs no httpx/TestClient — it isn't
installed in this engine env. The DataFetcher is mocked via the shared singleton
(core.signal_engine._fetcher) that routes.ohlcv imports, so nothing hits the
network.
"""
import numpy as np
import pandas as pd
import pytest
from fastapi import HTTPException

# routes.ohlcv transitively imports core.data_fetcher -> pandas_datareader.
# Some environments ship a pandas_datareader build that is incompatible with the
# installed pandas (its module-level @deprecate_kwarg raises a TypeError on
# import). That is an environment/dependency issue, not a defect in the route, so
# skip this whole module cleanly rather than aborting the suite with a collection
# error. We catch broadly because the failure is a TypeError, not an ImportError,
# so pytest.importorskip alone would not suppress it.
try:
    import routes.ohlcv as ohlcv_route
    get_ohlcv = ohlcv_route.get_ohlcv
except Exception as _e:  # noqa: BLE001 - any import-chain failure -> skip module
    pytest.skip(
        f"routes.ohlcv import chain unavailable in this env: {_e}",
        allow_module_level=True,
    )


def _make_df(n: int = 5) -> pd.DataFrame:
    idx = pd.date_range("2024-01-01", periods=n, freq="B")
    close = 100.0 + np.arange(n, dtype=float)
    return pd.DataFrame(
        {
            "open": close - 0.5,
            "high": close + 1.0,
            "low": close - 1.0,
            "close": close,
            "volume": np.full(n, 1_000_000.0),
        },
        index=idx,
    )


@pytest.fixture
def known_ticker() -> str:
    # Pull a real symbol from the allowlist the route built at import time so
    # the test stays in sync with the universe (SPY is a stable benchmark).
    assert "SPY" in ohlcv_route._ALLOWED_TICKERS
    return "SPY"


async def test_known_ticker_returns_candle_shape(known_ticker, monkeypatch):
    async def fake_get_ohlcv(ticker, days=180):
        assert ticker == known_ticker
        assert days == 180
        return _make_df(5)

    monkeypatch.setattr(ohlcv_route._fetcher, "get_ohlcv", fake_get_ohlcv)

    # lowercase in -> canonical uppercase out (case-insensitive allowlist match)
    body = await get_ohlcv(ticker=known_ticker.lower(), days=180)

    assert body["ticker"] == known_ticker
    assert len(body["candles"]) == 5
    assert len(body["volume"]) == 5

    times = [c["time"] for c in body["candles"]]
    assert all(isinstance(t, int) for t in times)          # UTCTimestamp seconds
    assert times == sorted(times)                          # ascending
    assert len(set(times)) == len(times)                   # unique
    first = body["candles"][0]
    assert set(first) == {"time", "open", "high", "low", "close"}
    assert all(isinstance(first[k], float) for k in ("open", "high", "low", "close"))
    assert body["volume"][0]["time"] == times[0]


async def test_unknown_ticker_is_404_and_never_fetches(monkeypatch):
    called = {"n": 0}

    async def fake_get_ohlcv(ticker, days=180):
        called["n"] += 1
        return _make_df()

    monkeypatch.setattr(ohlcv_route._fetcher, "get_ohlcv", fake_get_ohlcv)

    with pytest.raises(HTTPException) as ei:
        await get_ohlcv(ticker="NOTREAL", days=180)
    assert ei.value.status_code == 404
    assert called["n"] == 0  # allowlist rejected before any fetch (web-security)


async def test_fetch_failure_degrades_to_503(known_ticker, monkeypatch):
    async def boom(ticker, days=180):
        raise RuntimeError("provider down")

    monkeypatch.setattr(ohlcv_route._fetcher, "get_ohlcv", boom)

    with pytest.raises(HTTPException) as ei:
        await get_ohlcv(ticker=known_ticker, days=180)
    assert ei.value.status_code == 503  # not an opaque 500


async def test_empty_data_degrades_to_503(known_ticker, monkeypatch):
    async def empty(ticker, days=180):
        return pd.DataFrame()

    monkeypatch.setattr(ohlcv_route._fetcher, "get_ohlcv", empty)

    with pytest.raises(HTTPException) as ei:
        await get_ohlcv(ticker=known_ticker, days=180)
    assert ei.value.status_code == 503


async def test_nan_bars_are_dropped(known_ticker, monkeypatch):
    df = _make_df(4)
    df.iloc[1, df.columns.get_loc("close")] = np.nan  # one broken bar

    async def with_nan(ticker, days=180):
        return df

    monkeypatch.setattr(ohlcv_route._fetcher, "get_ohlcv", with_nan)

    body = await get_ohlcv(ticker=known_ticker, days=180)
    assert len(body["candles"]) == 3  # the NaN bar was skipped


async def test_duplicate_timestamps_are_deduped(known_ticker, monkeypatch):
    df = _make_df(3)
    dup = df.iloc[[0, 1, 1, 2]]  # duplicate the middle bar's timestamp

    async def with_dupes(ticker, days=180):
        return dup

    monkeypatch.setattr(ohlcv_route._fetcher, "get_ohlcv", with_dupes)

    body = await get_ohlcv(ticker=known_ticker, days=180)
    times = [c["time"] for c in body["candles"]]
    assert len(set(times)) == len(times)  # unique after de-dup
    assert times == sorted(times)
