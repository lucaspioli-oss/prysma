import csv
import io
import secrets
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.core.database import async_session
from app.models.anonymous_session import AnonymousSession
from app.models.receivable import Receivable
from app.models.payment import Payment
from app.models.conciliation import ConciliationRun
from app.services.parser import parse_file

router = APIRouter(prefix="/api/v1/instant", tags=["instant"])


@router.post("/upload")
async def instant_upload(
    file: UploadFile = File(...),
    session_token: Optional[str] = Form(None),
):
    """Upload a file without authentication. Returns parsed data + session token.
    Pass session_token to add data to an existing session (e.g., upload receivables first, then payments).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()
    filename = file.filename.lower()

    try:
        result = parse_file(content, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    async with async_session() as db:
        # Reuse existing session or create new
        if session_token:
            stmt = select(AnonymousSession).where(
                AnonymousSession.session_token == session_token
            )
            res = await db.execute(stmt)
            session = res.scalar_one_or_none()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            session.files_processed += 1
        else:
            session_token = secrets.token_hex(32)
            session = AnonymousSession(
                session_token=session_token,
                files_processed=1,
            )
            db.add(session)
            await db.flush()  # get session.id

        for rec in result["receivables"]:
            rec.session_id = session.id
            db.add(rec)

        for pay in result["payments"]:
            pay.session_id = session.id
            db.add(pay)

        await db.commit()

    return {
        "session_token": session_token,
        "summary": {
            "receivables_count": len(result["receivables"]),
            "payments_count": len(result["payments"]),
            "errors": result["errors"],
        },
        "receivables": [
            {
                "debtor_cnpj": r.debtor_cnpj,
                "debtor_name": r.debtor_name,
                "face_value": float(r.face_value),
                "due_date": r.due_date.isoformat() if r.due_date else None,
                "status": r.status,
            }
            for r in result["receivables"]
        ],
        "payments": [
            {
                "payer_cnpj": p.payer_cnpj,
                "payer_name": p.payer_name,
                "amount": float(p.amount),
                "date": p.date.isoformat() if p.date else None,
            }
            for p in result["payments"]
        ],
    }


@router.post("/conciliate")
async def instant_conciliate(session_token: str):
    """Run conciliation for an anonymous session."""
    from app.services.conciliation import run_conciliation

    async with async_session() as db:
        stmt = select(AnonymousSession).where(
            AnonymousSession.session_token == session_token
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        conciliation_result = await run_conciliation(db, session_id=session.id)
        await db.commit()

    return conciliation_result


@router.get("/export")
async def instant_export(session_token: str):
    """Export conciliation results as CSV."""
    from app.services.conciliation import run_conciliation

    async with async_session() as db:
        stmt = select(AnonymousSession).where(
            AnonymousSession.session_token == session_token
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Fetch all receivables and payments for this session
        recv_result = await db.execute(
            select(Receivable).where(Receivable.session_id == session.id)
        )
        pay_result = await db.execute(
            select(Payment).where(Payment.session_id == session.id)
        )
        receivables = list(recv_result.scalars().all())
        payments = list(pay_result.scalars().all())

        # Build payment lookup by matched_receivable_id
        payment_by_recv = {}
        for p in payments:
            if p.matched_receivable_id:
                payment_by_recv[p.matched_receivable_id] = p

    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")

    # Header
    writer.writerow([
        "Status",
        "Devedor CNPJ",
        "Devedor Nome",
        "Valor Recebivel",
        "Vencimento",
        "Pagador CNPJ",
        "Pagador Nome",
        "Valor Pago",
        "Data Pagamento",
        "Diferenca",
    ])

    # Matched receivables
    for r in receivables:
        p = payment_by_recv.get(r.id)
        if p:
            diff = float(p.amount) - float(r.face_value)
            writer.writerow([
                "CONCILIADO",
                r.debtor_cnpj or "",
                r.debtor_name or "",
                f"{float(r.face_value):.2f}",
                r.due_date.isoformat() if r.due_date else "",
                p.payer_cnpj or "",
                p.payer_name or "",
                f"{float(p.amount):.2f}",
                p.date.isoformat() if p.date else "",
                f"{diff:.2f}" if diff != 0 else "",
            ])
        else:
            writer.writerow([
                "NAO PAGO",
                r.debtor_cnpj or "",
                r.debtor_name or "",
                f"{float(r.face_value):.2f}",
                r.due_date.isoformat() if r.due_date else "",
                "", "", "", "", "",
            ])

    # Unmatched payments
    matched_pay_ids = {p.id for p in payment_by_recv.values()}
    for p in payments:
        if p.id not in matched_pay_ids:
            writer.writerow([
                "PAGAMENTO SEM RECEBIVEL",
                "", "",
                "", "",
                p.payer_cnpj or "",
                p.payer_name or "",
                f"{float(p.amount):.2f}",
                p.date.isoformat() if p.date else "",
                "",
            ])

    csv_content = output.getvalue()
    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=conciliacao_prysma.csv"},
    )
