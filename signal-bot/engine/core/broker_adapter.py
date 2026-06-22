"""Broker abstraction for future live trading integration.

Architecture: BrokerAdapter base (abstract) + ManualBroker (paper/manual) + SBIBroker (stub).
The ManualBroker logs orders to DB only; no real execution.
The SBIBroker stub has the interface defined but raises NotImplementedError — wired to
kabu.com API skeleton per the plan (SBI is the only realistic JP REST API).

ported from: kabu.com REST API spec https://kabucom.github.io/kabusapi/ptal/index.html
"""
from __future__ import annotations

import logging
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"


@dataclass
class Order:
    ticker: str
    side: OrderSide
    order_type: OrderType
    quantity: int
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None


@dataclass
class OrderResult:
    order_id: str
    ticker: str
    side: str
    filled: bool
    fill_price: Optional[float]
    message: str


class BrokerAdapter(ABC):
    """Abstract base for all broker integrations."""

    @abstractmethod
    async def place_order(self, order: Order) -> OrderResult:
        """Submit an order. Returns OrderResult with fill details."""
        ...

    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an open order by ID. Returns True if cancelled."""
        ...

    @abstractmethod
    async def get_positions(self) -> list[dict]:
        """Return list of current open positions."""
        ...

    @abstractmethod
    async def get_account_info(self) -> dict:
        """Return account metadata (broker name, type, balance if available)."""
        ...


class ManualBroker(BrokerAdapter):
    """Paper trading / manual execution broker.

    Orders are logged to console + returned with a mock fill.
    No real capital at risk. Used for backtesting, desktop demo, and
    paper-trading mode where the operator manually executes signals.
    """

    async def place_order(self, order: Order) -> OrderResult:
        order_id = str(uuid.uuid4())
        # Use limit_price if provided, else simulate market fill with None
        fill_price = order.limit_price if order.limit_price is not None else None
        logger.info(
            "ManualBroker: PLACE_ORDER id=%s ticker=%s side=%s type=%s qty=%d "
            "limit_price=%s stop_price=%s — paper execution only, no real trade",
            order_id,
            order.ticker,
            order.side.value,
            order.order_type.value,
            order.quantity,
            order.limit_price,
            order.stop_price,
        )
        return OrderResult(
            order_id=order_id,
            ticker=order.ticker,
            side=order.side.value,
            filled=True,
            fill_price=fill_price,
            message="ManualBroker: paper order logged (no real execution)",
        )

    async def cancel_order(self, order_id: str) -> bool:
        logger.info("ManualBroker: cancel order %s (no-op)", order_id)
        return True

    async def get_positions(self) -> list[dict]:
        # ManualBroker has no persistent state; positions tracked externally via DB signals
        return []

    async def get_account_info(self) -> dict:
        return {
            "broker": "ManualBroker",
            "type": "paper",
            "balance": None,
            "note": "Paper trading mode — no real capital at risk",
        }


class SBIBroker(BrokerAdapter):
    """SBI Securities via kabu.com API (kabustation).

    kabu.com API spec: https://kabucom.github.io/kabusapi/ptal/index.html
    Requires: KABU_API_KEY, KABU_API_SECRET in settings (already in config.py).
    All methods raise NotImplementedError until the kabustation local API is wired.

    kabustation runs as a local Windows process exposing a REST API on localhost:18080.
    The token endpoint is POST /kabusapi/token (body: {APIPassword: <password>}).
    Order endpoint is POST /kabusapi/sendorder.
    """

    BASE_URL = "http://localhost:18080/kabusapi"  # kabustation local API

    async def place_order(self, order: Order) -> OrderResult:
        raise NotImplementedError(
            "SBIBroker.place_order: kabu.com API not yet wired. "
            "Start kabustation on Windows, obtain a token via POST /kabusapi/token, "
            "then POST /kabusapi/sendorder. See https://kabucom.github.io/kabusapi/ptal/index.html"
        )

    async def cancel_order(self, order_id: str) -> bool:
        raise NotImplementedError(
            "SBIBroker.cancel_order: kabu.com API not yet wired. "
            "Use PUT /kabusapi/cancelorder. "
            "See https://kabucom.github.io/kabusapi/ptal/index.html"
        )

    async def get_positions(self) -> list[dict]:
        raise NotImplementedError(
            "SBIBroker.get_positions: kabu.com API not yet wired. "
            "Use GET /kabusapi/positions. "
            "See https://kabucom.github.io/kabusapi/ptal/index.html"
        )

    async def get_account_info(self) -> dict:
        raise NotImplementedError(
            "SBIBroker.get_account_info: kabu.com API not yet wired. "
            "Use GET /kabusapi/wallet/cash or /kabusapi/wallet/margin. "
            "See https://kabucom.github.io/kabusapi/ptal/index.html"
        )


def get_broker(broker_type: str = "manual") -> BrokerAdapter:
    """Factory: 'manual' -> ManualBroker, 'sbi' -> SBIBroker."""
    if broker_type == "sbi":
        logger.info("BrokerFactory: SBIBroker selected (kabu.com API stub)")
        return SBIBroker()
    logger.info("BrokerFactory: ManualBroker selected (paper trading)")
    return ManualBroker()
