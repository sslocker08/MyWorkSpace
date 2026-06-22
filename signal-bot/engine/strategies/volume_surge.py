"""Abnormal-volume surge with directional price move.

Bidirectional. Fires when the day's volume z-score exceeds 3 (a genuinely
abnormal spike vs the trailing 20-bar distribution), with direction set by the
bar's own price move: an up day -> LONG, a down day -> SHORT. A volume spike on
its own is directionless; pairing it with the sign of the day's return gives a
participation-confirmed directional signal that is symmetric by construction.
"""
import pandas as pd
from .base import BaseStrategy, StrategyResult
from core.indicators import volume_zscore


class VolumeSurgeStrategy(BaseStrategy):
    name = "volume_surge"

    Z_FLOOR = 3.0
    VOL_PERIOD = 20

    def evaluate(self, ticker: str, df: pd.DataFrame) -> StrategyResult:
        # Need the rolling window plus a buffer; std() needs >=2 points.
        if len(df) < self.VOL_PERIOD + 5:
            return StrategyResult(name=self.name, triggered=False)

        close = df["close"]
        open_ = df["open"]
        volume = df["volume"]

        zscore = volume_zscore(volume, self.VOL_PERIOD)
        curr_z = zscore.iloc[-1]
        curr_close = close.iloc[-1]
        curr_open = open_.iloc[-1]

        if pd.isna(curr_z) or pd.isna(curr_close) or pd.isna(curr_open):
            return StrategyResult(name=self.name, triggered=False)

        abnormal_volume = curr_z > self.Z_FLOOR
        up_day = curr_close > curr_open
        down_day = curr_close < curr_open

        if abnormal_volume and (up_day or down_day):
            direction = "LONG" if up_day else "SHORT"
            move_pct = abs(curr_close - curr_open) / curr_open if curr_open else 0.0
            # More extreme volume and a larger move -> higher conviction.
            z_term = min((curr_z - self.Z_FLOOR) / 5.0, 1.0)
            move_term = min(move_pct / 0.05, 1.0)
            confidence = max(0.0, min(0.5 + z_term * 0.3 + move_term * 0.2, 1.0))
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction=direction,
                confidence=confidence,
                reason=(
                    f"Volume surge z={curr_z:.1f}>3 on a "
                    f"{'up' if up_day else 'down'} day ({move_pct:.1%})"
                ),
                indicators={
                    "volume_zscore": float(curr_z),
                    "move_pct": float(move_pct),
                    "up_day": bool(up_day),
                },
            )

        return StrategyResult(name=self.name, triggered=False)
