import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import String, Date, DateTime, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=True
    )
    session_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("anonymous_sessions.id"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    payer_cnpj: Mapped[str | None] = mapped_column(String(18), nullable=True)
    payer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="csv")
    matched_receivable_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("receivables.id"), nullable=True
    )
    match_status: Mapped[str] = mapped_column(String(20), default="unmatched")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", back_populates="payments")
    matched_receivable = relationship("Receivable", foreign_keys=[matched_receivable_id])
