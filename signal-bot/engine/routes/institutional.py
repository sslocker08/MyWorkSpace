"""Institutional holdings API — SEC 13F coattail tracking endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.institutional_tracker import TRACKED_MANAGERS, get_convergence_map
from models.institutional import InstitutionalHolding

router = APIRouter()


@router.get("/managers")
async def list_managers():
    """List all tracked institutional managers."""
    return {
        "managers": [
            {"key": k, "name": v["name"], "cik": v["cik"]}
            for k, v in TRACKED_MANAGERS.items()
        ]
    }


@router.get("/convergence")
async def get_convergence(db: AsyncSession = Depends(get_db)):
    """Tickers held by 2+ tracked managers, sorted by convergence count."""
    conv = await get_convergence_map(db)
    items = sorted(
        [{"ticker": t, "fund_count": c} for t, c in conv.items() if c >= 2],
        key=lambda x: x["fund_count"],
        reverse=True,
    )
    return {"convergence": items, "count": len(items)}


@router.get("/new-positions")
async def get_new_positions(db: AsyncSession = Depends(get_db)):
    """New positions opened this quarter across all tracked managers."""
    latest_result = await db.execute(
        select(InstitutionalHolding.quarter_end)
        .order_by(InstitutionalHolding.quarter_end.desc())
        .limit(1)
    )
    latest_quarter = latest_result.scalar()
    if not latest_quarter:
        return {"new_positions": [], "quarter": None, "count": 0}

    result = await db.execute(
        select(InstitutionalHolding)
        .where(
            InstitutionalHolding.quarter_end == latest_quarter,
            InstitutionalHolding.is_new_position == True,  # noqa: E712
        )
        .order_by(InstitutionalHolding.value_usd_thousands.desc())
        .limit(50)
    )
    holdings = result.scalars().all()
    return {
        "new_positions": [_serialize(h) for h in holdings],
        "quarter": latest_quarter.isoformat(),
        "count": len(holdings),
    }


@router.get("/holdings/{manager_key}")
async def get_manager_holdings(
    manager_key: str,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
):
    """Holdings for a specific manager in their most recent filing quarter."""
    if manager_key not in TRACKED_MANAGERS:
        raise HTTPException(status_code=404, detail="Manager not found")

    latest_result = await db.execute(
        select(InstitutionalHolding.quarter_end)
        .where(InstitutionalHolding.manager_key == manager_key)
        .order_by(InstitutionalHolding.quarter_end.desc())
        .limit(1)
    )
    latest_quarter = latest_result.scalar()
    if not latest_quarter:
        return {
            "holdings": [],
            "quarter": None,
            "manager": TRACKED_MANAGERS[manager_key]["name"],
            "count": 0,
        }

    result = await db.execute(
        select(InstitutionalHolding)
        .where(
            InstitutionalHolding.manager_key == manager_key,
            InstitutionalHolding.quarter_end == latest_quarter,
        )
        .order_by(InstitutionalHolding.value_usd_thousands.desc())
        .limit(limit)
    )
    holdings = result.scalars().all()
    return {
        "holdings": [_serialize(h) for h in holdings],
        "quarter": latest_quarter.isoformat(),
        "manager": TRACKED_MANAGERS[manager_key]["name"],
        "count": len(holdings),
    }


@router.post("/refresh")
async def trigger_refresh(db: AsyncSession = Depends(get_db)):
    """Manually trigger a 13F data refresh for all tracked managers."""
    from core.institutional_tracker import refresh_all
    results = await refresh_all(db)
    return {"status": "ok", "results": results}


def _serialize(h: InstitutionalHolding) -> dict:
    return {
        "ticker": h.ticker,
        "manager_key": h.manager_key,
        "manager_name": h.manager_name,
        "company_name": h.company_name,
        "shares": h.shares,
        "value_usd_thousands": h.value_usd_thousands,
        "pct_portfolio": round(h.pct_portfolio * 100, 2),
        "is_new_position": h.is_new_position,
        "filing_date": h.filing_date.isoformat() if h.filing_date else None,
        "quarter_end": h.quarter_end.isoformat() if h.quarter_end else None,
    }
