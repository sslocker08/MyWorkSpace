"""ATR-based risk management: stop loss and take profit levels."""
from dataclasses import dataclass
from typing import Optional
import pandas as pd
from core.indicators import atr
from core.config import settings


@dataclass
class RiskLevels:
    entry_price: float
    stop_loss: float
    tp1: float
    tp2: float
    tp3: float
    risk_reward: float  # tp2 / risk as the main R:R metric
    atr_value: float
    position_size_pct: float  # fraction of portfolio


class RiskManager:
    """Calculates ATR-based stop loss, take profit, and position sizing."""

    def calculate(
        self,
        df: pd.DataFrame,
        direction: str,
        portfolio_value: float = 100_000,
    ) -> RiskLevels:
        """
        Calculate risk levels for an entry at current price.

        Args:
            df: OHLCV DataFrame (ascending)
            direction: "LONG" or "SHORT"
            portfolio_value: total portfolio value for position sizing
        """
        entry = float(df["close"].iloc[-1])
        atr_val = float(atr(df["high"], df["low"], df["close"], period=14).iloc[-1])

        if pd.isna(atr_val) or atr_val == 0:
            atr_val = entry * 0.02  # fallback: 2% of price

        sl_dist = atr_val * settings.atr_sl_multiplier
        tp1_dist = atr_val * settings.atr_tp1_multiplier
        tp2_dist = atr_val * settings.atr_tp2_multiplier
        tp3_dist = atr_val * settings.atr_tp3_multiplier

        if direction == "LONG":
            stop_loss = entry - sl_dist
            tp1 = entry + tp1_dist
            tp2 = entry + tp2_dist
            tp3 = entry + tp3_dist
        else:  # SHORT
            stop_loss = entry + sl_dist
            tp1 = entry - tp1_dist
            tp2 = entry - tp2_dist
            tp3 = entry - tp3_dist

        risk_per_share = abs(entry - stop_loss)
        reward_at_tp2 = abs(tp2 - entry)
        risk_reward = reward_at_tp2 / risk_per_share if risk_per_share > 0 else 0

        # Position size: risk 1% of portfolio per trade
        max_risk = portfolio_value * settings.portfolio_risk_pct
        shares = max_risk / risk_per_share if risk_per_share > 0 else 0
        position_value = shares * entry
        position_size_pct = position_value / portfolio_value

        return RiskLevels(
            entry_price=round(entry, 4),
            stop_loss=round(stop_loss, 4),
            tp1=round(tp1, 4),
            tp2=round(tp2, 4),
            tp3=round(tp3, 4),
            risk_reward=round(risk_reward, 2),
            atr_value=round(atr_val, 4),
            position_size_pct=round(position_size_pct, 4),
        )

    def is_valid_setup(self, levels: RiskLevels, min_rr: Optional[float] = None) -> bool:
        """Check if the risk/reward meets minimum threshold.

        Falls back to settings.min_risk_reward when min_rr is not provided so the
        gate stays in sync with the ATR multipliers configured in one place.
        """
        threshold = settings.min_risk_reward if min_rr is None else min_rr
        return levels.risk_reward >= threshold
