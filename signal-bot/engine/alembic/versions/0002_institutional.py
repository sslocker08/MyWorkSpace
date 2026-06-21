"""Add institutional_holdings table for 13F coattail tracking.

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "institutional_holdings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("manager_key", sa.String(50), nullable=False),
        sa.Column("manager_name", sa.String(200), nullable=False),
        sa.Column("manager_cik", sa.String(20), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("cusip", sa.String(9), nullable=True),
        sa.Column("company_name", sa.String(200), nullable=True),
        sa.Column("shares", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("value_usd_thousands", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("pct_portfolio", sa.Float(), nullable=False, server_default="0"),
        sa.Column("is_new_position", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("filing_date", sa.Date(), nullable=True),
        sa.Column("quarter_end", sa.Date(), nullable=False),
        sa.Column("fetched_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_institutional_manager_key", "institutional_holdings", ["manager_key"])
    op.create_index("ix_institutional_manager_cik", "institutional_holdings", ["manager_cik"])
    op.create_index("ix_institutional_ticker", "institutional_holdings", ["ticker"])
    op.create_index("ix_institutional_quarter_end", "institutional_holdings", ["quarter_end"])
    op.create_index(
        "ix_institutional_ticker_quarter",
        "institutional_holdings",
        ["ticker", "quarter_end"],
    )
    op.create_unique_constraint(
        "uq_institutional_holding",
        "institutional_holdings",
        ["manager_cik", "ticker", "quarter_end"],
    )


def downgrade() -> None:
    op.drop_table("institutional_holdings")
