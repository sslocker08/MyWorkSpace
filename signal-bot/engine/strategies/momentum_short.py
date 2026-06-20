"""Momentum short: RSI 25-40 (weak/falling), EMA downtrend, MACD negative.

Mirror of momentum_long. momentum_long fires LONG on RSI 60-75 with
close > EMA20 > EMA50 and MACD > 0. This fires SHORT on the symmetric weak side:
RSI in 25-40 (falling but not yet in the deep-oversold zone where a mean-reversion
bounce becomes likely), close < EMA20 < EMA50 (downtrend stack), MACD < 0, and
volume at or above its average. The RSI band width (15 points) matches
momentum_long's 60-75 band so the pair is symmetric by construction.
"""
import pandas as pd
from .base import BaseStrategy, StrategyResult
from core.indicators import rsi, ema, macd, volume_ratio


class MomentumShortStrategy(BaseStrategy):
    name = "momentum_short"

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

        # Guard against NaN at the evaluation point.
        if (
            pd.isna(curr_rsi)
            or pd.isna(curr_close)
            or pd.isna(curr_ema50)
            or pd.isna(curr_ema20)
            or pd.isna(curr_macd)
            or pd.isna(curr_vol_ratio)
        ):
            return StrategyResult(name=self.name, triggered=False)

        # Conditions (mirror of momentum_long).
        rsi_weak = 25 <= curr_rsi <= 40  # weak/falling, not yet oversold-bounce
        ema_downtrend = curr_close < curr_ema20 < curr_ema50
        macd_negative = curr_macd < 0
        vol_above_avg = curr_vol_ratio >= 1.0

        if rsi_weak and ema_downtrend and macd_negative and vol_above_avg:
            # Lower RSI (closer to 25) -> stronger downward momentum -> higher
            # confidence. Mirror of momentum_long's (rsi-60)/15 mapping.
            confidence = min((40 - curr_rsi) / 15 * 0.4 + 0.6, 1.0)
            confidence = max(0.0, confidence)
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="SHORT",
                confidence=confidence,
                reason=f"Momentum SHORT: RSI={curr_rsi:.1f}, MACD<{0:.2f}, below EMA20/50",
                indicators={
                    "rsi": curr_rsi,
                    "macd": curr_macd,
                    "ema20": curr_ema20,
                    "ema50": curr_ema50,
                    "vol_ratio": curr_vol_ratio,
                },
            )

        return StrategyResult(name=self.name, triggered=False)
