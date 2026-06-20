"""Universe manager: aggregates S&P 500 + ETF tickers into a single interface."""
import logging

from .sp500 import get_sp500_tickers
from .etf_universe import get_all_etf_tickers, get_sector_etfs, get_benchmark_ticker

logger = logging.getLogger(__name__)


class UniverseManager:
    """Manages the scanning universe — S&P 500 constituents + ETFs.

    All methods are synchronous (pure list logic). Async helper
    ``get_high_priority_tickers`` is provided for convenience when callers
    cannot pre-import priority ordering.
    """

    def get_us_tickers(self) -> list[str]:
        """Return S&P 500 constituent tickers."""
        return get_sp500_tickers()

    def get_etf_tickers(self) -> list[str]:
        """Return all tracked ETF tickers (sector + sub-sector + broad market)."""
        return get_all_etf_tickers()

    def get_sector_etfs(self) -> list[str]:
        """Return the 11 SPDR sector ETFs."""
        return get_sector_etfs()

    def get_full_universe(self) -> list[str]:
        """Return the deduplicated, sorted union of US stocks + ETFs."""
        all_tickers = set(self.get_us_tickers()) | set(self.get_etf_tickers())
        return sorted(all_tickers)

    def get_benchmark(self) -> str:
        """Return the primary benchmark ticker (SPY)."""
        return get_benchmark_ticker()

    async def get_high_priority_tickers(self, limit: int = 100) -> list[str]:
        """Return the most liquid / signal-relevant tickers, up to *limit*.

        The fixed priority head is placed first; remaining S&P 500 tickers
        fill the tail up to the requested limit.
        """
        priority: list[str] = [
            # Benchmarks & broad market
            "SPY", "QQQ", "IWM",
            # Mega-cap US
            "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA",
            "AMD", "AVGO",
            # Sector ETFs (key)
            "SOXX", "SMH", "XLK", "XLE", "XLF",
            # Bubble / risk-on proxies
            "ARKK", "MSTR", "SOXL", "TQQQ",
        ]
        seen: set[str] = set(priority)
        remaining = [t for t in self.get_us_tickers() if t not in seen]
        combined = priority + remaining
        return combined[:limit]
