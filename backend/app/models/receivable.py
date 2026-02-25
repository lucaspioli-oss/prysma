import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import String, Date, DateTime, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Receivable(Base):
    __tablename__ = "receivables"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=True
    )
    session_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("anonymous_sessions.id"), nullable=True
    )
    debtor_cnpj: Mapped[str | None] = mapped_column(String(18), nullable=True)
    debtor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    assignor_cnpj: Mapped[str | None] = mapped_column(String(18), nullable=True)
    assignor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    face_value: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    risk_score: Mapped[str | None] = mapped_column(String(1), nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="csv")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    organization = relationship("Organization", back_populates="receivables")
