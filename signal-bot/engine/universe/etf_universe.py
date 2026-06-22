"""ETF universe: sector, sub-sector, bubble-proxy, and broad-market ETFs."""

SECTOR_ETFS: list[str] = [
    "XLK",   # Technology
    "XLV",   # Health Care
    "XLF",   # Financials
    "XLY",   # Consumer Discretionary
    "XLP",   # Consumer Staples
    "XLE",   # Energy
    "XLI",   # Industrials
    "XLB",   # Materials
    "XLRE",  # Real Estate
    "XLU",   # Utilities
    "XLC",   # Communication Services
]

SUBSECTOR_ETFS: list[str] = [
    "SOXX",  # Semiconductors (iShares)
    "SMH",   # Semiconductors (VanEck)
    "XBI",   # Biotech (equal-weight)
    "IBB",   # Biotech (market-cap)
    "XOP",   # Oil & Gas Exploration
    "OIH",   # Oil Services
    "KBE",   # Banks
    "KRE",   # Regional Banks
    "ITA",   # Aerospace & Defense
    "XME",   # Metals & Mining
    "XRT",   # Retail
    "ARKK",  # ARK Innovation
]

BUBBLE_PROXY_ETFS: list[str] = [
    "ARKK",  # ARK Innovation (risk-on proxy)
    "MSTR",  # MicroStrategy (Bitcoin proxy; technically a stock but used as ETF-like proxy)
    "SOXL",  # 3× Leveraged Semiconductors
    "TQQQ",  # 3× Leveraged Nasdaq-100
]

BROAD_MARKET_ETFS: list[str] = [
    "SPY",   # S&P 500
    "QQQ",   # Nasdaq-100
    "IWM",   # Russell 2000
    "DIA",   # Dow Jones Industrial Average
    "VTI",   # Total US Market
    "IVV",   # S&P 500 (iShares)
]

ALL_ETFS: list[str] = list(
    dict.fromkeys(
        SECTOR_ETFS + SUBSECTOR_ETFS + BUBBLE_PROXY_ETFS + BROAD_MARKET_ETFS
    )
)


def get_all_etf_tickers() -> list[str]:
    """Return deduplicated list of all tracked ETFs."""
    return list(ALL_ETFS)


def get_sector_etfs() -> list[str]:
    """Return the 11 SPDR sector ETFs."""
    return list(SECTOR_ETFS)


def get_subsector_etfs() -> list[str]:
    """Return sub-sector / thematic ETFs."""
    return list(SUBSECTOR_ETFS)


def get_bubble_proxy_etfs() -> list[str]:
    """Return high-beta / leveraged ETFs used as bubble / risk-on proxies."""
    return list(BUBBLE_PROXY_ETFS)


def get_broad_market_etfs() -> list[str]:
    """Return broad market benchmark ETFs."""
    return list(BROAD_MARKET_ETFS)


def get_benchmark_ticker() -> str:
    """Return the primary benchmark ticker."""
    return "SPY"
