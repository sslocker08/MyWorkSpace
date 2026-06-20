"""OHLCV candle endpoint — feeds the frontend TradingView Lightweight Charts view.

Shape contract (consumed by web/components/chart/CandleChart.tsx):

    GET /api/ohlcv/{ticker}?days=180  ->
    {
      "ticker": "AAPL",
      "candles": [{"time": <unix seconds>, "open","high","low","close"}, ...],
      "volume": [{"time": <unix seconds>, "value": <float>}, ...]
    }

TradingView Lightweight Charts requires the `time` axis to be ascending, unique,
and either a UTCTimestamp (seconds since epoch) or a 'YYYY-MM-DD' business-day
string. We emit UTCTimestamp seconds (intraday-safe, and unambiguous across
timezones). The DataFetcher returns an ascending DatetimeIndex already; we
de-duplicate defensively (a calendar day can appear twice if two sources are
ever stitched) so the chart never throws "data must be asc ordered by time".

web-security: the ticker is validated against the UniverseManager allowlist
BEFORE any fetch. An unknown ticker is rejected 404 — untrusted symbols never
reach the upstream data provider. `days` is bound to 1..400 by FastAPI's Query
so a caller can't request an unbounded history.

Failure policy (mirrors health.py's "never opaque-500" stance): an upstream
fetch failure (provider down, ticker has no data) yields 503 with a clear
message, not a 500 stacktrace — the client renders its "データ取得不可" state.
"""
import logging
import math

import pandas as pd
from fastapi import APIRouter, HTTPException, Path, Query

from core.signal_engine import _fetcher
from universe import UniverseManager

logger = logging.getLogger(__name__)

router = APIRouter()

_universe = UniverseManager()

# Built once at import. The universe is a static list (S&P 500 + ETFs), so a
# frozenset gives O(1) membership and a stable allowlist for the request path.
_ALLOWED_TICKERS: frozenset[str] = frozenset(_universe.get_full_universe())


def _to_unix_seconds(ts: pd.Timestamp) -> int:
    """Convert a pandas Timestamp to an integer UTC unix-seconds value.

    Lightweight Charts' UTCTimestamp is seconds (not ms). A naive index is
    treated as UTC (the fetchers store UTC-derived daily bars).
    """
    if ts.tzinfo is None:
        ts = ts.tz_localize("UTC")
    else:
        ts = ts.tz_convert("UTC")
    return int(ts.timestamp())


def _finite(x) -> bool:
    """True only for a real, finite number (drops NaN/inf rows that would make
    the chart draw a broken bar or throw)."""
    try:
        return x is not None and math.isfinite(float(x))
    except (TypeError, ValueError):
        return False


@router.get("/{ticker}")
async def get_ohlcv(
    ticker: str = Path(..., min_length=1, max_length=12),
    days: int = Query(180, ge=1, le=400),
):
    """Return ascending, de-duplicated candle + volume series for *ticker*.

    Raises:
        404 — ticker is not in the scanning universe (allowlist miss).
        503 — upstream data could not be fetched (provider down / no data).
    """
    # Normalize once and validate against the allowlist. Symbols are uppercase
    # in the universe; compare case-insensitively but serve the canonical form.
    symbol = ticker.strip().upper()
    if symbol not in _ALLOWED_TICKERS:
        # 404 (not 422): the symbol is well-formed, it simply isn't a resource
        # we serve. Don't echo arbitrary input verbatim beyond the symbol.
        raise HTTPException(status_code=404, detail=f"Unknown ticker '{symbol}'")

    try:
        df: pd.DataFrame = await _fetcher.get_ohlcv(symbol, days=days)
    except Exception as exc:  # noqa: BLE001 — degrade to 503, never opaque-500
        logger.warning("OHLCV fetch failed for %s (days=%s): %s", symbol, days, exc)
        raise HTTPException(
            status_code=503,
            detail=f"Price data temporarily unavailable for '{symbol}'",
        )

    if df is None or df.empty:
        raise HTTPException(
            status_code=503,
            detail=f"No price data available for '{symbol}'",
        )

    # Defensive: ensure ascending + unique on the time axis (LW Charts hard
    # requirement). DataFetcher sorts ascending already; keep="last" wins ties.
    df = df.sort_index()
    df = df[~df.index.duplicated(keep="last")]

    candles: list[dict] = []
    volume: list[dict] = []
    for ts, row in df.iterrows():
        o, h, l, c = row.get("open"), row.get("high"), row.get("low"), row.get("close")
        if not (_finite(o) and _finite(h) and _finite(l) and _finite(c)):
            # Skip any partial/NaN bar rather than emit a malformed candle.
            continue
        t = _to_unix_seconds(ts)
        candles.append({
            "time": t,
            "open": float(o),
            "high": float(h),
            "low": float(l),
            "close": float(c),
        })
        v = row.get("volume")
        if _finite(v):
            volume.append({"time": t, "value": float(v)})

    if not candles:
        # Data came back but every bar was unusable — treat as unavailable.
        raise HTTPException(
            status_code=503,
            detail=f"No usable price data for '{symbol}'",
        )

    return {"ticker": symbol, "candles": candles, "volume": volume}
