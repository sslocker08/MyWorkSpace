"""Data fetcher: Polygon.io (US real-time/delayed) + Stooq (JP / ETF EOD).

Primary source  : Polygon.io via ``polygon-api-client``
                  — free tier delivers 15-minute delayed US equity data.
Fallback source : Stooq via ``pandas_datareader``
                  — end-of-day data for JP stocks, ETFs, and Polygon failures.
                  NOTE: Stooq returns rows newest-first; ``_fetch_stooq`` sorts
                  ascending before returning.

Cache: per-ticker in-process dict with a 14-minute TTL (just under Polygon's
15-min delay window so we never serve truly stale data in the same scan cycle).
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
import pandas_datareader as pdr
from polygon import RESTClient

from core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-process cache
# ---------------------------------------------------------------------------
_cache: dict[str, tuple[pd.DataFrame, datetime]] = {}
_CACHE_TTL = timedelta(minutes=14)


def _is_cache_valid(key: str) -> bool:
    if key not in _cache:
        return False
    _, ts = _cache[key]
    return datetime.utcnow() - ts < _CACHE_TTL


# ---------------------------------------------------------------------------
# DataFetcher
# ---------------------------------------------------------------------------

class DataFetcher:
    """Fetch OHLCV data for US equities (Polygon.io) and JP / ETF (Stooq).

    All public methods are async; blocking I/O is offloaded to a thread pool
    via ``asyncio.to_thread`` so they play nicely with a FastAPI event loop.
    """

    def __init__(self) -> None:
        self._polygon: Optional[RESTClient] = None

    # ------------------------------------------------------------------
    # Lazy Polygon client
    # ------------------------------------------------------------------

    @property
    def polygon(self) -> RESTClient:
        if self._polygon is None:
            if not settings.polygon_api_key:
                raise ValueError(
                    "POLYGON_API_KEY is not configured in settings."
                )
            self._polygon = RESTClient(settings.polygon_api_key)
        return self._polygon

    # ------------------------------------------------------------------
    # Public async API
    # ------------------------------------------------------------------

    async def get_ohlcv(
        self,
        ticker: str,
        days: int = 252,
        timespan: str = "day",
    ) -> pd.DataFrame:
        """Return OHLCV data for *ticker*.

        Columns : ``open``, ``high``, ``low``, ``close``, ``volume``
        Index   : ``DatetimeIndex`` named ``"date"``, sorted ascending.

        Args:
            ticker   : Ticker symbol (e.g. ``"AAPL"``).
            days     : How many calendar days of history to request.
                       Extra buffer is added automatically for weekends /
                       holidays so that *days* worth of trading days is
                       returned.
            timespan : Polygon aggregation timespan — ``"day"``, ``"hour"``,
                       ``"minute"``, etc.  Ignored when falling back to Stooq
                       (always daily).

        Raises:
            ValueError: If no data could be retrieved from either source.
        """
        cache_key = f"{ticker}_{days}_{timespan}"
        if _is_cache_valid(cache_key):
            logger.debug("Cache hit for %s", cache_key)
            return _cache[cache_key][0].copy()

        end_date = datetime.now()
        # Add ~50 calendar days of buffer so weekends/holidays don't shorten
        # the returned series below *days* trading days.
        start_date = end_date - timedelta(days=days + 50)

        df: Optional[pd.DataFrame] = None
        try:
            df = await asyncio.to_thread(
                self._fetch_polygon, ticker, start_date, end_date, timespan
            )
        except Exception as exc:
            logger.warning(
                "Polygon fetch failed for %s (%s) — falling back to Stooq",
                ticker, exc,
            )

        if df is None or df.empty:
            df = await asyncio.to_thread(
                self._fetch_stooq, ticker, start_date, end_date
            )

        if df is not None and not df.empty:
            _cache[cache_key] = (df, datetime.utcnow())
            return df.copy()

        raise ValueError(f"No data returned for ticker '{ticker}'")

    async def get_multiple_ohlcv(
        self,
        tickers: list[str],
        days: int = 252,
        max_concurrent: int = 10,
    ) -> dict[str, pd.DataFrame]:
        """Fetch OHLCV for multiple tickers concurrently.

        Args:
            tickers        : List of ticker symbols.
            days           : History depth passed to :meth:`get_ohlcv`.
            max_concurrent : Maximum simultaneous in-flight requests
                             (semaphore-limited to respect API rate limits).

        Returns:
            Mapping of ``{ticker: DataFrame}``.  Tickers that fail are
            omitted (logged at WARNING level).
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        results: dict[str, pd.DataFrame] = {}

        async def _fetch_one(ticker: str) -> None:
            async with semaphore:
                try:
                    results[ticker] = await self.get_ohlcv(ticker, days=days)
                except Exception as exc:
                    logger.warning("Failed to fetch %s: %s", ticker, exc)

        await asyncio.gather(*[_fetch_one(t) for t in tickers])
        return results

    async def get_latest_price(self, ticker: str) -> Optional[float]:
        """Return the most recent closing price, or *None* on failure."""
        try:
            df = await self.get_ohlcv(ticker, days=5)
            return float(df["close"].iloc[-1])
        except Exception as exc:
            logger.warning("get_latest_price failed for %s: %s", ticker, exc)
            return None

    async def get_sector_prices(
        self,
        sector_tickers: list[str],
        days: int = 365,
    ) -> pd.DataFrame:
        """Return a wide DataFrame of closing prices for sector ETFs.

        Columns : ticker symbols
        Index   : ``DatetimeIndex``, ascending
        """
        data = await self.get_multiple_ohlcv(sector_tickers, days=days)
        close_series: dict[str, pd.Series] = {
            ticker: df["close"]
            for ticker, df in data.items()
            if not df.empty
        }
        return pd.DataFrame(close_series).sort_index()

    # ------------------------------------------------------------------
    # Synchronous fetchers (called via asyncio.to_thread)
    # ------------------------------------------------------------------

    def _fetch_polygon(
        self,
        ticker: str,
        start: datetime,
        end: datetime,
        timespan: str = "day",
    ) -> pd.DataFrame:
        """Fetch aggregates from Polygon.io.

        Returns an empty DataFrame if no aggregates are found.
        Raises on network / API errors so the caller can fall back to Stooq.
        """
        aggs = list(
            self.polygon.list_aggs(
                ticker=ticker,
                multiplier=1,
                timespan=timespan,
                from_=start.strftime("%Y-%m-%d"),
                to=end.strftime("%Y-%m-%d"),
                adjusted=True,
                sort="asc",
                limit=50_000,
            )
        )
        if not aggs:
            return pd.DataFrame()

        records = [
            {
                "open":   a.open,
                "high":   a.high,
                "low":    a.low,
                "close":  a.close,
                "volume": a.volume,
            }
            for a in aggs
        ]
        df = pd.DataFrame(records)
        df.index = pd.to_datetime([a.timestamp for a in aggs], unit="ms")
        df.index.name = "date"
        return df.sort_index()

    def _fetch_stooq(
        self,
        ticker: str,
        start: datetime,
        end: datetime,
    ) -> pd.DataFrame:
        """Fetch end-of-day data from Stooq via pandas_datareader.

        IMPORTANT: Stooq returns rows in **descending** (newest-first) order.
        This method sorts ascending before returning so the result is
        consistent with ``_fetch_polygon``.

        Returns an empty DataFrame on any error.
        """
        try:
            raw: pd.DataFrame = pdr.data.DataReader(
                ticker, "stooq", start=start, end=end
            )
        except Exception as exc:
            logger.error("Stooq fetch failed for %s: %s", ticker, exc)
            return pd.DataFrame()

        if raw.empty:
            return raw

        # Sort ascending (Stooq default is newest-first)
        df = raw.sort_index(ascending=True)
        # Normalise column names to lowercase
        df.columns = [c.lower() for c in df.columns]
        # Stooq columns: open, high, low, close, volume (after lowercasing)
        return df[["open", "high", "low", "close", "volume"]]
