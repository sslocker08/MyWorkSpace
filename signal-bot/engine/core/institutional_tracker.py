"""SEC EDGAR 13F institutional holdings tracker — coattail investing engine."""
import asyncio
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Optional
import xml.etree.ElementTree as ET

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from models.institutional import InstitutionalHolding

logger = logging.getLogger(__name__)

_EDGAR_DELAY = 0.12  # stay well under EDGAR's 10 req/sec limit
_EDGAR_BASE = "https://data.sec.gov"
_EDGAR_ARCHIVE_BASE = "https://www.sec.gov"
_EDGAR_HEADERS = {
    "User-Agent": "signal-bot-research/1.0 (ss.locker08@gmail.com)",
    "Accept-Encoding": "gzip, deflate",
}

# 13F InfoTable XML namespace
_NS = {"ns": "http://www.sec.gov/edgar/document/thirteenf/informationtable"}

TRACKED_MANAGERS: dict[str, dict] = {
    "berkshire": {
        "name": "Berkshire Hathaway",
        "cik": "0001067983",
    },
    "pershing": {
        "name": "Pershing Square Capital Management",
        "cik": "0001336528",
    },
    "appaloosa": {
        "name": "Appaloosa Management",
        "cik": "0001017288",
    },
    "duquesne": {
        "name": "Duquesne Family Office",
        "cik": "0001536411",
    },
    "scion": {
        "name": "Scion Asset Management (Burry)",
        "cik": "0001649339",
    },
    "third_point": {
        "name": "Third Point LLC (Loeb)",
        "cik": "0001040273",
    },
    "soros": {
        "name": "Soros Fund Management",
        "cik": "0001029160",
    },
}


@dataclass
class HoldingRow:
    cusip: str
    company_name: str
    shares: int
    value_usd_thousands: int


def _derive_quarter_end(filing_date: date) -> date:
    """Derive calendar quarter end from a 13F-HR filing date.

    13F-HR is due ≤45 days after the quarter end, so filing_date - 45 days
    is always within the prior quarter.
    """
    approx = filing_date - timedelta(days=45)
    year = approx.year
    month = approx.month
    if month <= 3:
        return date(year, 3, 31)
    elif month <= 6:
        return date(year, 6, 30)
    elif month <= 9:
        return date(year, 9, 30)
    else:
        return date(year, 12, 31)


async def _get_latest_13f_accession(
    client: httpx.AsyncClient, cik: str
) -> Optional[tuple[str, str]]:
    """Return (accession_nodashes, filing_date_str) for the most recent 13F-HR filing."""
    url = f"{_EDGAR_BASE}/submissions/CIK{cik.zfill(10)}.json"
    await asyncio.sleep(_EDGAR_DELAY)
    try:
        resp = await client.get(url, headers=_EDGAR_HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning("EDGAR submissions fetch failed for CIK %s: %s", cik, e)
        return None

    filings = data.get("filings", {}).get("recent", {})
    forms = filings.get("form", [])
    dates = filings.get("filingDate", [])
    accessions = filings.get("accessionNumber", [])

    for form, filing_date, accession in zip(forms, dates, accessions):
        if form == "13F-HR":
            return (accession.replace("-", ""), filing_date)
    return None


async def _fetch_infotable_xml(
    client: httpx.AsyncClient, cik: str, accession_nodashes: str
) -> Optional[str]:
    """Download the 13F InfoTable XML (the holdings table) from an EDGAR filing."""
    # Reconstruct the dashed form (e.g. "0001067983-23-000018") from nodashes
    dashed = f"{accession_nodashes[:10]}-{accession_nodashes[10:12]}-{accession_nodashes[12:]}"
    idx_url = (
        f"{_EDGAR_ARCHIVE_BASE}/Archives/edgar/data/{int(cik)}"
        f"/{accession_nodashes}/{dashed}-index.json"
    )
    await asyncio.sleep(_EDGAR_DELAY)
    try:
        resp = await client.get(idx_url, headers=_EDGAR_HEADERS, timeout=30)
        resp.raise_for_status()
        idx = resp.json()
    except Exception as e:
        logger.warning("EDGAR filing index fetch failed (%s): %s", accession_nodashes, e)
        return None

    # EDGAR filing index JSON uses directory.item, not a top-level documents array.
    xml_url = None
    for doc in idx.get("directory", {}).get("item", []):
        name = doc.get("name", "").lower()
        if "infotable" in name and name.endswith(".xml"):
            xml_url = (
                f"{_EDGAR_ARCHIVE_BASE}/Archives/edgar/data/{int(cik)}"
                f"/{accession_nodashes}/{doc['name']}"
            )
            break

    if not xml_url:
        logger.warning("No infotable XML found in filing %s", accession_nodashes)
        return None

    await asyncio.sleep(_EDGAR_DELAY)
    try:
        resp = await client.get(xml_url, headers=_EDGAR_HEADERS, timeout=60)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        logger.warning("InfoTable XML download failed: %s", e)
        return None


def _parse_infotable(xml_text: str) -> list[HoldingRow]:
    """Parse 13F InfoTable XML into a list of HoldingRow objects."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        logger.warning("13F XML parse error: %s", e)
        return []

    rows: list[HoldingRow] = []
    for info in root.findall(".//ns:infoTable", _NS):
        try:
            name_el = info.find("ns:nameOfIssuer", _NS)
            cusip_el = info.find("ns:cusip", _NS)
            value_el = info.find("ns:value", _NS)
            shares_el = info.find(".//ns:sshPrnamt", _NS)

            if None in (name_el, cusip_el, value_el, shares_el):
                continue

            rows.append(HoldingRow(
                cusip=(cusip_el.text or "").strip(),
                company_name=(name_el.text or "").strip(),
                shares=int(shares_el.text or 0),
                value_usd_thousands=int(value_el.text or 0),
            ))
        except (ValueError, AttributeError):
            continue

    return rows


async def _cusips_to_tickers(cusips: list[str]) -> dict[str, str]:
    """Batch-resolve CUSIPs to tickers via OpenFIGI (free, no key required)."""
    result: dict[str, str] = {}
    batch_size = 100
    url = "https://api.openfigi.com/v3/mapping"

    async with httpx.AsyncClient() as client:
        for i in range(0, len(cusips), batch_size):
            batch = cusips[i: i + batch_size]
            payload = [{"idType": "ID_CUSIP", "idValue": c} for c in batch]
            try:
                await asyncio.sleep(0.25)  # free tier: 250 req/min
                resp = await client.post(url, json=payload, timeout=30)
                resp.raise_for_status()
                for cusip, entry in zip(batch, resp.json()):
                    data_list = entry.get("data") or []
                    # Prefer US equity exchange codes
                    for item in data_list:
                        ticker = item.get("ticker", "")
                        exch = item.get("exchCode", "")
                        if ticker and exch in ("US", "UN", "UW", "UA", "UP", "UR"):
                            result[cusip] = ticker
                            break
                    # Fallback: first available ticker
                    if cusip not in result and data_list:
                        ticker = data_list[0].get("ticker", "")
                        if ticker:
                            result[cusip] = ticker
            except Exception as e:
                logger.warning("OpenFIGI batch failed (cusips %d-%d): %s", i, i + batch_size, e)

    return result


async def _get_prior_tickers(
    db: AsyncSession, manager_cik: str, quarter_end: date
) -> set[str]:
    """Return the set of tickers held by this manager in any prior quarter."""
    stmt = select(InstitutionalHolding.ticker).where(
        and_(
            InstitutionalHolding.manager_cik == manager_cik,
            InstitutionalHolding.quarter_end < quarter_end,
        )
    )
    result = await db.execute(stmt)
    return {row[0] for row in result.fetchall()}


async def fetch_manager_holdings(
    manager_key: str,
    manager_info: dict,
    db: AsyncSession,
) -> int:
    """Fetch and persist the latest 13F holdings for one tracked manager.

    Returns the number of rows inserted (0 if already up-to-date or fetch failed).
    """
    cik = manager_info["cik"]
    name = manager_info["name"]

    async with httpx.AsyncClient() as client:
        latest = await _get_latest_13f_accession(client, cik)
        if not latest:
            logger.warning("No 13F-HR found for %s (CIK %s)", name, cik)
            return 0

        accession_nodashes, filing_date_str = latest
        xml_text = await _fetch_infotable_xml(client, cik, accession_nodashes)

    if not xml_text:
        return 0

    rows = _parse_infotable(xml_text)
    if not rows:
        return 0

    filing_date = date.fromisoformat(filing_date_str)
    qend = _derive_quarter_end(filing_date)

    # Skip if we already have data for this quarter
    existing = await db.execute(
        select(InstitutionalHolding.id).where(
            and_(
                InstitutionalHolding.manager_cik == cik,
                InstitutionalHolding.quarter_end == qend,
            )
        ).limit(1)
    )
    if existing.scalar():
        logger.info("Holdings for %s quarter %s already persisted — skipping", name, qend)
        return 0

    # Resolve CUSIPs → tickers
    cusips = list({r.cusip for r in rows if r.cusip})
    ticker_map = await _cusips_to_tickers(cusips)

    prior_tickers = await _get_prior_tickers(db, cik, qend)
    total_value = sum(r.value_usd_thousands for r in rows) or 1

    count = 0
    now = datetime.utcnow()
    for row in rows:
        ticker = ticker_map.get(row.cusip, "")
        if not ticker:
            continue

        holding = InstitutionalHolding(
            manager_key=manager_key,
            manager_name=name,
            manager_cik=cik,
            ticker=ticker.upper(),
            cusip=row.cusip,
            company_name=row.company_name,
            shares=row.shares,
            value_usd_thousands=row.value_usd_thousands,
            pct_portfolio=row.value_usd_thousands / total_value,
            is_new_position=ticker.upper() not in prior_tickers,
            filing_date=filing_date,
            quarter_end=qend,
            fetched_at=now,
        )
        db.add(holding)
        count += 1

    await db.commit()
    logger.info("Persisted %d holdings for %s (quarter %s)", count, name, qend)
    return count


async def refresh_all(db: AsyncSession) -> dict[str, int]:
    """Fetch latest 13F data for all tracked managers. Called weekly by the scheduler."""
    results: dict[str, int] = {}
    for key, info in TRACKED_MANAGERS.items():
        try:
            results[key] = await fetch_manager_holdings(key, info, db)
        except Exception as e:
            logger.error("13F refresh failed for %s: %s", key, e)
            results[key] = -1
    return results


async def get_convergence_map(db: AsyncSession) -> dict[str, int]:
    """Return {ticker: fund_count} for the most recent quarter across all tracked managers.

    fund_count is the number of tracked managers currently holding that ticker.
    Used by the signal scorer to apply an institutional-convergence boost.
    """
    latest_result = await db.execute(
        select(InstitutionalHolding.quarter_end)
        .order_by(InstitutionalHolding.quarter_end.desc())
        .limit(1)
    )
    latest_quarter = latest_result.scalar()
    if not latest_quarter:
        return {}

    stmt = select(
        InstitutionalHolding.ticker,
        InstitutionalHolding.manager_cik,
    ).where(InstitutionalHolding.quarter_end == latest_quarter)
    result = await db.execute(stmt)

    convergence: dict[str, set[str]] = {}
    for ticker, cik in result.fetchall():
        convergence.setdefault(ticker, set()).add(cik)

    return {ticker: len(ciks) for ticker, ciks in convergence.items()}
