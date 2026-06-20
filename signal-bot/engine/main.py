"""Signal Bot — FastAPI entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import engine, create_tables
from core.event_bus import get_event_bus
from routes import signals, scanner, market_intel, sectors, anomaly, health, stream, ohlcv
from scheduler.main import start_scheduler, stop_scheduler

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    # Connect the realtime event bus. connect() never raises — if Redis is
    # absent the bus stays degraded and the engine still serves REST (realtime
    # simply off), so a missing Redis must not crash boot.
    try:
        await get_event_bus().connect()
    except Exception as e:  # noqa: BLE001 - belt-and-suspenders; must not crash boot
        logger.warning("EventBus connect failed at boot (realtime degraded): %s", e)
    await start_scheduler()
    logger.info("Signal Bot engine started")
    yield
    await stop_scheduler()
    try:
        await get_event_bus().close()
    except Exception as e:  # noqa: BLE001 - shutdown must not crash
        logger.warning("EventBus close failed at shutdown (ignored): %s", e)
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
app.include_router(stream.router, prefix="/api/stream", tags=["stream"])
app.include_router(ohlcv.router, prefix="/api/ohlcv", tags=["ohlcv"])
