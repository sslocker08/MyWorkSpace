"""Signal CRUD and ranking endpoints."""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from core.database import get_db
from models.signal import Signal, SignalStatus, Direction, Market

router = APIRouter()


@router.get("/")
async def list_signals(
    limit: int = Query(20, ge=1, le=100),
    # web-security: validate every query param against a strict allowlist. Binding
    # these to the existing enums makes FastAPI reject out-of-allowlist values with
    # HTTP 422 automatically, so untrusted input never reaches the SQL filter.
    direction: Optional[Direction] = None,
    market: Optional[Market] = None,
    status: SignalStatus = SignalStatus.ACTIVE,
    min_score: float = Query(0, ge=0, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Signal).where(Signal.status == status)
    if direction:
        stmt = stmt.where(Signal.direction == direction)
    if market:
        stmt = stmt.where(Signal.market == market)
    if min_score > 0:
        stmt = stmt.where(Signal.score >= min_score)
    stmt = stmt.order_by(desc(Signal.score)).limit(limit)
    result = await db.execute(stmt)
    signals = result.scalars().all()
    return {"signals": [_serialize(s) for s in signals], "count": len(signals)}


@router.get("/rankings")
async def get_rankings(
    limit: int = Query(20, ge=1, le=50),
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(hours=hours)
    stmt = (
        select(Signal)
        .where(Signal.created_at >= since)
        .order_by(desc(Signal.score))
        .limit(limit)
    )
    result = await db.execute(stmt)
    signals = result.scalars().all()
    return {"rankings": [_serialize(s) for s in signals], "as_of": since.isoformat()}


@router.get("/{signal_id}")
async def get_signal(signal_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Signal).where(Signal.id == signal_id))
    signal = result.scalar_one_or_none()
    if not signal:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Signal not found")
    return _serialize(signal)


def _serialize(s: Signal) -> dict:
    return {
        "id": str(s.id),
        "ticker": s.ticker,
        "market": s.market,
        "sector": s.sector,
        "direction": s.direction,
        "score": s.score,
        "strategy_hits": s.strategy_hits,
        "entry_price": s.entry_price,
        "stop_loss": s.stop_loss,
        "tp1": s.tp1,
        "tp2": s.tp2,
        "tp3": s.tp3,
        "risk_reward": s.risk_reward,
        "regime": s.regime,
        "ceiling_score": s.ceiling_score,
        "indicators": s.indicators,
        "status": s.status,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }
