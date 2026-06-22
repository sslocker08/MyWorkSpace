"""S&P 500 constituent tickers (top ~300 by market cap / liquidity)."""

SP500_TICKERS: list[str] = [
    # ── Mega-cap Technology ──
    "AAPL", "MSFT", "NVDA", "AVGO", "ORCL", "CRM", "ADBE", "AMD", "QCOM", "INTC",
    "TXN", "AMAT", "LRCX", "KLAC", "MU", "HPE", "IBM", "NOW", "SNPS", "CDNS",
    "ANSS", "KEYS", "CSCO",

    # ── Berkshire Hathaway ──
    "BRK.B",

    # ── Cybersecurity & Cloud ──
    "FTNT", "PANW", "CRWD", "NET", "DDOG", "SNOW", "PLTR", "TEAM", "ZS", "OKTA",
    "S", "ESTC",

    # ── E-Commerce & Internet ──
    "AMZN", "META", "GOOGL", "GOOG", "NFLX", "PYPL", "EBAY",

    # ── Consumer Tech & EV ──
    "TSLA", "AAPL",

    # ── Semiconductors (additional) ──
    "MCHP", "SWKS", "MPWR", "TER", "ENTG", "ON", "WOLF", "OLED",

    # ── Software (Enterprise) ──
    "INTU", "HUBS", "WDAY", "VEEV", "COUP", "BILL", "TOST", "GTLB", "MDB",

    # ── Financials – Banks ──
    "JPM", "BAC", "WFC", "C", "USB", "TFC", "PNC", "MS", "GS",
    "RF", "KEY", "CFG", "MTB", "FITB", "HBAN", "ZION", "CMA",
    "BK", "STT",

    # ── Financials – Asset Managers & Insurance ──
    "BLK", "TROW", "AMG", "IVZ", "SCHW",
    "MET", "PRU", "AFL", "ALL", "AIG", "CB", "TRV", "PGR", "HIG", "AIZ",

    # ── Financials – Payments ──
    "V", "MA", "AXP", "FI", "FIS", "GPN", "ADP", "PAYX", "PYPL", "SQ",

    # ── Health Care – Managed Care & PBM ──
    "UNH", "HUM", "MOH", "CNC", "CI", "CVS",

    # ── Health Care – Pharma & Biotech ──
    "LLY", "JNJ", "MRK", "ABBV", "BMY", "PFE", "AMGN", "GILD", "BIIB",
    "REGN", "VRTX", "ALXN", "INCY", "RARE", "IONS", "ACAD", "SRPT",
    "BLUE", "ARWR", "AGIO", "RGNX",

    # ── Health Care – Devices & Diagnostics ──
    "ABT", "MDT", "BSX", "SYK", "ZBH", "BAX", "BDX", "EW", "COO",
    "HOLX", "ISRG", "RMD", "ALGN", "IDXX", "A", "BIO", "TMO", "DHR",
    "DGX", "LH",

    # ── Health Care – Distribution ──
    "MCK", "ABC", "CAH", "WBA",

    # ── Consumer Staples ──
    "PG", "KO", "PEP", "WMT", "COST", "PM", "MO", "KMB", "GIS", "HSY",
    "CPB", "SJM", "MKC", "CLX", "CHD", "EL", "CL", "KHC", "MDLZ",

    # ── Consumer Discretionary ──
    "HD", "MCD", "SBUX", "NKE", "TJX", "ROST", "BBY", "LOW", "DG", "DLTR",
    "YUM", "QSR", "CMG", "DRI", "MKL", "BKNG", "EXPE",

    # ── Energy ──
    "XOM", "CVX", "COP", "EOG", "SLB", "MPC", "PSX", "VLO", "OXY", "HES",
    "DVN", "PXD", "HAL", "BKR", "APA", "FANG",

    # ── Industrials ──
    "HON", "UPS", "RTX", "GE", "LMT", "NOC", "BA", "CAT", "DE", "MMM",
    "EMR", "ITW", "ROK", "ETN", "PH", "IR", "SWK", "DOV", "CMI", "AME",
    "ROP", "IEX", "XYL", "VRSK", "FDX",

    # ── Aerospace & Defense ──
    "LHX", "GD", "TDG", "HII", "KTOS", "PLTR",

    # ── Materials ──
    "LIN", "APD", "ECL", "SHW", "PPG", "NUE", "FCX", "NEM", "ALB", "CF",
    "MOS", "VMC", "MLM", "BLL", "IP", "SEE",

    # ── Utilities ──
    "NEE", "DUK", "SO", "D", "AEP", "EXC", "SRE", "XEL", "WEC", "ED",
    "ES", "ETR", "PPL", "CMS", "NI", "AES", "EIX",

    # ── Real Estate (REITs) ──
    "AMT", "PLD", "EQIX", "CCI", "PSA", "O", "DLR", "WELL", "AVB", "EQR",
    "SPG", "VNO", "SLG", "MAA", "UDR", "PEAK", "ARE", "KIM", "REG",

    # ── Communication Services ──
    "T", "VZ", "CMCSA", "CHTR", "DIS", "WBD", "PARA", "EA", "TTWO", "ATVI",
    "GOOGL", "META",

    # ── Additional Large-Caps ──
    "ACN", "SPGI", "MCO", "MSCI", "ICE", "CME", "CBOE", "NDAQ",
    "WM", "RSG", "CTAS", "FAST", "GWW", "SYY", "ADM", "BG",
    "DD", "EMN", "HUN", "CE",
    "IDXX", "ZTS", "IQV", "PKI",
    "CTSH", "ACN", "EPAM", "GLOB",
    "CARR", "OTIS", "TT", "JCI",
    "APTV", "TE", "BWA",
    "HPQ", "NTAP", "STX", "WDC",
    "EFX", "EXPN",
]

# Deduplicate while preserving order
_seen: set[str] = set()
_deduped: list[str] = []
for _t in SP500_TICKERS:
    if _t not in _seen:
        _seen.add(_t)
        _deduped.append(_t)
SP500_TICKERS = _deduped


def get_sp500_tickers() -> list[str]:
    """Return the current S&P 500 constituent ticker list."""
    return list(SP500_TICKERS)
