"""LLM intelligence endpoints.

GET /api/intelligence/digest   -> DailyDigest (cached 30 min)
GET /api/intelligence/news/{ticker}?headline=... -> {"score": float, "sentiment": str}
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from core.config import settings
from core.database import get_db
from core.intelligence_engine import IntelligenceEngine, DailyDigest, get_intelligence_engine
from models.signal import Signal, SignalStatus
from models.market_intel import MarketIntelSnapshot

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple in-process digest cache: (digest, computed_at_epoch)
_digest_cache: Optional[tuple[DailyDigest, float]] = None
_DIGEST_CACHE_TTL = 1800.0  # 30 minutes


def _get_engine() -> IntelligenceEngine:
    """Lazily return the IntelligenceEngine singleton, or 503 if no API key."""
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=503,
            detail={
                "type": "https://httpstatuses.com/503",
                "title": "Service Unavailable",
                "detail": "ANTHROPIC_API_KEY is not configured. Intelligence features are disabled.",
            },
        )
    return get_intelligence_engine(settings.anthropic_api_key)


@router.get("/digest")
async def get_daily_digest(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the daily market digest, recomputed at most every 30 minutes."""
    import time

    global _digest_cache
    now = time.monotonic()

    # Return cached digest if fresh
    if _digest_cache is not None:
        digest, cached_at = _digest_cache
        if now - cached_at < _DIGEST_CACHE_TTL:
            return _digest_to_dict(digest)

    engine = _get_engine()

    # Fetch latest ceiling score from DB
    ceiling_score = 50.0
    regime = "NEUTRAL"
    try:
        stmt = (
            select(MarketIntelSnapshot)
            .order_by(desc(MarketIntelSnapshot.computed_at))
            .limit(1)
        )
        result = await db.execute(stmt)
        snapshot = result.scalar_one_or_none()
        if snapshot is not None:
            ceiling_score = float(snapshot.ceiling_score)
    except Exception as e:
        logger.warning("get_daily_digest: failed to fetch ceiling snapshot: %s", e)

    # Fetch top 5 ACTIVE signals by score
    top_signals: list[dict] = []
    try:
        stmt = (
            select(Signal)
            .where(Signal.status == SignalStatus.ACTIVE)
            .order_by(desc(Signal.score))
            .limit(5)
        )
        result = await db.execute(stmt)
        signals = result.scalars().all()
        top_signals = [
            {
                "ticker": s.ticker,
                "direction": s.direction,
                "score": s.score,
            }
            for s in signals
        ]
        if signals:
            regime = signals[0].regime or "NEUTRAL"
    except Exception as e:
        logger.warning("get_daily_digest: failed to fetch top signals: %s", e)

    digest = await engine.generate_daily_digest(
        ceiling_score=ceiling_score,
        regime=regime,
        top_signals=top_signals,
    )

    _digest_cache = (digest, now)
    return _digest_to_dict(digest)


@router.get("/news/{ticker}")
async def get_news_sentiment(
    ticker: str,
    headline: str = Query(..., min_length=1, max_length=500),
) -> dict:
    """Classify a news headline sentiment for a given ticker.

    Returns {"score": float [-1.0, 1.0], "sentiment": "POSITIVE|NEUTRAL|NEGATIVE"}.
    """
    engine = _get_engine()
    score = await engine.classify_news_sentiment(ticker=ticker.upper(), headline=headline)

    if score >= 0.2:
        sentiment = "POSITIVE"
    elif score <= -0.2:
        sentiment = "NEGATIVE"
    else:
        sentiment = "NEUTRAL"

    return {"score": round(score, 4), "sentiment": sentiment, "ticker": ticker.upper()}


def _digest_to_dict(digest: DailyDigest) -> dict:
    return {
        "ceiling_score": digest.ceiling_score,
        "regime": digest.regime,
        "top_signals": digest.top_signals,
        "macro_summary": digest.macro_summary,
        "risk_warnings": digest.risk_warnings,
    }
