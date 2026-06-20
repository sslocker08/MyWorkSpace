"""Signal Bot — FastAPI entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import engine, create_tables
from routes import signals, scanner, market_intel, sectors, anomaly, health
from scheduler.main import start_scheduler, stop_scheduler

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    await start_scheduler()
    logger.info("Signal Bot engine started")
    yield
    await stop_scheduler()
    logger.info("Signal Bot engine stopped")


app = FastAPI(
    title="Signal Bot API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(signals.router, prefix="/api/signals", tags=["signals"])
app.include_router(scanner.router, prefix="/api/scanner", tags=["scanner"])
app.include_router(market_intel.router, prefix="/api/market-intel", tags=["market-intel"])
app.include_router(sectors.router, prefix="/api/sectors", tags=["sectors"])
app.include_router(anomaly.router, prefix="/api/anomaly", tags=["anomaly"])
