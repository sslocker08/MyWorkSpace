"""ADX strong-trend with a Directional-Index crossover.

Bidirectional. Fires only when ADX > 30 (a genuinely STRONG trend, not chop) AND
the directional indices cross on the final bar:
  * +DI crossing ABOVE -DI -> LONG (bullish directional shift inside a strong trend)
  * -DI crossing ABOVE +DI -> SHORT (bearish directional shift)
We additionally confirm the EMA(20) slope agrees with the cross direction, so we
do not take a +DI cross while price structure is still rolling over. Direction is
set by the cross so the long/short pair is symmetric by construction.
"""
import pandas as pd
from .base import BaseStrategy, StrategyResult
from core.indicators import adx, ema


class ADXTrendStrategy(BaseStrategy):
    name = "adx_trend"

    ADX_FLOOR = 30.0
    EMA_PERIOD = 20

    def evaluate(self, ticker: str, df: pd.DataFrame) -> StrategyResult:
        # ADX(14) needs ~2*period to stabilise; require a comfortable buffer.
        if len(df) < 60:
            return StrategyResult(name=self.name, triggered=False)

        close = df["close"]
        high = df["high"]
        low = df["low"]

        adx_vals, plus_di, minus_di = adx(high, low, close, 14)
        ema20 = ema(close, self.EMA_PERIOD)

        curr_adx = adx_vals.iloc[-1]
        curr_plus = plus_di.iloc[-1]
        prev_plus = plus_di.iloc[-2]
        curr_minus = minus_di.iloc[-1]
        prev_minus = minus_di.iloc[-2]
        curr_ema = ema20.iloc[-1]
        prev_ema = ema20.iloc[-2]

        if any(
            pd.isna(v)
            for v in (
                curr_adx,
                curr_plus,
                prev_plus,
                curr_minus,
                prev_minus,
                curr_ema,
                prev_ema,
            )
        ):
            return StrategyResult(name=self.name, triggered=False)

        strong_trend = curr_adx > self.ADX_FLOOR
        bull_cross = (prev_plus <= prev_minus) and (curr_plus > curr_minus)
        bear_cross = (prev_minus <= prev_plus) and (curr_minus > curr_plus)
        ema_rising = curr_ema > prev_ema
        ema_falling = curr_ema < prev_ema

        if strong_trend and bull_cross and ema_rising:
            confidence = self._confidence(curr_adx, curr_plus, curr_minus)
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="LONG",
                confidence=confidence,
                reason=(
                    f"ADX={curr_adx:.1f}>30, +DI crossed above -DI "
                    f"({curr_plus:.1f}>{curr_minus:.1f}), EMA rising"
                ),
                indicators={
                    "adx": float(curr_adx),
                    "plus_di": float(curr_plus),
                    "minus_di": float(curr_minus),
                },
            )

        if strong_trend and bear_cross and ema_falling:
            confidence = self._confidence(curr_adx, curr_minus, curr_plus)
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="SHORT",
                confidence=confidence,
                reason=(
                    f"ADX={curr_adx:.1f}>30, -DI crossed above +DI "
                    f"({curr_minus:.1f}>{curr_plus:.1f}), EMA falling"
                ),
                indicators={
                    "adx": float(curr_adx),
                    "plus_di": float(curr_plus),
                    "minus_di": float(curr_minus),
                },
            )

        return StrategyResult(name=self.name, triggered=False)

    @staticmethod
    def _confidence(curr_adx: float, dom_di: float, weak_di: float) -> float:
        """Stronger ADX and a wider DI spread -> higher conviction."""
        adx_term = min((curr_adx - 30.0) / 40.0, 1.0)  # 0 at 30, 1 at 70
        spread_term = min((dom_di - weak_di) / 30.0, 1.0)
        confidence = 0.5 + adx_term * 0.25 + spread_term * 0.25
        return max(0.0, min(confidence, 1.0))
