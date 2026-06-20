"""Market intelligence: ceiling score endpoint (stub for Phase 3)."""
import logging
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from core.database import get_db
from models.market_intel import MarketIntelSnapshot

router = APIRouter()
logger = logging.getLogger(__name__)

# Last successfully computed regime, reused if a later compute fails so the
# endpoint serves a known-good value instead of NEUTRAL during a transient outage.
_last_regime: str | None = None


@router.get("/ceiling-score")
async def get_ceiling_score(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MarketIntelSnapshot).order_by(desc(MarketIntelSnapshot.computed_at)).limit(1)
    )
    snap = result.scalar_one_or_none()
    if not snap:
        # Return current hardcoded estimate based on June 2026 data
        return {
            "ceiling_score": 72.0,
            "regime": "CAUTION",
            "breakdown": {
                "baa_bull_bear": 0.95,  # 8.5 > 8.0 = SELL signal ACTIVE
                "aaii_sentiment": 0.5,
                "put_call_ratio": 0.4,
                "fear_greed": 0.6,
                "margin_debt": 0.8,  # +36% YoY
                "breadth": 0.6,
                "vix_term": 0.5,
                "valuation": 0.7,
                "sector_rotation": 0.6,
                "semi_cycle": 0.8,  # SOXX MACD negative + B2B 0.94
            },
            "data_source": "hardcoded_estimate",
            "computed_at": datetime.utcnow().isoformat(),
            "warning": "Full market intelligence engine requires Phase 3 implementation",
        }
    return {
        "ceiling_score": snap.ceiling_score,
        "breakdown": snap.breakdown,
        "computed_at": snap.computed_at.isoformat(),
    }


@router.get("/regime")
async def get_regime():
    """Return the current market regime (BULL/BEAR/HIGH_VOL/NEUTRAL).

    Computes fresh via the benchmark (SPY); on success caches the value as the
    last-known-good. On any failure it falls back to the last cached value, and
    if none exists yet, to a NEUTRAL fallback — never raising to the caller.
    """
    global _last_regime
    from core.signal_engine import _fetcher
    from core.market_regime import compute_market_regime

    try:
        regime = await compute_market_regime(_fetcher)
        _last_regime = regime
        return {"regime": regime, "source": "computed"}
    except Exception as exc:  # noqa: BLE001
        logger.warning("Regime endpoint compute failed (%s)", exc)
        if _last_regime is not None:
            return {"regime": _last_regime, "source": "cache"}
        return {"regime": "NEUTRAL", "source": "fallback"}
