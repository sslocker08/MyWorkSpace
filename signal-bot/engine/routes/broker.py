"""Broker endpoints.

GET  /api/broker/info        -> account info from active broker
GET  /api/broker/positions   -> current positions
POST /api/broker/order       -> place order (body: Order JSON)
"""
from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict, deque
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from core.broker_adapter import BrokerAdapter, Order, OrderSide, OrderType, get_broker
from core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

_RATE_LIMIT_MAX = 10
_RATE_LIMIT_WINDOW = 60.0
_rate_hits: dict[str, deque] = defaultdict(deque)
_rate_lock = asyncio.Lock()


async def _order_auth(
    request: Request,
    x_bot_key: Optional[str] = Header(None, alias="X-Bot-Key"),
) -> None:
    """Rate-limit and require X-Bot-Key header for order placement."""
    # API key check — require the application secret_key to prevent accidental
    # or malicious order submission from any process that can reach port 8000.
    if not x_bot_key or x_bot_key != settings.secret_key:
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid X-Bot-Key header. "
                   "Set X-Bot-Key: <secret_key from .env> to place orders.",
        )
    # Sliding-window rate limit (belt-and-suspenders, per-worker)
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    async with _rate_lock:
        hits = _rate_hits[client_ip]
        cutoff = now - _RATE_LIMIT_WINDOW
        while hits and hits[0] <= cutoff:
            hits.popleft()
        if len(hits) >= _RATE_LIMIT_MAX:
            raise HTTPException(
                status_code=429,
                detail="Order rate limit exceeded (10 req/60 s)",
                headers={"Retry-After": "60"},
            )
        hits.append(now)

# Module-level broker singleton — type determined by settings at first access
_broker: Optional[BrokerAdapter] = None


def _get_broker() -> BrokerAdapter:
    """Lazily initialize and return the configured broker."""
    global _broker
    if _broker is None:
        try:
            from core.config import settings
            broker_type = getattr(settings, "broker_type", "manual") or "manual"
        except Exception:
            broker_type = "manual"
        _broker = get_broker(broker_type)
        logger.info("Broker initialized: %s", type(_broker).__name__)
    return _broker


class OrderRequest(BaseModel):
    ticker: str
    side: OrderSide
    order_type: OrderType
    quantity: int
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None


@router.get("/info")
async def get_broker_info() -> dict:
    """Return account info from the active broker."""
    broker = _get_broker()
    try:
        return await broker.get_account_info()
    except NotImplementedError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        logger.error("broker.get_account_info failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch broker account info")


@router.get("/positions")
async def get_broker_positions() -> dict:
    """Return current positions from the active broker."""
    broker = _get_broker()
    try:
        positions = await broker.get_positions()
        return {"positions": positions, "broker": type(broker).__name__}
    except NotImplementedError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        logger.error("broker.get_positions failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch broker positions")


@router.post("/order", dependencies=[Depends(_order_auth)])
async def place_order(order_req: OrderRequest) -> dict:
    """Place an order via the active broker."""
    if order_req.quantity <= 0:
        raise HTTPException(status_code=422, detail="quantity must be > 0")
    if order_req.order_type == OrderType.LIMIT and order_req.limit_price is None:
        raise HTTPException(status_code=422, detail="limit_price required for LIMIT orders")

    broker = _get_broker()
    order = Order(
        ticker=order_req.ticker.upper(),
        side=order_req.side,
        order_type=order_req.order_type,
        quantity=order_req.quantity,
        limit_price=order_req.limit_price,
        stop_price=order_req.stop_price,
    )
    try:
        result = await broker.place_order(order)
        return {
            "order_id": result.order_id,
            "ticker": result.ticker,
            "side": result.side,
            "filled": result.filled,
            "fill_price": result.fill_price,
            "message": result.message,
            "broker": type(broker).__name__,
        }
    except NotImplementedError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        logger.error("broker.place_order failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to place order")
