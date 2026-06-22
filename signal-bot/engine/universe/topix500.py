"""TOPIX 500 universe. Static CIK/ticker list; price data via Stooq (pandas_datareader).

Note: Stooq JP tickers use format `{code}.JP` (e.g., Toyota = `7203.JP`).

ported from: pandas_datareader.data.DataReader(..., 'stooq') pattern used in DataFetcher
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Top-50 TOPIX 500 members by market cap (liquid blue chips)
# ---------------------------------------------------------------------------
TOPIX500_TICKERS: list[str] = [
    "7203.JP",   # Toyota Motor
    "6758.JP",   # Sony Group
    "9984.JP",   # SoftBank Group
    "9432.JP",   # NTT (Nippon Telegraph and Telephone)
    "8306.JP",   # MUFG (Mitsubishi UFJ Financial)
    "6861.JP",   # Keyence
    "8035.JP",   # Tokyo Electron (TEL)
    "9433.JP",   # KDDI
    "7974.JP",   # Nintendo
    "6367.JP",   # Daikin Industries
    "4063.JP",   # Shin-Etsu Chemical
    "8316.JP",   # SMFG (Sumitomo Mitsui Financial)
    "6098.JP",   # Recruit Holdings
    "7267.JP",   # Honda Motor
    "9983.JP",   # Fast Retailing (Uniqlo)
    "6501.JP",   # Hitachi
    "6902.JP",   # DENSO
    "9022.JP",   # JR Central (Tokai)
    "8411.JP",   # Mizuho Financial
    "4519.JP",   # Chugai Pharmaceutical
    "6857.JP",   # Advantest
    "6366.JP",   # Chiyoda
    "7751.JP",   # Canon
    "6702.JP",   # Fujitsu
    "5108.JP",   # Bridgestone
    "8031.JP",   # Mitsui & Co.
    "8001.JP",   # Itochu
    "9064.JP",   # Yamato Holdings
    "4543.JP",   # Terumo
    "2914.JP",   # Japan Tobacco (JT)
    "8802.JP",   # Mitsubishi Estate
    "3382.JP",   # Seven & i Holdings
    "4523.JP",   # Eisai
    "8630.JP",   # Sompo Holdings
    "8058.JP",   # Mitsubishi Corp
    "6503.JP",   # Mitsubishi Electric
    "6594.JP",   # Nidec (Nikkei)
    "4578.JP",   # Otsuka Holdings
    "7832.JP",   # Bandai Namco Holdings
    "8053.JP",   # Sumitomo Corp
    "6976.JP",   # Murata Manufacturing
    "7261.JP",   # Mazda Motor
    "8309.JP",   # SMTB (Sumitomo Mitsui Trust)
    "9021.JP",   # JR West
    "4911.JP",   # Shiseido
    "9020.JP",   # JR East
    "6471.JP",   # NSK
    "8725.JP",   # MS&AD Insurance
    "2502.JP",   # Asahi Group Holdings
    "1925.JP",   # Daiwa House Industry
]


# ---------------------------------------------------------------------------
# Async API
# ---------------------------------------------------------------------------

async def get_topix500_tickers() -> list[str]:
    """Return the static TOPIX 500 top-50 ticker list."""
    return list(TOPIX500_TICKERS)


async def fetch_jp_ohlcv(ticker: str, days: int = 120) -> Optional[pd.DataFrame]:
    """Fetch JP OHLCV for *ticker* via Stooq (pandas_datareader).

    Runs the synchronous DataReader call in a thread pool so it doesn't block
    the asyncio event loop.

    Args:
        ticker: Stooq-format ticker, e.g. ``"7203.JP"``.
        days: Number of calendar days of history to request.

    Returns:
        DataFrame with columns [open, high, low, close, volume], sorted ascending,
        or None on any failure.

    ported from: DataFetcher._fetch_stooq in core/data_fetcher.py
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days + 50)  # buffer for weekends/holidays

    def _sync_fetch() -> Optional[pd.DataFrame]:
        try:
            import pandas_datareader.data as pdr_data  # ported from: pandas_datareader

            raw: pd.DataFrame = pdr_data.DataReader(
                ticker, "stooq", start=start_date, end=end_date
            )
        except Exception as exc:
            logger.warning("Stooq fetch failed for %s: %s", ticker, exc)
            return None

        if raw is None or raw.empty:
            return None

        # Stooq returns newest-first; sort ascending
        df = raw.sort_index(ascending=True)
        # Normalise column names to lowercase
        df.columns = [c.lower() for c in df.columns]
        # Ensure standard OHLCV column set
        required = {"open", "high", "low", "close", "volume"}
        if not required.issubset(set(df.columns)):
            logger.warning("Stooq response missing columns for %s: %s", ticker, df.columns.tolist())
            return None

        return df[["open", "high", "low", "close", "volume"]]

    try:
        result = await asyncio.to_thread(_sync_fetch)
        return result
    except Exception as exc:
        logger.warning("fetch_jp_ohlcv thread failed for %s: %s", ticker, exc)
        return None
