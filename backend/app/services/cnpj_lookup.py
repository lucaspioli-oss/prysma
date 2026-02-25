"""Lookup CNPJ data from free public APIs (Receita Federal + PGFN)."""

import logging
from datetime import datetime, timezone
from decimal import Decimal

import httpx

logger = logging.getLogger(__name__)

BRASILAPI_URL = "https://brasilapi.com.br/api/cnpj/v1"
BRASILAPI_TIMEOUT = 15  # seconds


async def fetch_receita(cnpj: str) -> dict | None:
    """Fetch company data from Receita Federal via BrasilAPI.

    Returns dict with normalized fields, or None on failure.
    """
    cnpj_clean = "".join(c for c in cnpj if c.isdigit())
    if len(cnpj_clean) != 14:
        return None

    try:
        async with httpx.AsyncClient(timeout=BRASILAPI_TIMEOUT) as client:
            resp = await client.get(f"{BRASILAPI_URL}/{cnpj_clean}")
            if resp.status_code != 200:
                logger.warning("BrasilAPI returned %s for CNPJ %s", resp.status_code, cnpj_clean)
                return None
            data = resp.json()
    except Exception:
        logger.exception("Error fetching CNPJ %s from BrasilAPI", cnpj_clean)
        return None

    # Parse capital_social
    capital = None
    raw_capital = data.get("capital_social")
    if raw_capital is not None:
        try:
            capital = Decimal(str(raw_capital))
        except Exception:
            pass

    # Parse situacao
    situacao = (data.get("descricao_situacao_cadastral") or "").upper().strip()
    if not situacao:
        # Some responses use different field names
        situacao = (data.get("situacao_cadastral") or "").upper().strip()

    # CNAE principal
    cnae = None
    cnae_fiscal = data.get("cnae_fiscal_descricao")
    if cnae_fiscal:
        cnae = cnae_fiscal

    return {
        "razao_social": data.get("razao_social", "").strip() or None,
        "nome_fantasia": data.get("nome_fantasia", "").strip() or None,
        "situacao_cadastral": situacao or None,
        "data_situacao": data.get("data_situacao_cadastral") or None,
        "natureza_juridica": data.get("natureza_juridica", "").strip() or None,
        "porte": (data.get("porte") or data.get("descricao_porte") or "").strip() or None,
        "capital_social": capital,
        "data_abertura": data.get("data_inicio_atividade") or None,
        "uf": data.get("uf") or None,
        "municipio": data.get("municipio") or None,
        "cnae_principal": cnae,
        "fetched_at": datetime.now(timezone.utc),
    }


async def fetch_pgfn(cnpj: str) -> dict | None:
    """Check if CNPJ has active debt with PGFN (Procuradoria-Geral da Fazenda Nacional).

    The PGFN public consultation is web-based, not a clean REST API.
    For now, we return None (not available) and flag it for future implementation
    when we integrate with a proper data provider.
    """
    # TODO: Integrate with PGFN when a reliable free API becomes available.
    # Options: web scraping PGFN portal, or paid provider (Serasa, Assertiva).
    # For now, this field will be null in DebtorProfile.
    return None


async def enrich_cnpj(cnpj: str) -> dict | None:
    """Fetch all available data for a CNPJ.

    Returns combined dict from all sources, or None if CNPJ is invalid.
    """
    cnpj_clean = "".join(c for c in cnpj if c.isdigit())
    if len(cnpj_clean) != 14:
        return None

    receita = await fetch_receita(cnpj_clean)
    pgfn = await fetch_pgfn(cnpj_clean)

    if not receita:
        return None

    result = {**receita}

    if pgfn:
        result["has_divida_ativa"] = pgfn.get("has_divida_ativa")
        result["divida_ativa_valor"] = pgfn.get("valor_total")
        result["pgfn_updated_at"] = pgfn.get("fetched_at")

    return result
