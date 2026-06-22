import uuid
from datetime import date, datetime
from sqlalchemy import String, Float, Integer, Boolean, DateTime, Date, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from core.database import Base


class InstitutionalHolding(Base):
    """One row per (manager, ticker, quarter_end). Tracks 13F smart-money positions."""

    __tablename__ = "institutional_holdings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manager_key: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    manager_name: Mapped[str] = mapped_column(String(200), nullable=False)
    manager_cik: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    cusip: Mapped[str] = mapped_column(String(9), nullable=True)
    company_name: Mapped[str] = mapped_column(String(200), nullable=True)
    shares: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    value_usd_thousands: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pct_portfolio: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    is_new_position: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    filing_date: Mapped[date] = mapped_column(Date, nullable=True)
    quarter_end: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("uq_institutional_holding", "manager_cik", "ticker", "quarter_end", unique=True),
        Index("ix_institutional_ticker_quarter", "ticker", "quarter_end"),
    )
