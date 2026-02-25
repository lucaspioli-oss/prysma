"""Risk scoring engine for debtor profiles.

Combines:
1. Receita Federal data (situação, porte, idade, capital social)
2. PGFN (dívida ativa — when available)
3. Internal payment history (days late, default rate, partial payments)

Output: Score A-E, numeric value 0-100, risk flags, and actionable alerts.
"""

import json
import logging
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.debtor_profile import DebtorProfile
from app.models.receivable import Receivable
from app.models.payment import Payment
from app.services.cnpj_lookup import enrich_cnpj

logger = logging.getLogger(__name__)


def _company_age_years(data_abertura: str | None) -> float | None:
    """Calculate company age in years from data_abertura string (YYYY-MM-DD)."""
    if not data_abertura:
        return None
    try:
        opened = datetime.strptime(data_abertura[:10], "%Y-%m-%d")
        delta = datetime.now() - opened
        return delta.days / 365.25
    except (ValueError, TypeError):
        return None


def calculate_risk_score(profile: DebtorProfile) -> dict:
    """Calculate risk score from a DebtorProfile.

    Returns dict with:
    - score: str (A, B, C, D, E)
    - score_value: int (0-100, higher = riskier)
    - flags: list[dict] with type, severity, message
    - alerts: list[dict] with actionable recommendations
    """
    risk_value = 0  # 0 = safe, 100 = maximum risk
    flags = []
    alerts = []

    # ========================================
    # 1. SITUAÇÃO CADASTRAL (0-30 pts of risk)
    # ========================================
    situacao = (profile.situacao_cadastral or "").upper()
    if situacao in ("BAIXADA", "INAPTA", "NULA"):
        risk_value += 30
        flags.append({
            "type": "situacao_irregular",
            "severity": "critical",
            "message": f"CNPJ com situação cadastral: {situacao}",
        })
        alerts.append({
            "priority": "urgente",
            "action": "Suspender operações com este sacado imediatamente",
            "reason": f"Empresa com CNPJ {situacao} na Receita Federal",
        })
    elif situacao == "SUSPENSA":
        risk_value += 20
        flags.append({
            "type": "situacao_suspensa",
            "severity": "high",
            "message": "CNPJ com situação SUSPENSA na Receita Federal",
        })
        alerts.append({
            "priority": "alta",
            "action": "Exigir garantia adicional ou pagamento antecipado",
            "reason": "Empresa com situação suspensa pode estar em processo de encerramento",
        })
    elif situacao == "ATIVA":
        pass  # No risk added
    elif situacao:
        risk_value += 5  # Unknown status

    # ========================================
    # 2. IDADE DA EMPRESA (0-15 pts of risk)
    # ========================================
    age = _company_age_years(profile.data_abertura)
    if age is not None:
        if age < 1:
            risk_value += 15
            flags.append({
                "type": "empresa_nova",
                "severity": "high",
                "message": f"Empresa com menos de 1 ano ({age:.1f} anos)",
            })
        elif age < 2:
            risk_value += 10
            flags.append({
                "type": "empresa_recente",
                "severity": "medium",
                "message": f"Empresa com menos de 2 anos ({age:.1f} anos)",
            })
        elif age < 5:
            risk_value += 5

    # ========================================
    # 3. PORTE / CAPITAL SOCIAL (0-10 pts of risk)
    # ========================================
    porte = (profile.porte or "").upper()
    capital = profile.capital_social or Decimal("0")

    if "MEI" in porte:
        risk_value += 8
        flags.append({
            "type": "porte_mei",
            "severity": "medium",
            "message": "Empresa é MEI — capacidade financeira limitada",
        })
    elif "ME" in porte and capital < Decimal("50000"):
        risk_value += 5
        flags.append({
            "type": "capital_baixo",
            "severity": "low",
            "message": f"Capital social de R$ {capital:,.2f}",
        })

    # ========================================
    # 4. DÍVIDA ATIVA PGFN (0-20 pts of risk)
    # ========================================
    if profile.has_divida_ativa is True:
        risk_value += 20
        valor_divida = profile.divida_ativa_valor or Decimal("0")
        flags.append({
            "type": "divida_ativa",
            "severity": "critical",
            "message": f"Dívida ativa na PGFN: R$ {valor_divida:,.2f}",
        })
        alerts.append({
            "priority": "alta",
            "action": "Exigir pagamento à vista ou garantia real",
            "reason": f"Sacado tem dívida ativa de R$ {valor_divida:,.2f} com o governo federal",
        })

    # ========================================
    # 5. HISTÓRICO INTERNO DE PAGAMENTO (0-40 pts of risk)
    # ========================================
    total = profile.total_receivables
    if total > 0:
        # Default rate
        default_rate = profile.total_unpaid / total
        if default_rate > 0.3:
            risk_value += 20
            flags.append({
                "type": "alta_inadimplencia",
                "severity": "critical",
                "message": f"Taxa de inadimplência: {default_rate:.0%} ({profile.total_unpaid} de {total})",
            })
            alerts.append({
                "priority": "urgente",
                "action": "Não operar com este sacado sem garantia",
                "reason": f"Histórico mostra que {default_rate:.0%} dos recebíveis não foram pagos",
            })
        elif default_rate > 0.1:
            risk_value += 12
            flags.append({
                "type": "inadimplencia_moderada",
                "severity": "high",
                "message": f"Taxa de inadimplência: {default_rate:.0%}",
            })
            alerts.append({
                "priority": "alta",
                "action": "Cobrar proativamente antes do vencimento",
                "reason": f"Sacado tem histórico de não pagar {default_rate:.0%} dos recebíveis",
            })

        # Late payment rate
        late_rate = profile.total_late / total if total > 0 else 0
        if late_rate > 0.5:
            risk_value += 10
            flags.append({
                "type": "atraso_frequente",
                "severity": "high",
                "message": f"Atraso frequente: {late_rate:.0%} dos pagamentos",
            })
        elif late_rate > 0.2:
            risk_value += 5
            flags.append({
                "type": "atraso_moderado",
                "severity": "medium",
                "message": f"Atrasa em {late_rate:.0%} dos pagamentos",
            })

        # Average days late
        avg_late = float(profile.avg_days_late or 0)
        if avg_late > 15:
            risk_value += 10
            flags.append({
                "type": "atraso_medio_alto",
                "severity": "high",
                "message": f"Atraso médio de {avg_late:.0f} dias",
            })
            alerts.append({
                "priority": "media",
                "action": f"Considerar cobrança {int(avg_late)} dias antes do vencimento",
                "reason": f"Sacado costuma pagar com {avg_late:.0f} dias de atraso em média",
            })
        elif avg_late > 5:
            risk_value += 5

        # Partial payments
        if profile.total_partial > 0:
            partial_rate = profile.total_partial / total
            if partial_rate > 0.2:
                risk_value += 5
                flags.append({
                    "type": "pagamento_parcial",
                    "severity": "medium",
                    "message": f"Paga valor parcial em {partial_rate:.0%} das vezes",
                })

        # Recovery rate (value received / value expected)
        if profile.total_value_receivables > 0:
            recovery = float(profile.total_value_received / profile.total_value_receivables)
            if recovery < 0.8:
                flags.append({
                    "type": "recuperacao_baixa",
                    "severity": "high",
                    "message": f"Taxa de recuperação de valor: {recovery:.0%}",
                })
    else:
        # No history — slight risk from unknown
        risk_value += 5
        flags.append({
            "type": "sem_historico",
            "severity": "low",
            "message": "Primeiro recebível deste sacado — sem histórico",
        })

    # ========================================
    # FINAL SCORE
    # ========================================
    risk_value = min(risk_value, 100)

    if risk_value <= 15:
        score = "A"
    elif risk_value <= 30:
        score = "B"
    elif risk_value <= 50:
        score = "C"
    elif risk_value <= 70:
        score = "D"
    else:
        score = "E"

    # Add a positive alert if score is good
    if score == "A" and total > 3:
        alerts.append({
            "priority": "info",
            "action": "Sacado confiável — pode aumentar limite de operação",
            "reason": f"Score A com {total} recebíveis, todos pagos em dia",
        })

    return {
        "score": score,
        "score_value": risk_value,
        "flags": flags,
        "alerts": alerts,
    }


