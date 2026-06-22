"""JP market microstructure signals: 信用評価損益率, 騰落レシオ, 空売り比率, 信用倍率.

Data sources (free, public):
- 信用評価損益率: https://nikkei225jp.com/data/sinyou.php (scrape)
- 騰落レシオ25日: https://nikkei225jp.com/data/touraku.php (scrape)
- 空売り比率: https://nikkei225jp.com/data/karauri.php (scrape)
- 信用倍率: J-Quants (有料) or 各証券会社 weekly data (TSE公表)

ported from: nikkei225jp.com HTML scraping pattern (BeautifulSoup)
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_NIKKEI225JP_BASE = "https://nikkei225jp.com/data"
_URL_SINYOU = f"{_NIKKEI225JP_BASE}/sinyou.php"
_URL_TOURAKU = f"{_NIKKEI225JP_BASE}/touraku.php"
_URL_KARAURI = f"{_NIKKEI225JP_BASE}/karauri.php"
_HTTP_TIMEOUT = 10.0

# In-memory LRU-style cache: key → (result, expires_at)
_CACHE_TTL_SECONDS = 4 * 3600  # 4 hours
_jp_signal_cache: dict[str, tuple["JPSignalResult", float]] = {}

# Scoring thresholds
_SHINYO_NEAR_ZERO = 0.0      # 信用評価損益率 near 0% → ceiling_contribution += 0.3
_SHINYO_NEAR_BOTTOM = -20.0  # near -20% → += 0.0 (linear between)
_TORAKU_OVERBOUGHT = 125.0   # 騰落レシオ > 125 → SHORT bias
_TORAKU_OVERSOLD = 70.0      # 騰落レシオ < 70 → LONG bias
_KARAURI_HIGH = 50.0         # 空売り比率 > 50% → contrarian LONG (short squeeze)
_KARAURI_LOW = 40.0          # 空売り比率 < 40% → NEUTRAL
_SHINYO_BAIRITU_HIGH = 7.0   # 信用倍率 > 7x → ceiling_contribution += 0.3


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class JPSignalResult:
    shinyo_hyoka_pct: Optional[float]     # 信用評価損益率 (%)
    toraku_ratio: Optional[float]         # 騰落レシオ25日
    karauri_ratio: Optional[float]        # 空売り比率 (%)
    shinyo_bairitu: Optional[float]       # 信用倍率 (x)
    computed_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class JPMacroSignal:
    ceiling_contribution: float           # 0.0 – 1.0
    direction_bias: str                   # "LONG" | "SHORT" | "NEUTRAL"
    breakdown: dict[str, float]           # source → contribution


# ---------------------------------------------------------------------------
# HTML scraping helpers
# ---------------------------------------------------------------------------

def _parse_first_numeric_td(html: str, label_hint: str = "") -> Optional[float]:
    """Extract the first numeric value from an HTML table.

    nikkei225jp.com pages generally have the latest value in the first or second
    data cell of the main table. We iterate all <td> elements and return the
    first that parses as a float.

    ported from: BeautifulSoup HTML parsing pattern for nikkei225jp.com
    """
    try:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "lxml")
        # Try to find a <table> with data; iterate all td values
        for td in soup.find_all("td"):
            text = td.get_text(strip=True).replace(",", "").replace("%", "").replace("倍", "")
            try:
                val = float(text)
                # Sanity-check: reject suspiciously large/small values
                if -1000.0 < val < 10000.0:
                    return val
            except ValueError:
                continue
        logger.debug("No numeric td found%s", f" ({label_hint})" if label_hint else "")
        return None
    except Exception as exc:
        logger.warning("HTML parse error%s: %s", f" ({label_hint})" if label_hint else "", exc)
        return None


# ---------------------------------------------------------------------------
# Public async fetch
# ---------------------------------------------------------------------------

async def fetch_jp_macro_signals(http_client) -> JPSignalResult:
    """Scrape nikkei225jp.com for current JP macro microstructure signals.

    Args:
        http_client: An ``httpx.AsyncClient`` instance.

    Returns:
        JPSignalResult with available fields populated; missing fields are None.
    """
    import asyncio

    async def _safe_get(url: str, label: str) -> Optional[str]:
        try:
            resp = await http_client.get(url, timeout=_HTTP_TIMEOUT)
            resp.raise_for_status()
            return resp.text
        except Exception as exc:
            logger.warning("JP signal fetch failed [%s]: %s", label, exc)
            return None

    # Fire all three requests concurrently
    results = await asyncio.gather(
        _safe_get(_URL_SINYOU, "shinyo_hyoka"),
        _safe_get(_URL_TOURAKU, "toraku_ratio"),
        _safe_get(_URL_KARAURI, "karauri_ratio"),
        return_exceptions=False,
    )

    sinyou_html, touraku_html, karauri_html = results

    shinyo_hyoka_pct: Optional[float] = None
    toraku_ratio: Optional[float] = None
    karauri_ratio: Optional[float] = None

    if sinyou_html:
        shinyo_hyoka_pct = _parse_first_numeric_td(sinyou_html, "shinyo_hyoka")
    if touraku_html:
        toraku_ratio = _parse_first_numeric_td(touraku_html, "toraku_ratio")
    if karauri_html:
        karauri_ratio = _parse_first_numeric_td(karauri_html, "karauri_ratio")

    # 信用倍率 is not scraped (requires J-Quants or weekly TSE publication); left None
    return JPSignalResult(
        shinyo_hyoka_pct=shinyo_hyoka_pct,
        toraku_ratio=toraku_ratio,
        karauri_ratio=karauri_ratio,
        shinyo_bairitu=None,
        computed_at=datetime.utcnow(),
    )


# ---------------------------------------------------------------------------
# Signal computation
# ---------------------------------------------------------------------------

def compute_jp_macro_signal(result: JPSignalResult) -> JPMacroSignal:
    """Translate raw scrape values into a structured macro signal.

    Scoring rules
    -------------
    信用評価損益率:
        near  0%  → ceiling_contribution += 0.3  (market euphoria → ceiling near)
        near -20% → += 0.0  (deep pessimism → no ceiling pressure)
        linear interpolation between.

    騰落レシオ:
        > 125 → direction_bias = SHORT
        <  70 → direction_bias = LONG
        70–125 → NEUTRAL

    空売り比率:
        > 50% → direction_bias hint = LONG (contrarian: heavy shorts → squeeze risk)
        < 40% → NEUTRAL

    信用倍率:
        > 7x  → ceiling_contribution += 0.3 (over-leveraged longs → ceiling pressure)
    """
    ceiling_contribution = 0.0
    direction_bias = "NEUTRAL"
    breakdown: dict[str, float] = {}

    # --- 信用評価損益率 ---
    if result.shinyo_hyoka_pct is not None:
        pct = result.shinyo_hyoka_pct
        # Linear interpolation: 0% → 0.3, -20% → 0.0, clamp outside
        clamped = max(_SHINYO_NEAR_BOTTOM, min(_SHINYO_NEAR_ZERO, pct))
        ratio = (clamped - _SHINYO_NEAR_BOTTOM) / (_SHINYO_NEAR_ZERO - _SHINYO_NEAR_BOTTOM)
        contrib = round(ratio * 0.3, 4)
        ceiling_contribution += contrib
        breakdown["shinyo_hyoka"] = contrib

    # --- 騰落レシオ ---
    if result.toraku_ratio is not None:
        tr = result.toraku_ratio
        if tr > _TORAKU_OVERBOUGHT:
            direction_bias = "SHORT"
            breakdown["toraku_direction"] = -1.0
        elif tr < _TORAKU_OVERSOLD:
            direction_bias = "LONG"
            breakdown["toraku_direction"] = 1.0
        else:
            breakdown["toraku_direction"] = 0.0

    # --- 空売り比率 (contrarian) ---
    if result.karauri_ratio is not None:
        kr = result.karauri_ratio
        if kr > _KARAURI_HIGH:
            # Heavy short interest → contrarian LONG signal
            if direction_bias == "NEUTRAL":
                direction_bias = "LONG"
            breakdown["karauri_contrarian"] = 1.0
        else:
            breakdown["karauri_contrarian"] = 0.0

    # --- 信用倍率 ---
    if result.shinyo_bairitu is not None and result.shinyo_bairitu > _SHINYO_BAIRITU_HIGH:
        contrib = 0.3
        ceiling_contribution += contrib
        breakdown["shinyo_bairitu"] = contrib

    # Clamp total to [0, 1]
    ceiling_contribution = min(1.0, max(0.0, ceiling_contribution))

    return JPMacroSignal(
        ceiling_contribution=ceiling_contribution,
        direction_bias=direction_bias,
        breakdown=breakdown,
    )


# ---------------------------------------------------------------------------
# In-memory cache (4-hour TTL, no Redis needed)
# ---------------------------------------------------------------------------

def get_cached_jp_signals() -> Optional[JPSignalResult]:
    """Return cached JPSignalResult if still fresh, else None.

    The caller is responsible for fetching a fresh result and storing it via
    ``set_cached_jp_signals`` when this returns None.
    """
    entry = _jp_signal_cache.get("jp_signals")
    if entry is None:
        return None
    result, expires_at = entry
    if time.monotonic() > expires_at:
        _jp_signal_cache.pop("jp_signals", None)
        return None
    return result


def set_cached_jp_signals(result: JPSignalResult) -> None:
    """Store *result* in the in-memory cache with a 4-hour TTL."""
    expires_at = time.monotonic() + _CACHE_TTL_SECONDS
    _jp_signal_cache["jp_signals"] = (result, expires_at)
