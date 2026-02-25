import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.receivable import Receivable
from app.models.payment import Payment
from app.models.conciliation import ConciliationRun


# Tolerance thresholds
VALUE_EXACT_TOLERANCE = Decimal("0.001")   # ~0.1% for rounding differences
VALUE_CLOSE_TOLERANCE = Decimal("0.02")    # 2% for small fees/discounts
VALUE_FUZZY_TOLERANCE = Decimal("0.05")    # 5% for juros, multa, desconto


def _match_confidence(receivable: Receivable, payment: Payment) -> int:
    """Calculate match confidence (0-100) between a receivable and payment.

    Scoring breakdown:
    - Value:  up to 40 pts (exact=40, close=30, fuzzy=15)
    - CNPJ:   up to 35 pts (exact match)
    - Date:   up to 25 pts (exact=25, ±3d=18, ±7d=12, ±15d=6, ±30d=3)
    - Name:   up to 10 pts (bonus when no CNPJ but names overlap)
    """
    score = 0
    face = receivable.face_value
    amount = payment.amount

    if face == 0:
        return 0

    # --- Value match ---
    value_diff = abs(face - amount)
    value_pct = value_diff / face

    if value_pct <= VALUE_EXACT_TOLERANCE:
        score += 40  # Exact (or rounding difference)
    elif value_pct <= VALUE_CLOSE_TOLERANCE:
        score += 30  # Very close (small fee or discount)
    elif value_pct <= VALUE_FUZZY_TOLERANCE:
        score += 15  # Fuzzy (juros, multa, desconto)
    else:
        return 0  # Value too different — not a match

    # --- CNPJ match ---
    cnpj_matched = False
    if receivable.debtor_cnpj and payment.payer_cnpj:
        if receivable.debtor_cnpj == payment.payer_cnpj:
            score += 35
            cnpj_matched = True

    # --- Name similarity (bonus when no CNPJ) ---
    if not cnpj_matched and receivable.debtor_name and payment.payer_name:
        recv_name = receivable.debtor_name.upper().strip()
        pay_name = payment.payer_name.upper().strip()

        # Check if one name contains the other or shares significant words
        recv_words = set(recv_name.split()) - {"LTDA", "ME", "SA", "EIRELI", "EPP", "S/A", "S.A.", "DE", "DO", "DA", "E", "-"}
        pay_words = set(pay_name.split()) - {"LTDA", "ME", "SA", "EIRELI", "EPP", "S/A", "S.A.", "DE", "DO", "DA", "E", "-", "PIX", "TED", "DOC"}

        if recv_words and pay_words:
            common = recv_words & pay_words
            if len(common) >= 2:
                score += 10  # Strong name overlap
            elif len(common) == 1 and len(recv_words) <= 3:
                score += 5   # Partial name overlap (small company name)

    # --- Date match ---
    if receivable.due_date and payment.date:
        delta = abs((receivable.due_date - payment.date).days)
        if delta == 0:
            score += 25
        elif delta <= 3:
            score += 18
        elif delta <= 7:
            score += 12
        elif delta <= 15:
            score += 6
        elif delta <= 30:
            score += 3
        # > 30 days: no date score, but still can match on value+CNPJ

    return min(score, 100)


async def run_conciliation(
    db: AsyncSession,
    session_id: uuid.UUID | None = None,
    organization_id: uuid.UUID | None = None,
) -> dict:
    """Run conciliation matching receivables against payments."""

    # Fetch pending receivables
    recv_stmt = select(Receivable).where(Receivable.status == "pending")
    pay_stmt = select(Payment).where(Payment.match_status == "unmatched")

    if session_id:
        recv_stmt = recv_stmt.where(Receivable.session_id == session_id)
        pay_stmt = pay_stmt.where(Payment.session_id == session_id)
    elif organization_id:
        recv_stmt = recv_stmt.where(Receivable.organization_id == organization_id)
        pay_stmt = pay_stmt.where(Payment.organization_id == organization_id)

    recv_result = await db.execute(recv_stmt)
    pay_result = await db.execute(pay_stmt)

    receivables = list(recv_result.scalars().all())
    payments = list(pay_result.scalars().all())

    # Create conciliation run
    run = ConciliationRun(
        session_id=session_id,
        organization_id=organization_id,
        total_receivables=len(receivables),
        total_payments=len(payments),
    )
    db.add(run)

    # Calculate all potential matches
    potential_matches = []
    for recv in receivables:
        for pay in payments:
            confidence = _match_confidence(recv, pay)
            if confidence > 0:
                potential_matches.append((recv, pay, confidence))

    # Sort by confidence descending
    potential_matches.sort(key=lambda x: x[2], reverse=True)

    # Greedy matching (highest confidence first)
    matched_receivables = set()
    matched_payments = set()
    matches = []

    for recv, pay, confidence in potential_matches:
        if recv.id in matched_receivables or pay.id in matched_payments:
            continue

        recv.status = "conciliated"
        pay.matched_receivable_id = recv.id
        pay.match_status = "auto"

        matched_receivables.add(recv.id)
        matched_payments.add(pay.id)

        matches.append({
            "receivable_id": str(recv.id),
            "payment_id": str(pay.id),
            "debtor_cnpj": recv.debtor_cnpj,
            "debtor_name": recv.debtor_name,
            "payer_name": pay.payer_name,
            "receivable_value": str(recv.face_value),
            "payment_value": str(pay.amount),
            "due_date": recv.due_date.isoformat() if recv.due_date else None,
            "payment_date": pay.date.isoformat() if pay.date else None,
            "confidence": confidence,
        })

    # Update run stats
    run.matched_count = len(matches)
    run.unmatched_count = len(receivables) - len(matches)
    run.status = "completed"
    run.completed_at = datetime.now(timezone.utc)

    unmatched_receivables = [
        {
            "id": str(r.id),
            "debtor_cnpj": r.debtor_cnpj,
            "debtor_name": r.debtor_name,
            "face_value": str(r.face_value),
            "due_date": r.due_date.isoformat() if r.due_date else None,
        }
        for r in receivables
        if r.id not in matched_receivables
    ]

    unmatched_payments = [
        {
            "id": str(p.id),
            "payer_cnpj": p.payer_cnpj,
            "payer_name": p.payer_name,
            "amount": str(p.amount),
            "date": p.date.isoformat() if p.date else None,
        }
        for p in payments
        if p.id not in matched_payments
    ]

    return {
        "run_id": str(run.id),
        "summary": {
            "total_receivables": len(receivables),
            "total_payments": len(payments),
            "matched": len(matches),
            "unmatched_receivables": len(unmatched_receivables),
            "unmatched_payments": len(unmatched_payments),
            "match_rate": round(len(matches) / max(len(receivables), 1) * 100, 1),
        },
        "matches": matches,
        "unmatched_receivables": unmatched_receivables,
        "unmatched_payments": unmatched_payments,
    }
