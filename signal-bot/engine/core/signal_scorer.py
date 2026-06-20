"""Signal scoring engine: 0-100 composite score with ceiling adjustment."""
from dataclasses import dataclass
from typing import Optional
import pandas as pd
from core.indicators import adx, volume_ratio, rsi


@dataclass
class ScoreBreakdown:
    strategy_hits: float     # max 30
    trend_strength: float    # max 15
    volume_confirm: float    # max 10
    risk_reward: float       # max 10
    sentiment: float         # max 5
    ceiling_adjustment: float  # multiplier effect
    total: float             # 0-100


class SignalScorer:
    """Compute composite signal score from strategies + indicators + ceiling."""

    def score(
        self,
        ticker: str,
        df: pd.DataFrame,
        direction: str,
        triggered_strategies: list[str],
        strategy_confidences: dict[str, float],
        risk_reward: float,
        ceiling_score: float = 50.0,
        sentiment_score: float = 0.0,
        regime: str = "NEUTRAL",
    ) -> ScoreBreakdown:
        """
        Compute composite signal score.

        Args:
            df: OHLCV DataFrame
            direction: "LONG" or "SHORT"
            triggered_strategies: list of strategy names that fired
            strategy_confidences: {strategy_name: 0-1 confidence}
            risk_reward: risk/reward ratio
            ceiling_score: 0-100, high = market top risk
            sentiment_score: -1 to +1 (positive = bullish)
        """
        # 1. Strategy hits (max 30 points)
        n = len(triggered_strategies)
        strategy_score = min(n * 10, 30)
        # Bonus for high confidence strategies
        avg_confidence = (
            sum(strategy_confidences.get(s, 0.5) for s in triggered_strategies) / n
            if n > 0 else 0
        )
        strategy_score = strategy_score * (0.7 + avg_confidence * 0.3)

        # 2. Trend strength via ADX (max 15 points)
        try:
            adx_vals, _, _ = adx(df["high"], df["low"], df["close"], 14)
            curr_adx = float(adx_vals.iloc[-1])
            trend_score = min(max((curr_adx - 20) / 20, 0) * 15, 15) if not pd.isna(curr_adx) else 0
        except Exception:
            curr_adx = 0
            trend_score = 0

        # 3. Volume confirmation (max 10 points)
        try:
            vol_ratio = volume_ratio(df["volume"], 20).iloc[-1]
            vol_score = min(max(vol_ratio - 0.8, 0) / 1.2 * 10, 10) if not pd.isna(vol_ratio) else 0
        except Exception:
            vol_score = 0

        # 4. Risk/Reward (max 10 points)
        rr_score = min(max((risk_reward - 1.0) / 1.0 * 10, 0), 10)

        # 5. Sentiment alignment (max 5 points)
        direction_factor = 1.0 if direction == "LONG" else -1.0
        sent_aligned = sentiment_score * direction_factor
        sentiment_pts = min(max(sent_aligned * 5, 0), 5)

        raw_score = strategy_score + trend_score + vol_score + rr_score + sentiment_pts

        # 6. Ceiling score adjustment (market regime awareness)
        is_long = direction == "LONG"
        if ceiling_score > 70:  # 天井圏 — heavy penalty for LONG
            multiplier = 0.5 if is_long else 1.3
        elif ceiling_score > 40:  # 警戒圏
            multiplier = 0.75 if is_long else 1.1
        else:  # 安全圏
            multiplier = 1.0 if is_long else 0.9  # slightly reduce SHORT in bull market

        # Regime bonus
        if regime == "BULL" and is_long:
            multiplier *= 1.1
        elif regime == "BEAR" and not is_long:
            multiplier *= 1.1

        final_score = min(round(raw_score * multiplier, 1), 100.0)

        return ScoreBreakdown(
            strategy_hits=round(strategy_score, 1),
            trend_strength=round(trend_score, 1),
            volume_confirm=round(vol_score, 1),
            risk_reward=round(rr_score, 1),
            sentiment=round(sentiment_pts, 1),
            ceiling_adjustment=round(multiplier, 3),
            total=final_score,
        )
