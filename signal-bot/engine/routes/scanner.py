"""Scanner trigger endpoint."""
import asyncio
import logging
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.signal_engine import scan_universe
from universe import UniverseManager

router = APIRouter()
logger = logging.getLogger(__name__)
_universe = UniverseManager()
_scan_lock = asyncio.Lock()


@router.post("/trigger")
async def trigger_scan(
    background_tasks: BackgroundTasks,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Trigger a manual market scan in the background."""
    if _scan_lock.locked():
        return {"status": "busy", "message": "Scan already in progress"}

    async def run_scan():
        async with _scan_lock:
            try:
                tickers = await _universe.get_high_priority_tickers(limit)
                signals = await scan_universe(tickers, db=db)
                logger.info(f"Manual scan complete: {len(signals)} signals")
            except Exception as e:
                logger.error(f"Scan failed: {e}")

    background_tasks.add_task(run_scan)
    return {"status": "started", "message": f"Scanning {limit} tickers in background"}


@router.get("/status")
async def scan_status():
    return {"scanning": _scan_lock.locked()}
