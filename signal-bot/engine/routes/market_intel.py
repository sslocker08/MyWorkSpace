"""Market intelligence: live ceiling-score endpoint.

Serves the composite Ceiling Score (0-100, market-top detector) computed by
:class:`core.market_intelligence.MarketIntelligenceEngine`. The endpoint follows
a strict fallback chain so it NEVER 500s and never presents stale numbers as
live:

  1. LIVE compute via the engine, behind a short in-process cache (1h) so we
     don't re-hit the slow external feeds on every request.
  2. The most recent persisted ``MarketIntelSnapshot`` from the DB (labelled
     ``source="db_snapshot"``).
  3. A clearly-labelled NEUTRAL/degraded default. The June-2026 reference
     numbers are retained ONLY here, explicitly stamped
     ``source="static_reference_fallback"`` — never presented as a live reading.
"""
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from core.database import get_db
from core.market_intelligence import MarketIntelligenceEngine, regime_label
from models.market_intel import MarketIntelSnapshot

router = APIRouter()
logger = logging.getLogger(__name__)

# Last successfully computed regime, reused if a later compute fails so the
# endpoint serves a known-good value instead of NEUTRAL during a transient outage.
_last_regime: str | None = None

# ---------------------------------------------------------------------------
# Short in-process cache for the LIVE compute. The underlying macro feeds are
# daily/weekly, so a fresh compute every request is pure waste; cache the result
# for 1h. (collectors have their own TTLs too — this caps the assembly cost.)
# ---------------------------------------------------------------------------
_CEILING_CACHE_TTL = timedelta(hours=1)
_ceiling_cache: dict | None = None
_ceiling_cache_at: datetime | None = None

# June-2026 reference values — kept ONLY as an explicitly-labelled static
# fallback (never presented as live). DEBT: snapshot of the manual estimate that
# the live engine replaces.
_STATIC_REFERENCE = {
    "ceiling_score": 72.0,
    "breakdown": {
        "baa_bull_bear": 0.95,
        "aaii_sentiment": 0.5,
        "put_call_ratio": 0.4,
        "fear_greed": 0.6,
        "margin_debt": 0.8,
        "breadth_deterioration": 0.6,
        "vix_term_structure": 0.5,
        "valuation_composite": 0.7,
        "sector_rotation": 0.6,
        "semi_cycle": 0.8,
    },
}


def _live_payload(score) -> dict:
    return {
        "ceiling_score": score.total,
        "regime": score.regime,
        "breakdown": score.breakdown,
        "weights_used": score.weights_used,
        "available_axes": score.available_axes,
        "degraded": score.degraded,
        "source": "live",
        "computed_at": score.computed_at.isoformat(),
    }


@router.get("/ceiling-score")
async def get_ceiling_score(db: AsyncSession = Depends(get_db)):
    """Return the composite ceiling score via the live→snapshot→static chain.

    Never raises to the caller (no 500): each tier is wrapped and falls through
    to the next, ending at a clearly-labelled neutral default.
    """
    global _ceiling_cache, _ceiling_cache_at, _last_regime

    # --- tier 1: short-cached LIVE compute ------------------------------
    now = datetime.utcnow()
    if (
        _ceiling_cache is not None
        and _ceiling_cache_at is not None
        and now - _ceiling_cache_at < _CEILING_CACHE_TTL
    ):
        return _ceiling_cache
    try:
        engine = MarketIntelligenceEngine()
        score = await engine.compute_ceiling_score()
        payload = _live_payload(score)
        _ceiling_cache = payload
        _ceiling_cache_at = now
        _last_regime = score.regime
        return payload
    except Exception as exc:  # noqa: BLE001 — fall through to DB snapshot
        logger.warning("ceiling-score live compute failed (%s) — DB snapshot", exc)

    # --- tier 2: most recent persisted snapshot -------------------------
    try:
        result = await db.execute(
            select(MarketIntelSnapshot)
            .order_by(desc(MarketIntelSnapshot.computed_at))
            .limit(1)
        )
        snap = result.scalar_one_or_none()
        if snap is not None:
            return {
                "ceiling_score": snap.ceiling_score,
                "regime": regime_label(snap.ceiling_score),
                "breakdown": snap.breakdown,
                "available_axes": (snap.breakdown or {}).get("available_axes")
                if isinstance(snap.breakdown, dict)
                else None,
                "degraded": (snap.breakdown or {}).get("degraded", True)
                if isinstance(snap.breakdown, dict)
                else True,
                "source": "db_snapshot",
                "computed_at": snap.computed_at.isoformat(),
            }
    except Exception as exc:  # noqa: BLE001 — fall through to static default
        logger.warning("ceiling-score DB snapshot lookup failed (%s)", exc)

    # --- tier 3: clearly-labelled static reference (NOT live) ------------
    return {
        "ceiling_score": _STATIC_REFERENCE["ceiling_score"],
        "regime": regime_label(_STATIC_REFERENCE["ceiling_score"]),
        "breakdown": _STATIC_REFERENCE["breakdown"],
        "available_axes": 0,
        "degraded": True,
        "source": "static_reference_fallback",
        "computed_at": datetime.utcnow().isoformat(),
        "warning": "Live compute and DB snapshot both unavailable; serving the labelled June-2026 reference estimate (NOT a live reading).",
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
