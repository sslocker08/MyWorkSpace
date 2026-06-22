"""Anomaly / pump-and-dump detection endpoints.

Routes
------
GET /api/anomaly          — scan top-50 US tickers, return flagged anomalies
GET /api/anomaly/{ticker} — single-ticker anomaly check
"""
from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.anomaly_detector import detect_anomaly, AnomalyResult

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Module-level cache: key=ticker, value=(AnomalyResult, expires_at monotonic)
# ---------------------------------------------------------------------------
_CACHE_TTL = 300.0  # 5 minutes
_anomaly_cache: dict[str, tuple[AnomalyResult, float]] = {}

# Top-50 US tickers to scan in the batch endpoint
_US_SCAN_UNIVERSE: list[str] = [
    "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "AMD", "AVGO",
    "ORCL", "CRM", "ADBE", "QCOM", "INTC", "TXN", "AMAT", "MU", "NOW",
    "JPM", "BAC", "WFC", "GS", "MS", "V", "MA", "AXP",
    "UNH", "LLY", "JNJ", "MRK", "ABBV", "PFE", "AMGN",
    "XOM", "CVX", "COP", "EOG",
    "HD", "MCD", "SBUX", "NKE", "COST",
    "HON", "UPS", "RTX", "GE", "LMT", "CAT",
    "NEE", "DUK", "SPY",
]


def _get_fetcher():
    """Lazy-load DataFetcher to defer pandas_datareader import until first use.

    ported from: core/data_fetcher.py DataFetcher
    """
    from core.data_fetcher import DataFetcher  # noqa: PLC0415 - intentional lazy import
    return DataFetcher()


# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------

class AnomalyResultOut(BaseModel):
    ticker: str
    anomaly_type: str
    volume_zscore: float
    volume_ratio: float
    price_change_pct: float
    isolation_score: Optional[float]
    is_flagged: bool
    message: str
    scanned_at: str   # ISO-8601


class AnomalyResponse(BaseModel):
    anomalies: list[AnomalyResultOut]
    total_scanned: int
    flagged_count: int
    as_of: str


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _cache_get(ticker: str) -> Optional[AnomalyResult]:
    entry = _anomaly_cache.get(ticker)
    if entry is None:
        return None
    result, expires_at = entry
    if time.monotonic() > expires_at:
        _anomaly_cache.pop(ticker, None)
        return None
    return result


def _cache_set(ticker: str, result: AnomalyResult) -> None:
    _anomaly_cache[ticker] = (result, time.monotonic() + _CACHE_TTL)


def _to_out(result: AnomalyResult) -> AnomalyResultOut:
    return AnomalyResultOut(
        ticker=result.ticker,
        anomaly_type=result.anomaly_type,
        volume_zscore=result.volume_zscore,
        volume_ratio=result.volume_ratio,
        price_change_pct=result.price_change_pct,
        isolation_score=result.isolation_score,
        is_flagged=result.is_flagged,
        message=result.message,
        scanned_at=datetime.utcnow().isoformat(),
    )


# ---------------------------------------------------------------------------
# Single-ticker helper (shared by both routes)
# ---------------------------------------------------------------------------

async def _get_anomaly_for_ticker(ticker: str) -> Optional[AnomalyResult]:
    """Fetch OHLCV and run anomaly detection for *ticker*. Returns None on failure."""
    cached = _cache_get(ticker)
    if cached is not None:
        return cached

    try:
        fetcher = _get_fetcher()
        df = await fetcher.get_ohlcv(ticker, days=60)
    except Exception as exc:
        logger.warning("OHLCV fetch failed for %s in anomaly scan: %s", ticker, exc)
        return None

    if df is None or df.empty:
        return None

    try:
        result = detect_anomaly(ticker, df)
    except Exception as exc:
        logger.warning("detect_anomaly failed for %s: %s", ticker, exc)
        return None

    _cache_set(ticker, result)
    return result


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/", response_model=AnomalyResponse)
async def get_anomalies(db: AsyncSession = Depends(get_db)):
    """Scan top-50 US tickers for pump/dump/accumulation anomalies.

    Results are cached per-ticker for 5 minutes to avoid hammering the data source.
    Returns only flagged tickers, sorted by volume_zscore descending.
    """
    import asyncio

    results: list[AnomalyResult] = []

    async def _scan_one(ticker: str) -> None:
        result = await _get_anomaly_for_ticker(ticker)
        if result is not None:
            results.append(result)

    # Concurrently scan up to 10 tickers at a time
    semaphore = asyncio.Semaphore(10)

    async def _limited(ticker: str) -> None:
        async with semaphore:
            await _scan_one(ticker)

    await asyncio.gather(*[_limited(t) for t in _US_SCAN_UNIVERSE])

    flagged = [r for r in results if r.is_flagged]
    flagged.sort(key=lambda r: r.volume_zscore, reverse=True)

    return AnomalyResponse(
        anomalies=[_to_out(r) for r in flagged],
        total_scanned=len(results),
        flagged_count=len(flagged),
        as_of=datetime.utcnow().isoformat(),
    )


@router.get("/{ticker}", response_model=AnomalyResultOut)
async def get_anomaly_for_ticker(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """Run anomaly detection for a single ticker.

    Results cached for 5 minutes.
    """
    ticker_upper = ticker.upper()
    result = await _get_anomaly_for_ticker(ticker_upper)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch OHLCV data for ticker '{ticker_upper}'",
        )
    return _to_out(result)
