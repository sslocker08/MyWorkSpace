"""Momentum long: RSI > 60, EMA uptrend, MACD positive."""
import pandas as pd
from .base import BaseStrategy, StrategyResult
from core.indicators import rsi, ema, macd, volume_ratio


class MomentumLongStrategy(BaseStrategy):
    name = "momentum_long"

    def evaluate(self, ticker: str, df: pd.DataFrame) -> StrategyResult:
        if len(df) < 50:
            return StrategyResult(name=self.name, triggered=False)

        close = df["close"]
        volume = df["volume"]

        rsi_vals = rsi(close, 14)
        ema50 = ema(close, 50)
        ema20 = ema(close, 20)
        macd_line, signal_line, _ = macd(close)
        vol_ratio = volume_ratio(volume, 20)

        curr_rsi = rsi_vals.iloc[-1]
        curr_close = close.iloc[-1]
        curr_ema50 = ema50.iloc[-1]
        curr_ema20 = ema20.iloc[-1]
        curr_macd = macd_line.iloc[-1]
        curr_vol_ratio = vol_ratio.iloc[-1]

        # Conditions
        rsi_strong = 60 <= curr_rsi <= 75  # Strong but not overbought
        ema_uptrend = curr_close > curr_ema20 > curr_ema50
        macd_positive = curr_macd > 0
        vol_above_avg = curr_vol_ratio >= 1.0

        if rsi_strong and ema_uptrend and macd_positive and vol_above_avg:
            confidence = min((curr_rsi - 60) / 15 * 0.4 + 0.6, 1.0)
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="LONG",
                confidence=confidence,
                reason=f"Momentum LONG: RSI={curr_rsi:.1f}, MACD>{0:.2f}, above EMA20/50",
                indicators={
                    "rsi": curr_rsi,
                    "macd": curr_macd,
                    "ema20": curr_ema20,
                    "ema50": curr_ema50,
                    "vol_ratio": curr_vol_ratio,
                },
            )

        return StrategyResult(name=self.name, triggered=False)
