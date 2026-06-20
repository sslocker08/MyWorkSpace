"""Anomaly/pump-and-dump detection endpoint (stub for Phase 4)."""
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_anomalies():
    return {"anomalies": [], "message": "Anomaly detection — implemented in Phase 4"}
