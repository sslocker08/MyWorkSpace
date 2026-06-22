"""Sentiment collection endpoints.

Routes
------
GET /api/sentiment/{ticker} — single-ticker sentiment
GET /api/sentiment          — sentiment for top-10 active signals from DB
"""
from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.config import settings
from core.sentiment_collector import collect_sentiment, SentimentResult

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Module-level cache: key=ticker, value=(SentimentResult, expires_at monotonic)
# ---------------------------------------------------------------------------
_CACHE_TTL = 1800.0  # 30 minutes
_sentiment_cache: dict[str, tuple[SentimentResult, float]] = {}


# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------

class SentimentOut(BaseModel):
    ticker: str
    bull_ratio: float
    vader_score: float
    post_count_24h: int
    combined_score: float
    source_count: int
    collected_at: str   # ISO-8601


class SentimentBatchResponse(BaseModel):
    results: list[SentimentOut]
    count: int
    as_of: str


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _cache_get(ticker: str) -> Optional[SentimentResult]:
    entry = _sentiment_cache.get(ticker)
    if entry is None:
        return None
    result, expires_at = entry
    if time.monotonic() > expires_at:
        _sentiment_cache.pop(ticker, None)
        return None
    return result


def _cache_set(ticker: str, result: SentimentResult) -> None:
    _sentiment_cache[ticker] = (result, time.monotonic() + _CACHE_TTL)


def _to_out(result: SentimentResult) -> SentimentOut:
    return SentimentOut(
        ticker=result.ticker,
        bull_ratio=result.bull_ratio,
        vader_score=result.vader_score,
        post_count_24h=result.post_count_24h,
        combined_score=result.combined_score,
        source_count=result.source_count,
        collected_at=datetime.utcnow().isoformat(),
    )


# ---------------------------------------------------------------------------
# Shared async helper
# ---------------------------------------------------------------------------

async def _get_sentiment(ticker: str) -> SentimentResult:
    """Fetch or return cached sentiment for *ticker*."""
    cached = _cache_get(ticker)
    if cached is not None:
        return cached

    async with httpx.AsyncClient() as client:
        result = await collect_sentiment(ticker, client, settings)

    _cache_set(ticker, result)
    return result


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/{ticker}", response_model=SentimentOut)
async def get_ticker_sentiment(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """Return sentiment data for a single ticker.

    Results cached per-ticker for 30 minutes.
    """
    ticker_upper = ticker.upper()
    try:
        result = await _get_sentiment(ticker_upper)
    except Exception as exc:
        logger.error("Sentiment collection failed for %s: %s", ticker_upper, exc)
        raise HTTPException(
            status_code=502,
            detail=f"Sentiment collection failed for '{ticker_upper}'",
        )
    return _to_out(result)


@router.get("/", response_model=SentimentBatchResponse)
async def get_top_signals_sentiment(db: AsyncSession = Depends(get_db)):
    """Return sentiment for the top-10 active signals from the database.

    Pulls the 10 highest-scoring ACTIVE signals, then fetches sentiment for
    each ticker concurrently. Results cached per-ticker for 30 minutes.
    """
    import asyncio
    from models.signal import Signal, SignalStatus

    # Fetch top-10 active signal tickers from DB
    stmt = (
        select(Signal.ticker)
        .where(Signal.status == SignalStatus.ACTIVE)
        .order_by(desc(Signal.score))
        .limit(10)
    )
    rows = await db.execute(stmt)
    tickers: list[str] = [row[0] for row in rows.fetchall()]

    if not tickers:
        return SentimentBatchResponse(
            results=[],
            count=0,
            as_of=datetime.utcnow().isoformat(),
        )

    semaphore = asyncio.Semaphore(5)
    collected: list[SentimentResult] = []

    async def _fetch_one(ticker: str) -> None:
        async with semaphore:
            try:
                result = await _get_sentiment(ticker)
                collected.append(result)
            except Exception as exc:
                logger.warning("Sentiment failed for %s: %s", ticker, exc)

    await asyncio.gather(*[_fetch_one(t) for t in tickers])

    return SentimentBatchResponse(
        results=[_to_out(r) for r in collected],
        count=len(collected),
        as_of=datetime.utcnow().isoformat(),
    )
