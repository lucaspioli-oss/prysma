import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.receivable import Receivable
from app.models.payment import Payment
from app.models.conciliation import ConciliationRun


FUZZY_TOLERANCE = Decimal("0.01")  # 1% tolerance for fuzzy matching
DATE_TOLERANCE_DAYS = 2


def _match_confidence(receivable: Receivable, payment: Payment) -> int:
    """Calculate match confidence (0-100) between a receivable and payment."""
    score = 0

    # Value match
    if receivable.face_value == payment.amount:
        score += 40
    elif abs(receivable.face_value - payment.amount) <= receivable.face_value * FUZZY_TOLERANCE:
        score += 25
    else:
        return 0  # Value must at least be close

    # CNPJ match
    if receivable.debtor_cnpj and payment.payer_cnpj:
        if receivable.debtor_cnpj == payment.payer_cnpj:
            score += 35

    # Date match
    if receivable.due_date and payment.date:
        delta = abs((receivable.due_date - payment.date).days)
        if delta == 0:
            score += 25
        elif delta <= DATE_TOLERANCE_DAYS:
            score += 15
        elif delta <= 7:
            score += 5

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
            "receivable_value": float(recv.face_value),
            "payment_value": float(pay.amount),
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
            "face_value": float(r.face_value),
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
            "amount": float(p.amount),
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