async def build_debtor_profile(
    db: AsyncSession,
    cnpj: str,
    session_id: str | None = None,
) -> DebtorProfile:
    """Build or update a DebtorProfile from internal data + external APIs.

    1. Find or create profile in DB
    2. Update payment history from internal data
    3. Fetch Receita Federal data if stale (> 7 days)
    4. Calculate risk score
    """
    cnpj_clean = "".join(c for c in cnpj if c.isdigit())

    # Find or create
    stmt = select(DebtorProfile).where(DebtorProfile.cnpj == cnpj_clean)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    if not profile:
        profile = DebtorProfile(cnpj=cnpj_clean)
        db.add(profile)

    # --- Update internal payment history ---
    recv_stmt = select(Receivable).where(Receivable.debtor_cnpj == cnpj_clean)
    if session_id:
        recv_stmt = recv_stmt.where(Receivable.session_id == session_id)
    recv_result = await db.execute(recv_stmt)
    receivables = list(recv_result.scalars().all())

    pay_stmt = select(Payment).where(Payment.payer_cnpj == cnpj_clean)
    if session_id:
        pay_stmt = pay_stmt.where(Payment.session_id == session_id)
    pay_result = await db.execute(pay_stmt)
    payments = list(pay_result.scalars().all())

    # Build payment lookup
    payment_by_recv = {}
    for p in payments:
        if p.matched_receivable_id:
            payment_by_recv[p.matched_receivable_id] = p

    total = len(receivables)
    paid = 0
    late = 0
    unpaid = 0
    partial = 0
    days_late_list = []
    total_value_recv = Decimal("0")
    total_value_paid = Decimal("0")
    last_pay_date = None

    for r in receivables:
        total_value_recv += r.face_value
        p = payment_by_recv.get(r.id)

        if p:
            total_value_paid += p.amount
            paid += 1

            # Check if late
            if r.due_date and p.date:
                delta_days = (p.date - r.due_date).days
                if delta_days > 0:
                    late += 1
                    days_late_list.append(delta_days)

            # Check if partial
            if r.face_value > 0 and p.amount < r.face_value * Decimal("0.95"):
                partial += 1

            # Track last payment
            if p.date and (last_pay_date is None or p.date > last_pay_date):
                last_pay_date = p.date
        else:
            if r.status != "conciliated":
                unpaid += 1

    profile.total_receivables = total
    profile.total_paid = paid
    profile.total_late = late
    profile.total_unpaid = unpaid
    profile.total_partial = partial
    profile.avg_days_late = Decimal(str(round(sum(days_late_list) / len(days_late_list), 2))) if days_late_list else None
    profile.total_value_receivables = total_value_recv
    profile.total_value_received = total_value_paid
    profile.last_payment_date = last_pay_date.isoformat() if last_pay_date else None

    # --- Fetch Receita data if stale ---
    should_fetch = (
        profile.receita_updated_at is None
        or (datetime.now(timezone.utc) - profile.receita_updated_at).days > 7
    )

    if should_fetch:
        try:
            data = await enrich_cnpj(cnpj_clean)
            if data:
                profile.razao_social = data.get("razao_social")
                profile.nome_fantasia = data.get("nome_fantasia")
                profile.situacao_cadastral = data.get("situacao_cadastral")
                profile.data_situacao = data.get("data_situacao")
                profile.natureza_juridica = data.get("natureza_juridica")
                profile.porte = data.get("porte")
                profile.capital_social = data.get("capital_social")
                profile.data_abertura = data.get("data_abertura")
                profile.uf = data.get("uf")
                profile.municipio = data.get("municipio")
                profile.cnae_principal = data.get("cnae_principal")
                profile.receita_updated_at = data.get("fetched_at")

                if data.get("has_divida_ativa") is not None:
                    profile.has_divida_ativa = data["has_divida_ativa"]
                    profile.divida_ativa_valor = data.get("divida_ativa_valor")
                    profile.pgfn_updated_at = data.get("pgfn_updated_at")
        except Exception:
            logger.exception("Failed to enrich CNPJ %s", cnpj_clean)

    # --- Calculate score ---
    score_result = calculate_risk_score(profile)
    profile.risk_score = score_result["score"]
    profile.risk_score_value = score_result["score_value"]
    profile.risk_flags = json.dumps(score_result["flags"], ensure_ascii=False)

    return profile


