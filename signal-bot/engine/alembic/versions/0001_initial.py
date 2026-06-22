"""Initial schema: signals, market_intelligence_snapshots, jp_signals_snapshots,
universe_cache, backtest_results — and the partial unique index on signals that
create_tables() creates only on a fresh DB (KL-6 resolution: this migration
ensures the index also exists on pre-existing deployments).

Revision ID: 0001
Revises:
Create Date: 2026-06-20
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "signals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("market", sa.Enum("US", "JP", "ETF", name="market"), nullable=False),
        sa.Column("sector", sa.String(100), nullable=True),
        sa.Column("direction", sa.Enum("LONG", "SHORT", name="direction"), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("strategy_hits", sa.JSON(), nullable=True),
        sa.Column("entry_price", sa.Float(), nullable=False),
        sa.Column("stop_loss", sa.Float(), nullable=False),
        sa.Column("tp1", sa.Float(), nullable=False),
        sa.Column("tp2", sa.Float(), nullable=False),
        sa.Column("tp3", sa.Float(), nullable=False),
        sa.Column("risk_reward", sa.Float(), nullable=False),
        sa.Column("regime", sa.String(20), nullable=True),
        sa.Column("ceiling_score", sa.Float(), nullable=True),
        sa.Column("sentiment_score", sa.Float(), nullable=True),
        sa.Column("indicators", sa.JSON(), nullable=True),
        sa.Column("timeframe", sa.String(10), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "ACTIVE", "HIT_TP1", "HIT_TP2", "HIT_TP3", "HIT_SL", "EXPIRED",
                name="signalstatus",
            ),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_signals_ticker", "signals", ["ticker"])
    op.create_index("ix_signals_created_at", "signals", ["created_at"])
    op.create_index("ix_signals_ticker_created", "signals", ["ticker", "created_at"])
    op.create_index("ix_signals_score", "signals", ["score"])
    op.create_index("ix_signals_direction_status", "signals", ["direction", "status"])
    # KL-6 fix: partial unique index — only one ACTIVE signal per (ticker, direction,
    # timeframe). create_tables() creates this on fresh DBs; this migration adds it to
    # pre-existing deployments via expand/contract pattern.
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_active_signal
        ON signals (ticker, direction, timeframe)
        WHERE status = 'ACTIVE'
        """
    )

    op.create_table(
        "market_intelligence_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ceiling_score", sa.Float(), nullable=False),
        sa.Column("breakdown", sa.JSON(), nullable=True),
        sa.Column("baa_bull_bear", sa.Float(), nullable=True),
        sa.Column("aaii_bull_pct", sa.Float(), nullable=True),
        sa.Column("put_call_5d", sa.Float(), nullable=True),
        sa.Column("fear_greed_score", sa.Float(), nullable=True),
        sa.Column("margin_debt_yoy", sa.Float(), nullable=True),
        sa.Column("distribution_days", sa.Integer(), nullable=True),
        sa.Column("vix_m1_m2_spread", sa.Float(), nullable=True),
        sa.Column("hindenburg_omen", sa.Boolean(), nullable=True),
        sa.Column("sector_rotation_signal", sa.Float(), nullable=True),
        sa.Column("semi_book_to_bill", sa.Float(), nullable=True),
        sa.Column("computed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_market_intelligence_snapshots_computed_at",
        "market_intelligence_snapshots",
        ["computed_at"],
    )

    op.create_table(
        "jp_signals_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("shinyo_hyoka", sa.Float(), nullable=True),
        sa.Column("toraku_25d", sa.Float(), nullable=True),
        sa.Column("karauri_ratio", sa.Float(), nullable=True),
        sa.Column("shinyo_bairitu", sa.Float(), nullable=True),
        sa.Column("nikkei_vi", sa.Float(), nullable=True),
        sa.Column("computed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_jp_signals_snapshots_computed_at",
        "jp_signals_snapshots",
        ["computed_at"],
    )

    op.create_table(
        "universe_cache",
        sa.Column("ticker", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("sector", sa.String(), nullable=True),
        sa.Column("market_cap", sa.Float(), nullable=True),
        sa.Column("avg_volume", sa.Float(), nullable=True),
        sa.Column("market", sa.String(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("ticker"),
    )

    op.create_table(
        "backtest_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("strategy", sa.String(), nullable=False),
        sa.Column("ticker", sa.String(), nullable=True),
        sa.Column("win_rate", sa.Float(), nullable=True),
        sa.Column("avg_return", sa.Float(), nullable=True),
        sa.Column("sharpe", sa.Float(), nullable=True),
        sa.Column("max_drawdown", sa.Float(), nullable=True),
        sa.Column("total_trades", sa.Integer(), nullable=True),
        sa.Column("computed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_backtest_results_strategy", "backtest_results", ["strategy"])
    op.create_index("ix_backtest_results_ticker", "backtest_results", ["ticker"])


def downgrade() -> None:
    op.drop_table("backtest_results")
    op.drop_table("universe_cache")
    op.drop_table("jp_signals_snapshots")
    op.drop_table("market_intelligence_snapshots")
    op.drop_index("uq_active_signal", table_name="signals")
    op.drop_index("ix_signals_direction_status", table_name="signals")
    op.drop_index("ix_signals_score", table_name="signals")
    op.drop_index("ix_signals_ticker_created", table_name="signals")
    op.drop_index("ix_signals_created_at", table_name="signals")
    op.drop_index("ix_signals_ticker", table_name="signals")
    op.drop_table("signals")
    op.execute("DROP TYPE IF EXISTS signalstatus")
    op.execute("DROP TYPE IF EXISTS direction")
    op.execute("DROP TYPE IF EXISTS market")
