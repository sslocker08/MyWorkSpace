"""Sector rotation endpoints — RRG + simple momentum ranking.

Both endpoints follow the engine-wide "never 500" contract: the underlying
``compute_*`` helpers NEVER raise (they degrade to ``ok=False``), and the route
adds a short 1h in-process cache so we don't re-hit the slow ETF feeds on every
request. A degraded compute is cached too (briefly) so a transient outage does
not hammer the upstream.
"""
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Query

from core.sector_rotation import compute_sector_rrg, compute_sector_momentum

router = APIRouter()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# `days` validation bounds. RRG needs comfortably more than the WMA(10) +
# momentum(12) + normalization windows of history; SPDR ETF EOD history is deep,
# so allow up to ~2 years and floor at 120 trading-ish calendar days.
# ---------------------------------------------------------------------------
DAYS_MIN = 120
DAYS_MAX = 730
DAYS_DEFAULT = 300

# Short in-process cache keyed by `days` (the macro/ETF data is daily, so a fresh
# compute every request is pure waste). 1h TTL matches the market-intel endpoint.
_CACHE_TTL = timedelta(hours=1)
_rrg_cache: dict[int, tuple[dict, datetime]] = {}
_mom_cache: dict[int, tuple[dict, datetime]] = {}


def _cached(store: dict, key: int) -> dict | None:
    entry = store.get(key)
    if entry is None:
        return None
    payload, ts = entry
    if datetime.utcnow() - ts < _CACHE_TTL:
        return payload
    return None


@router.get("/rrg")
async def get_rrg(days: int = Query(DAYS_DEFAULT, ge=DAYS_MIN, le=DAYS_MAX)):
    """Relative Rotation Graph for the 11 GICS sector ETFs vs SPY.

    Returns 200 always. On fetch/compute failure the body is the degraded shape
    ``{"ok": False, "sectors": {}}`` — never a 500.
    """
    from core.signal_engine import _fetcher  # lazy: needs API keys

    cached = _cached(_rrg_cache, days)
    if cached is not None:
        return cached

    payload = await compute_sector_rrg(_fetcher, days=days)
    _rrg_cache[days] = (payload, datetime.utcnow())
    return payload


@router.get("/momentum")
async def get_sector_momentum(days: int = Query(DAYS_DEFAULT, ge=DAYS_MIN, le=DAYS_MAX)):
    """Per-sector 21d / 63d total-return ranking (descending by 21d), with the
    RRG quadrant annotated per row. Returns 200 always; degrades to
    ``{"ok": False, "sectors": []}`` on failure (never a 500).
    """
    from core.signal_engine import _fetcher  # lazy: needs API keys

    cached = _cached(_mom_cache, days)
    if cached is not None:
        return cached

    payload = await compute_sector_momentum(_fetcher, days=days)
    _mom_cache[days] = (payload, datetime.utcnow())
    return payload
