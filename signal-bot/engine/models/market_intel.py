import uuid
from datetime import datetime
from sqlalchemy import Float, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class MarketIntelSnapshot(Base):
    __tablename__ = "market_intelligence_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ceiling_score: Mapped[float] = mapped_column(Float, nullable=False)
    breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    baa_bull_bear: Mapped[float] = mapped_column(Float, nullable=True)
    aaii_bull_pct: Mapped[float] = mapped_column(Float, nullable=True)
    put_call_5d: Mapped[float] = mapped_column(Float, nullable=True)
    fear_greed_score: Mapped[float] = mapped_column(Float, nullable=True)
    margin_debt_yoy: Mapped[float] = mapped_column(Float, nullable=True)
    distribution_days: Mapped[int] = mapped_column(nullable=True)
    vix_m1_m2_spread: Mapped[float] = mapped_column(Float, nullable=True)
    hindenburg_omen: Mapped[bool] = mapped_column(nullable=True)
    sector_rotation_signal: Mapped[float] = mapped_column(Float, nullable=True)
    semi_book_to_bill: Mapped[float] = mapped_column(Float, nullable=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class JPSignalSnapshot(Base):
    __tablename__ = "jp_signals_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shinyo_hyoka: Mapped[float] = mapped_column(Float, nullable=True)
    toraku_25d: Mapped[float] = mapped_column(Float, nullable=True)
    karauri_ratio: Mapped[float] = mapped_column(Float, nullable=True)
    shinyo_bairitu: Mapped[float] = mapped_column(Float, nullable=True)
    nikkei_vi: Mapped[float] = mapped_column(Float, nullable=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class UniverseCache(Base):
    __tablename__ = "universe_cache"

    ticker: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=True)
    sector: Mapped[str] = mapped_column(nullable=True)
    market_cap: Mapped[float] = mapped_column(Float, nullable=True)
    avg_volume: Mapped[float] = mapped_column(Float, nullable=True)
    market: Mapped[str] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BacktestResult(Base):
    __tablename__ = "backtest_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    strategy: Mapped[str] = mapped_column(nullable=False, index=True)
    ticker: Mapped[str] = mapped_column(nullable=True, index=True)
    win_rate: Mapped[float] = mapped_column(Float, nullable=True)
    avg_return: Mapped[float] = mapped_column(Float, nullable=True)
    sharpe: Mapped[float] = mapped_column(Float, nullable=True)
    max_drawdown: Mapped[float] = mapped_column(Float, nullable=True)
    total_trades: Mapped[int] = mapped_column(nullable=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
