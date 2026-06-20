"""Signal scoring engine: 0-100 composite score with ceiling + regime adjustment."""
from dataclasses import dataclass
from typing import Optional
import pandas as pd
from core.indicators import adx, volume_ratio, rsi


# ---------------------------------------------------------------------------
# Regime -> strategy thesis (per llm-context-engineering-repo: document the WHY)
# ---------------------------------------------------------------------------
# The HMM regime detector (core/market_regime.py) emits BULL / BEAR / NEUTRAL /
# HIGH_VOL. A market regime does not help or hurt a signal uniformly — it helps
# or hurts depending on WHAT KIND of edge the signal is exploiting:
#
#   * TREND-FOLLOWING strategies (breakouts, momentum, MA/MACD/ADX crosses,
#     volume surges) make money when a directional move PERSISTS. They thrive in
#     a clean BULL/BEAR trend aligned with their direction, and they get chopped
#     up (whipsawed) in range-bound (NEUTRAL) or violent (HIGH_VOL) tape.
#
#   * MEAN-REVERSION strategies (reversals, Bollinger squeeze, RSI divergence)
#     make money when price OVERSHOOTS and snaps back. They work best in
#     range-bound (NEUTRAL) tape and are weaker when a strong trend keeps running
#     (the "reversion" never comes, or comes late).
#
# So the regime multiplier below is a function of BOTH (a) the dominant category
# of the triggered strategies and (b) the trade direction relative to the regime:
#   - reward a trend signal that goes WITH the regime's direction,
#   - penalize a trend signal that FIGHTS the regime (don't fight the trend),
#   - in NEUTRAL favor reversion / discount trend (whipsaw risk),
#   - in HIGH_VOL defend: discount trend hard (unreliable breakouts) and only
#     mildly trust reversion (volatility is still dangerous), both directions.
# Unknown / missing regime is a no-op (x1.0) so a data outage cannot distort the
# score. These factors stack ON TOP of the existing ceiling multiplier; the final
# score is still clamped to [0, 100].

# Trend-following strategy names (directional-persistence edge).
TREND_STRATEGIES = frozenset({
    "ema_crossover",
    "momentum_long",
    "momentum_short",
    "breakout_long",
    "breakout_short",
    "macd_signal",
    "adx_trend",
    "volume_surge",
})

# Mean-reversion strategy names (overshoot-and-snap-back edge).
MEAN_REVERSION_STRATEGIES = frozenset({
    "reversal_long",
    "reversal_short",
    "bollinger_squeeze",
    "rsi_divergence",
})


@dataclass
class ScoreBreakdown:
    strategy_hits: float     # max 30
    trend_strength: float    # max 15
    volume_confirm: float    # max 10
    risk_reward: float       # max 10
    sentiment: float         # max 5
    ceiling_adjustment: float  # ceiling (market-top) multiplier effect
    regime_adjustment: float   # regime-aware multiplier effect
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

        # 6. Ceiling score adjustment (market-top risk)
        is_long = direction == "LONG"
        if ceiling_score > 70:  # 天井圏 — heavy penalty for LONG
            ceiling_multiplier = 0.5 if is_long else 1.3
        elif ceiling_score > 40:  # 警戒圏
            ceiling_multiplier = 0.75 if is_long else 1.1
        else:  # 安全圏
            ceiling_multiplier = 1.0 if is_long else 0.9  # slightly reduce SHORT in bull market

        # 7. Regime-aware adjustment (stacks ON TOP of the ceiling multiplier).
        regime_multiplier = self._regime_multiplier(regime, triggered_strategies, is_long)

        multiplier = ceiling_multiplier * regime_multiplier
        # raw_score is non-negative, so the lower bound is naturally >= 0; the
        # explicit min() clamps the upper bound to 100. max(.., 0.0) is defensive.
        final_score = max(min(round(raw_score * multiplier, 1), 100.0), 0.0)

        return ScoreBreakdown(
            strategy_hits=round(strategy_score, 1),
            trend_strength=round(trend_score, 1),
            volume_confirm=round(vol_score, 1),
            risk_reward=round(rr_score, 1),
            sentiment=round(sentiment_pts, 1),
            ceiling_adjustment=round(ceiling_multiplier, 3),
            regime_adjustment=round(regime_multiplier, 3),
            total=final_score,
        )

    @staticmethod
    def _dominant_category(triggered_strategies: list[str]) -> str:
        """Return "trend" or "mean_reversion" — whichever set holds the MAJORITY
        of the triggered strategies. Ties (equal counts, incl. the empty list)
        resolve to "trend" per the design (trend is the conservative default for
        this engine, which is dominated by trend strategies).

        Strategies in neither set are ignored for the majority vote.
        """
        trend = sum(1 for s in triggered_strategies if s in TREND_STRATEGIES)
        reversion = sum(1 for s in triggered_strategies if s in MEAN_REVERSION_STRATEGIES)
        return "mean_reversion" if reversion > trend else "trend"

    @classmethod
    def _regime_multiplier(
        cls, regime: str, triggered_strategies: list[str], is_long: bool
    ) -> float:
        """Regime-aware multiplier from BOTH the dominant strategy category AND
        the trade direction. See the module-level thesis for the WHY.

        Unknown / missing regime -> 1.0 (no-op, safe default).
        """
        category = cls._dominant_category(triggered_strategies)
        is_trend = category == "trend"

        if regime == "BULL":
            if is_trend:
                # WITH the uptrend = reward; AGAINST = penalize (don't fight it).
                return 1.10 if is_long else 0.85
            return 0.95  # reversion weaker in a strong trend
        if regime == "BEAR":
            if is_trend:
                return 1.10 if not is_long else 0.85
            return 0.95
        if regime == "NEUTRAL":
            # Range-bound / choppy: favor reversion, discount trend (whipsaw).
            return 0.90 if is_trend else 1.10
        if regime == "HIGH_VOL":
            # Defensive regime — applies to BOTH directions. Trend breakouts are
            # unreliable (whipsaw); reversion only slightly favored, vol risky.
            return 0.80 if is_trend else 0.95
        # Unknown / missing regime: no-op.
        return 1.0