async def analyze_session_risk(
    db: AsyncSession,
    session_id: str,
) -> dict:
    """Run risk analysis for all unique CNPJs in a session.

    Returns portfolio risk summary + per-debtor analysis.
    """
    # Get all unique CNPJs from receivables in this session
    recv_stmt = select(Receivable).where(Receivable.session_id == session_id)
    recv_result = await db.execute(recv_stmt)
    receivables = list(recv_result.scalars().all())

    cnpj_set = set()
    cnpj_to_name = {}
    cnpj_to_value = {}

    for r in receivables:
        if r.debtor_cnpj:
            cnpj_clean = "".join(c for c in r.debtor_cnpj if c.isdigit())
            if len(cnpj_clean) == 14:
                cnpj_set.add(cnpj_clean)
                cnpj_to_name[cnpj_clean] = r.debtor_name
                cnpj_to_value[cnpj_clean] = cnpj_to_value.get(cnpj_clean, Decimal("0")) + r.face_value

    # Build profiles for each CNPJ
    debtor_analyses = []
    score_distribution = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0}
    value_at_risk = Decimal("0")
    total_value = Decimal("0")
    all_alerts = []

    for cnpj in cnpj_set:
        profile = await build_debtor_profile(db, cnpj, session_id)
        score_result = calculate_risk_score(profile)

        exposure = cnpj_to_value.get(cnpj, Decimal("0"))
        total_value += exposure

        score = score_result["score"]
        score_distribution[score] = score_distribution.get(score, 0) + 1

        if score in ("D", "E"):
            value_at_risk += exposure

        # Add CNPJ context to alerts
        for alert in score_result["alerts"]:
            alert["cnpj"] = cnpj
            alert["name"] = cnpj_to_name.get(cnpj) or profile.razao_social
            alert["exposure"] = str(exposure)
            all_alerts.append(alert)

        debtor_analyses.append({
            "cnpj": cnpj,
            "name": cnpj_to_name.get(cnpj) or profile.razao_social or "—",
            "score": score,
            "score_value": score_result["score_value"],
            "exposure": str(exposure),
            "flags": score_result["flags"],
            "alerts": score_result["alerts"],
            "company_info": {
                "situacao": profile.situacao_cadastral,
                "porte": profile.porte,
                "capital_social": str(profile.capital_social) if profile.capital_social else None,
                "data_abertura": profile.data_abertura,
                "natureza_juridica": profile.natureza_juridica,
                "cnae": profile.cnae_principal,
                "uf": profile.uf,
            },
            "payment_history": {
                "total": profile.total_receivables,
                "paid": profile.total_paid,
                "late": profile.total_late,
                "unpaid": profile.total_unpaid,
                "partial": profile.total_partial,
                "avg_days_late": str(profile.avg_days_late) if profile.avg_days_late else None,
                "recovery_rate": str(
                    round(profile.total_value_received / profile.total_value_receivables * 100, 1)
                ) if profile.total_value_receivables > 0 else None,
            },
        })

    # Sort: riskiest first
    debtor_analyses.sort(key=lambda x: x["score_value"], reverse=True)

    # Sort alerts: urgente > alta > media > info
    priority_order = {"urgente": 0, "alta": 1, "media": 2, "info": 3}
    all_alerts.sort(key=lambda x: priority_order.get(x.get("priority", "info"), 99))

    return {
        "portfolio_summary": {
            "total_debtors": len(cnpj_set),
            "total_exposure": str(total_value),
            "value_at_risk": str(value_at_risk),
            "risk_percentage": round(float(value_at_risk / total_value * 100), 1) if total_value > 0 else 0,
            "score_distribution": score_distribution,
        },
        "alerts": all_alerts[:20],  # Top 20 most important alerts
        "debtors": debtor_analyses,
    }
