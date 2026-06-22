"""LLM Intelligence Engine — Claude API for earnings analysis and signal digests.

Uses claude-haiku-4-5-20251001 (low cost, fast) for batch earnings processing.
Uses cache_control for repeated system prompts (cost optimization).
Never raises: all methods are best-effort, degrade to empty string / None on failure.

ported from: anthropic SDK async usage patterns (anthropic>=0.30)
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Optional

from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)


@dataclass
class EarningsInsight:
    ticker: str
    sentiment: str           # "POSITIVE" / "NEGATIVE" / "NEUTRAL"
    surprise_magnitude: str  # "LARGE" / "MODERATE" / "SMALL"
    key_themes: list[str]    # top 3 themes from transcript
    entry_bias: str          # "LONG" / "SHORT" / "WAIT"
    confidence: float        # 0.0-1.0


@dataclass
class DailyDigest:
    ceiling_score: float
    regime: str
    top_signals: list[dict]   # [{ticker, direction, score}, ...]
    macro_summary: str        # 2-3 sentence summary
    risk_warnings: list[str]


# Stable system prompts — never change between calls so cache_control fires.
_EARNINGS_SYSTEM = (
    "You are a quantitative trading analyst specializing in earnings analysis. "
    "Analyze earnings transcripts and news objectively. "
    "Always respond with valid JSON matching the requested schema exactly. "
    "Do not include markdown code fences or extra commentary."
)

_DIGEST_SYSTEM = (
    "You are a quantitative trading analyst providing daily market digests. "
    "Summarize market conditions concisely for traders. "
    "Focus on actionable insights and concrete risk factors. "
    "Keep macro_summary to 2-3 sentences. List risk_warnings as short bullet phrases."
)

_SENTIMENT_SYSTEM = (
    "You are a financial news sentiment classifier. "
    "Respond with only a single float between -1.0 (very negative) "
    "and 1.0 (very positive). No other text."
)


class IntelligenceEngine:
    """Claude-powered intelligence layer for earnings and daily digests."""

    def __init__(self, api_key: str) -> None:
        self._client = AsyncAnthropic(api_key=api_key)
        self._model = "claude-haiku-4-5-20251001"

    async def analyze_earnings_text(
        self, ticker: str, text: str
    ) -> Optional[EarningsInsight]:
        """Analyze earnings transcript/news text. Returns None on failure."""
        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=512,
                system=[
                    {
                        "type": "text",
                        "text": _EARNINGS_SYSTEM,
                        # cache_control: stable system prompt — hits cache on repeated calls
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Analyze this earnings text for {ticker}. "
                            "Return JSON: {\"sentiment\": \"POSITIVE|NEGATIVE|NEUTRAL\", "
                            "\"surprise_magnitude\": \"LARGE|MODERATE|SMALL\", "
                            "\"key_themes\": [\"theme1\", \"theme2\", \"theme3\"], "
                            "\"entry_bias\": \"LONG|SHORT|WAIT\", "
                            "\"confidence\": 0.0-1.0}"
                            f"\n\nText: {text[:2000]}"
                        ),
                    }
                ],
            )
            raw = response.content[0].text.strip()
            data = json.loads(raw)
            return EarningsInsight(
                ticker=ticker,
                sentiment=str(data.get("sentiment", "NEUTRAL")).upper(),
                surprise_magnitude=str(data.get("surprise_magnitude", "SMALL")).upper(),
                key_themes=list(data.get("key_themes", []))[:3],
                entry_bias=str(data.get("entry_bias", "WAIT")).upper(),
                confidence=float(data.get("confidence", 0.0)),
            )
        except json.JSONDecodeError as e:
            logger.warning(
                "IntelligenceEngine.analyze_earnings_text JSON parse error for %s: %s",
                ticker, e,
            )
            return None
        except Exception as e:
            logger.warning(
                "IntelligenceEngine.analyze_earnings_text failed for %s: %s",
                ticker, e,
            )
            return None

    async def generate_daily_digest(
        self,
        ceiling_score: float,
        regime: str,
        top_signals: list[dict],
    ) -> DailyDigest:
        """Generate a daily market digest. Returns minimal digest on failure."""
        try:
            signals_text = "\n".join(
                f"  - {s.get('ticker', '?')}: {s.get('direction', '?')} "
                f"score={s.get('score', 0):.1f}"
                for s in top_signals[:5]
            )
            prompt = (
                f"Market ceiling score: {ceiling_score:.1f}/100 (higher = more top-risk)\n"
                f"Market regime: {regime}\n"
                f"Top signals:\n{signals_text or '  (none)'}\n\n"
                "Provide:\n"
                "1. macro_summary: 2-3 sentence market overview\n"
                "2. risk_warnings: list of 2-4 short risk factors\n\n"
                "Format your response as:\n"
                "SUMMARY: <2-3 sentences>\n"
                "RISKS:\n- <risk 1>\n- <risk 2>\n- <risk 3>"
            )
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=512,
                system=[
                    {
                        "type": "text",
                        "text": _DIGEST_SYSTEM,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text.strip()
            macro_summary, risk_warnings = _parse_digest_response(raw)
            return DailyDigest(
                ceiling_score=ceiling_score,
                regime=regime,
                top_signals=list(top_signals[:5]),
                macro_summary=macro_summary,
                risk_warnings=risk_warnings,
            )
        except Exception as e:
            logger.warning("IntelligenceEngine.generate_daily_digest failed: %s", e)
            return DailyDigest(
                ceiling_score=ceiling_score,
                regime=regime,
                top_signals=list(top_signals[:5]),
                macro_summary="Market digest unavailable.",
                risk_warnings=[],
            )

    async def classify_news_sentiment(self, ticker: str, headline: str) -> float:
        """Quick news headline sentiment [-1.0, +1.0]. Returns 0.0 on failure."""
        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=64,
                system=[
                    {
                        "type": "text",
                        "text": _SENTIMENT_SYSTEM,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Ticker: {ticker}\n"
                            f"Headline: {headline[:500]}\n"
                            "Sentiment score:"
                        ),
                    }
                ],
            )
            raw = response.content[0].text.strip()
            score = float(raw)
            return max(-1.0, min(1.0, score))
        except (ValueError, TypeError) as e:
            logger.warning(
                "IntelligenceEngine.classify_news_sentiment parse error for %s: %s",
                ticker, e,
            )
            return 0.0
        except Exception as e:
            logger.warning(
                "IntelligenceEngine.classify_news_sentiment failed for %s: %s",
                ticker, e,
            )
            return 0.0


def _parse_digest_response(text: str) -> tuple[str, list[str]]:
    """Parse plain-text digest response into (macro_summary, risk_warnings)."""
    macro_summary = ""
    risk_warnings: list[str] = []

    lines = text.splitlines()
    in_risks = False

    for line in lines:
        stripped = line.strip()
        if stripped.upper().startswith("SUMMARY:"):
            macro_summary = stripped[len("SUMMARY:"):].strip()
            in_risks = False
        elif stripped.upper().startswith("RISKS:"):
            in_risks = True
        elif in_risks and stripped.startswith("-"):
            item = stripped[1:].strip()
            if item:
                risk_warnings.append(item)
        elif not in_risks and not macro_summary and stripped:
            # Fallback: first non-empty line becomes the summary
            macro_summary = stripped

    if not macro_summary:
        macro_summary = text[:300].strip()

    return macro_summary, risk_warnings


# Module-level singleton — lazily initialized by routes
_instance: Optional[IntelligenceEngine] = None


def get_intelligence_engine(api_key: str) -> IntelligenceEngine:
    """Return a cached IntelligenceEngine instance."""
    global _instance
    if _instance is None:
        _instance = IntelligenceEngine(api_key=api_key)
    return _instance
