"""Sector rotation endpoint (stub for Phase 3 RRG)."""
from fastapi import APIRouter

router = APIRouter()

@router.get("/rrg")
async def get_rrg():
    return {"message": "RRG endpoint — implemented in Phase 3", "sectors": []}

@router.get("/momentum")
async def get_sector_momentum():
    return {"message": "Sector momentum — implemented in Phase 3"}
