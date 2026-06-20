import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, JSON, Enum as SAEnum, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
import enum

from core.database import Base


class Direction(str, enum.Enum):
    LONG = "LONG"
    SHORT = "SHORT"


class Market(str, enum.Enum):
    US = "US"
    JP = "JP"
    ETF = "ETF"


class SignalStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    HIT_TP1 = "HIT_TP1"
    HIT_TP2 = "HIT_TP2"
    HIT_TP3 = "HIT_TP3"
    HIT_SL = "HIT_SL"
    EXPIRED = "EXPIRED"


class Signal(Base):
    __tablename__ = "signals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    market: Mapped[str] = mapped_column(SAEnum(Market), nullable=False)
    sector: Mapped[str] = mapped_column(String(100), nullable=True)
    direction: Mapped[str] = mapped_column(SAEnum(Direction), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    strategy_hits: Mapped[dict] = mapped_column(JSON, default=list)
    entry_price: Mapped[float] = mapped_column(Float, nullable=False)
    stop_loss: Mapped[float] = mapped_column(Float, nullable=False)
    tp1: Mapped[float] = mapped_column(Float, nullable=False)
    tp2: Mapped[float] = mapped_column(Float, nullable=False)
    tp3: Mapped[float] = mapped_column(Float, nullable=False)
    risk_reward: Mapped[float] = mapped_column(Float, nullable=False)
    regime: Mapped[str] = mapped_column(String(20), nullable=True)
    ceiling_score: Mapped[float] = mapped_column(Float, nullable=True)
    sentiment_score: Mapped[float] = mapped_column(Float, nullable=True)
    indicators: Mapped[dict] = mapped_column(JSON, default=dict)
    timeframe: Mapped[str] = mapped_column(String(10), default="1D")
    status: Mapped[str] = mapped_column(SAEnum(SignalStatus), default=SignalStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_signals_ticker_created", "ticker", "created_at"),
        Index("ix_signals_score", "score"),
        Index("ix_signals_direction_status", "direction", "status"),
    )
