"""Multi-source sentiment collection: StockTwits + Reddit PRAW + Yahoo JP board.

Sources
-------
StockTwits : GET https://api.stocktwits.com/api/2/streams/symbol/{ticker}.json
             No auth required for public data. Parses Bullish/Bearish tags + VADER.
Reddit     : praw.Reddit via settings.reddit_client_id / reddit_client_secret.
             Searches r/stocks + r/wallstreetbets for ticker. Uses VADER scoring.
Yahoo JP   : GET https://finance.yahoo.co.jp/cm/message/{jp_ticker}/
             Scrapes post count as attention proxy.

ported from: VADER SentimentIntensityAnalyzer (vaderSentiment library)
ported from: PRAW Reddit search API (praw>=7.8)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Weights
# ---------------------------------------------------------------------------
_WEIGHT_STOCKTWITS = 0.4
_WEIGHT_REDDIT = 0.4
_WEIGHT_YAHOO_JP = 0.2
_YAHOO_JP_POST_THRESHOLD = 100  # posts > this → positive attention proxy (0.3 contribution)
_STOCKTWITS_URL = "https://api.stocktwits.com/api/2/streams/symbol/{ticker}.json"
_YAHOO_JP_URL = "https://finance.yahoo.co.jp/cm/message/{ticker}/"
_HTTP_TIMEOUT = 15.0


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class SentimentResult:
    ticker: str
    bull_ratio: float = 0.5       # 0.0–1.0 from StockTwits Bullish/Bearish ratio
    vader_score: float = 0.0      # -1.0 to +1.0 from Reddit VADER
    post_count_24h: int = 0       # from Yahoo JP board (attention proxy)
    combined_score: float = 0.0   # -1.0 to +1.0 weighted average
    source_count: int = 0         # how many sources returned data


# ---------------------------------------------------------------------------
# StockTwits
# ---------------------------------------------------------------------------

async def _fetch_stocktwits(
    ticker: str,
    http_client,
) -> tuple[float, float]:
    """Fetch StockTwits stream and return (bull_ratio, vader_score).

    bull_ratio: fraction of tagged messages that are Bullish (0.5 if unavailable).
    vader_score: mean VADER compound score of message bodies (-1 to +1).

    ported from: StockTwits public API v2 /streams/symbol/{ticker}.json
    """
    url = _STOCKTWITS_URL.format(ticker=ticker)
    try:
        resp = await http_client.get(url, timeout=_HTTP_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.debug("StockTwits fetch failed for %s: %s", ticker, exc)
        return 0.5, 0.0

    messages = data.get("messages", [])
    if not messages:
        return 0.5, 0.0

    bullish = 0
    bearish = 0
    bodies: list[str] = []

    for msg in messages:
        entities = msg.get("entities", {})
        sentiment = entities.get("sentiment")
        if sentiment:
            basic = sentiment.get("basic", "")
            if basic == "Bullish":
                bullish += 1
            elif basic == "Bearish":
                bearish += 1
        body = msg.get("body", "")
        if body:
            bodies.append(body)

    tagged = bullish + bearish
    bull_ratio = (bullish / tagged) if tagged > 0 else 0.5

    # VADER on message bodies
    vader_score = 0.0
    if bodies:
        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer  # ported from: VADER

            analyzer = SentimentIntensityAnalyzer()
            scores = [analyzer.polarity_scores(b)["compound"] for b in bodies]
            vader_score = sum(scores) / len(scores)
        except Exception as exc:
            logger.debug("VADER scoring failed for StockTwits %s: %s", ticker, exc)

    return bull_ratio, vader_score


# ---------------------------------------------------------------------------
# Reddit PRAW
# ---------------------------------------------------------------------------

async def _fetch_reddit_vader(ticker: str, settings) -> Optional[float]:
    """Search r/stocks + r/wallstreetbets for *ticker*, return VADER mean score.

    Returns None if PRAW is not configured or search fails.

    ported from: praw.Reddit search API + VADER SentimentIntensityAnalyzer
    """
    try:
        client_id = getattr(settings, "reddit_client_id", "")
        client_secret = getattr(settings, "reddit_client_secret", "")
        user_agent = getattr(settings, "reddit_user_agent", "")
        if not (client_id and client_secret and user_agent):
            return None

        import asyncio
        import praw  # ported from: praw>=7.8
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

        def _sync_reddit_search() -> list[str]:
            reddit = praw.Reddit(
                client_id=client_id,
                client_secret=client_secret,
                user_agent=user_agent,
            )
            bodies: list[str] = []
            for subreddit_name in ("stocks", "wallstreetbets"):
                try:
                    sub = reddit.subreddit(subreddit_name)
                    for submission in sub.search(ticker, limit=25, time_filter="day"):
                        if submission.selftext:
                            bodies.append(submission.selftext[:500])
                        if submission.title:
                            bodies.append(submission.title)
                except Exception as exc:
                    logger.debug("Reddit search failed for r/%s: %s", subreddit_name, exc)
            return bodies

        bodies = await asyncio.to_thread(_sync_reddit_search)
        if not bodies:
            return None

        analyzer = SentimentIntensityAnalyzer()
        scores = [analyzer.polarity_scores(b)["compound"] for b in bodies]
        return sum(scores) / len(scores)

    except Exception as exc:
        logger.debug("Reddit VADER fetch failed for %s: %s", ticker, exc)
        return None


# ---------------------------------------------------------------------------
# Yahoo JP board
# ---------------------------------------------------------------------------

async def _fetch_yahoo_jp_posts(ticker: str, http_client) -> int:
    """Scrape Yahoo JP board post count as an attention proxy.

    Returns the number of posts visible in the page, or 0 on failure.

    ported from: BeautifulSoup HTML scraping for Yahoo Finance Japan message board
    """
    url = _YAHOO_JP_URL.format(ticker=ticker)
    try:
        resp = await http_client.get(url, timeout=_HTTP_TIMEOUT)
        resp.raise_for_status()
        html = resp.text
    except Exception as exc:
        logger.debug("Yahoo JP board fetch failed for %s: %s", ticker, exc)
        return 0

    try:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "lxml")
        # Count <li> or <article> elements in the message list
        items = soup.find_all("li", class_=lambda c: c and "message" in c.lower())
        if not items:
            # Fallback: count any article-like elements
            items = soup.find_all("article")
        return len(items)
    except Exception as exc:
        logger.debug("Yahoo JP board parse failed for %s: %s", ticker, exc)
        return 0


# ---------------------------------------------------------------------------
# Combined collector
# ---------------------------------------------------------------------------

async def collect_sentiment(
    ticker: str,
    http_client,
    settings,
) -> SentimentResult:
    """Collect multi-source sentiment for *ticker*.

    combined_score formula (weighted average of available sources):
        stocktwits_contrib = (bull_ratio * 2 - 1) × 0.4
        reddit_contrib      = vader_score × 0.4
        yahoo_jp_contrib    = (0.3 if post_count > 100 else 0.0) × 0.2

    Args:
        ticker: Ticker symbol (use JP format e.g. "7203" for Yahoo JP).
        http_client: An ``httpx.AsyncClient`` instance.
        settings: Application settings object with optional Reddit credentials.

    Returns:
        SentimentResult; fully neutral on complete failure.
    """
    result = SentimentResult(ticker=ticker)

    weighted_sum = 0.0
    weight_total = 0.0
    source_count = 0

    # --- StockTwits ---
    try:
        bull_ratio, st_vader = await _fetch_stocktwits(ticker, http_client)
        # Only count as valid source if we got non-default bull_ratio
        result.bull_ratio = bull_ratio
        st_contrib = (bull_ratio * 2.0 - 1.0) * _WEIGHT_STOCKTWITS
        weighted_sum += st_contrib
        weight_total += _WEIGHT_STOCKTWITS
        source_count += 1
    except Exception as exc:
        logger.debug("StockTwits collection failed for %s: %s", ticker, exc)

    # --- Reddit PRAW ---
    try:
        vader = await _fetch_reddit_vader(ticker, settings)
        if vader is not None:
            result.vader_score = vader
            weighted_sum += vader * _WEIGHT_REDDIT
            weight_total += _WEIGHT_REDDIT
            source_count += 1
    except Exception as exc:
        logger.debug("Reddit collection failed for %s: %s", ticker, exc)

    # --- Yahoo JP ---
    try:
        post_count = await _fetch_yahoo_jp_posts(ticker, http_client)
        result.post_count_24h = post_count
        if post_count > _YAHOO_JP_POST_THRESHOLD:
            yahoo_contrib = 0.3 * _WEIGHT_YAHOO_JP
            weighted_sum += yahoo_contrib
            weight_total += _WEIGHT_YAHOO_JP
            source_count += 1
    except Exception as exc:
        logger.debug("Yahoo JP collection failed for %s: %s", ticker, exc)

    # Normalise combined score
    if weight_total > 0:
        result.combined_score = max(-1.0, min(1.0, weighted_sum / weight_total))
    else:
        result.combined_score = 0.0

    result.source_count = source_count
    return result
