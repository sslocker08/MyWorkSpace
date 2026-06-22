"""Portfolio tracking endpoints.

GET  /api/portfolio              -> list of positions (ACTIVE signals, score >= 70)
GET  /api/portfolio/pnl          -> PnL summary (unrealized, using current price)
POST /api/portfolio/watch/{ticker} -> add to watchlist (Redis SET "watchlist")
DELETE /api/portfolio/watch/{ticker} -> remove from watchlist
GET  /api/portfolio/watchlist    -> get watchlist
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from core.database import get_db
from core.data_fetcher import DataFetcher
from models.signal import Signal, SignalStatus

router = APIRouter()
_fetcher = DataFetcher()
logger = logging.getLogger(__name__)

_PORTFOLIO_SCORE_THRESHOLD = 70.0
_WATCHLIST_KEY = "watchlist"

# Module-level Redis singleton — created once, reused across requests.
_redis_client = None


def _get_redis():
    """Return a cached Redis client or None if unavailable."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis.asyncio as aioredis
        from core.config import settings
        _redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
        return _redis_client
    except Exception as e:
        logger.warning("portfolio: Redis unavailable: %s", e)
        return None


@router.get("/")
async def get_portfolio(db: AsyncSession = Depends(get_db)) -> dict:
    """Return active positions (ACTIVE signals with score >= 70)."""
    try:
        stmt = (
            select(Signal)
            .where(
                Signal.status == SignalStatus.ACTIVE,
                Signal.score >= _PORTFOLIO_SCORE_THRESHOLD,
            )
            .order_by(desc(Signal.score))
        )
        result = await db.execute(stmt)
        signals = result.scalars().all()
        positions = [
            {
                "id": str(s.id),
                "ticker": s.ticker,
                "direction": s.direction,
                "score": s.score,
                "entry_price": s.entry_price,
                "stop_loss": s.stop_loss,
                "tp1": s.tp1,
                "tp2": s.tp2,
                "tp3": s.tp3,
                "risk_reward": s.risk_reward,
                "regime": s.regime,
                "ceiling_score": s.ceiling_score,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in signals
        ]
        return {"positions": positions, "total": len(positions)}
    except Exception as e:
        logger.error("get_portfolio failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch portfolio")


@router.get("/pnl")
async def get_portfolio_pnl(db: AsyncSession = Depends(get_db)) -> dict:
    """Return unrealized PnL for active positions.

    Fetches current price via DataFetcher for each ACTIVE signal.
    unrealized_pnl_pct = (current - entry) / entry * 100  (LONG)
                       = (entry - current) / entry * 100  (SHORT)
    Falls back to entry_price if fetch fails (0% PnL shown).
    """
    try:
        stmt = (
            select(Signal)
            .where(
                Signal.status == SignalStatus.ACTIVE,
                Signal.score >= _PORTFOLIO_SCORE_THRESHOLD,
            )
            .order_by(desc(Signal.score))
        )
        result = await db.execute(stmt)
        signals = result.scalars().all()
    except Exception as e:
        logger.error("get_portfolio_pnl DB query failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch signals")

    pnl_rows = []
    total_pnl_pct = 0.0

    for s in signals:
        current_price: Optional[float] = None
        try:
            df = await _fetcher.get_ohlcv(s.ticker, days=2)
            if df is not None and not df.empty:
                current_price = float(df["close"].iloc[-1])
        except Exception as e:
            logger.warning("get_portfolio_pnl: price fetch failed for %s: %s", s.ticker, e)

        if current_price is None:
            current_price = s.entry_price
            pnl_pct = 0.0
        else:
            if s.entry_price and s.entry_price != 0:
                raw = (current_price - s.entry_price) / s.entry_price * 100.0
                pnl_pct = raw if s.direction == "LONG" else -raw
            else:
                pnl_pct = 0.0

        total_pnl_pct += pnl_pct
        pnl_rows.append(
            {
                "ticker": s.ticker,
                "direction": s.direction,
                "entry_price": s.entry_price,
                "current_price": round(current_price, 4),
                "unrealized_pnl_pct": round(pnl_pct, 2),
                "score": s.score,
            }
        )

    avg_pnl = total_pnl_pct / len(pnl_rows) if pnl_rows else 0.0
    return {
        "positions": pnl_rows,
        "total_positions": len(pnl_rows),
        "avg_unrealized_pnl_pct": round(avg_pnl, 2),
    }


@router.post("/watch/{ticker}")
async def add_to_watchlist(ticker: str) -> dict:
    """Add a ticker to the Redis watchlist SET."""
    ticker = ticker.upper().strip()
    if not ticker or len(ticker) > 20:
        raise HTTPException(status_code=422, detail="Invalid ticker")

    redis = _get_redis()
    if redis is None:
        raise HTTPException(status_code=503, detail="Redis unavailable")

    try:
        await redis.sadd(_WATCHLIST_KEY, ticker)
        return {"status": "added", "ticker": ticker}
    except Exception as e:
        logger.error("add_to_watchlist failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update watchlist")


@router.delete("/watch/{ticker}")
async def remove_from_watchlist(ticker: str) -> dict:
    """Remove a ticker from the Redis watchlist SET."""
    ticker = ticker.upper().strip()
    redis = _get_redis()
    if redis is None:
        raise HTTPException(status_code=503, detail="Redis unavailable")

    try:
        removed = await redis.srem(_WATCHLIST_KEY, ticker)
        return {"status": "removed" if removed else "not_found", "ticker": ticker}
    except Exception as e:
        logger.error("remove_from_watchlist failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update watchlist")


@router.get("/watchlist")
async def get_watchlist() -> dict:
    """Return all tickers in the Redis watchlist SET."""
    redis = _get_redis()
    if redis is None:
        return {"tickers": [], "note": "Redis unavailable"}

    try:
        members = await redis.smembers(_WATCHLIST_KEY)
        return {"tickers": sorted(members)}
    except Exception as e:
        logger.error("get_watchlist failed: %s", e)
        return {"tickers": [], "error": str(e)}
