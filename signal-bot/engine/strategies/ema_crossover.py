"""EMA 9/21 crossover strategy with volume confirmation."""
import pandas as pd
from .base import BaseStrategy, StrategyResult
from core.indicators import ema, volume_ratio


class EMACrossoverStrategy(BaseStrategy):
    name = "ema_crossover"

    def evaluate(self, ticker: str, df: pd.DataFrame) -> StrategyResult:
        if len(df) < 30:
            return StrategyResult(name=self.name, triggered=False)

        close = df["close"]
        volume = df["volume"]

        ema9 = ema(close, 9)
        ema21 = ema(close, 21)
        vol_ratio = volume_ratio(volume, 20)

        # Current and previous values
        curr_ema9 = ema9.iloc[-1]
        prev_ema9 = ema9.iloc[-2]
        curr_ema21 = ema21.iloc[-1]
        prev_ema21 = ema21.iloc[-2]
        curr_vol_ratio = vol_ratio.iloc[-1]

        # Bullish crossover: EMA9 crosses above EMA21
        golden_cross = (prev_ema9 <= prev_ema21) and (curr_ema9 > curr_ema21)
        # Death cross: EMA9 crosses below EMA21
        death_cross = (prev_ema9 >= prev_ema21) and (curr_ema9 < curr_ema21)

        vol_confirmed = curr_vol_ratio >= 1.3

        if golden_cross and vol_confirmed:
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="LONG",
                confidence=min(0.5 + (curr_vol_ratio - 1) * 0.2, 1.0),
                reason=f"EMA9 crossed above EMA21, vol_ratio={curr_vol_ratio:.2f}",
                indicators={"ema9": curr_ema9, "ema21": curr_ema21, "vol_ratio": curr_vol_ratio},
            )
        if death_cross and vol_confirmed:
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="SHORT",
                confidence=min(0.5 + (curr_vol_ratio - 1) * 0.2, 1.0),
                reason=f"EMA9 crossed below EMA21, vol_ratio={curr_vol_ratio:.2f}",
                indicators={"ema9": curr_ema9, "ema21": curr_ema21, "vol_ratio": curr_vol_ratio},
            )

        return StrategyResult(name=self.name, triggered=False)
