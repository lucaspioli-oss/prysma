import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DebtorProfile(Base):
    __tablename__ = "debtor_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cnpj: Mapped[str] = mapped_column(String(18), unique=True, index=True)

    # --- Receita Federal ---
    razao_social: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nome_fantasia: Mapped[str | None] = mapped_column(String(255), nullable=True)
    situacao_cadastral: Mapped[str | None] = mapped_column(String(20), nullable=True)
    data_situacao: Mapped[str | None] = mapped_column(String(10), nullable=True)
    natureza_juridica: Mapped[str | None] = mapped_column(String(100), nullable=True)
    porte: Mapped[str | None] = mapped_column(String(50), nullable=True)
    capital_social: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    data_abertura: Mapped[str | None] = mapped_column(String(10), nullable=True)
    uf: Mapped[str | None] = mapped_column(String(2), nullable=True)
    municipio: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cnae_principal: Mapped[str | None] = mapped_column(String(255), nullable=True)
    receita_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # --- PGFN ---
    has_divida_ativa: Mapped[bool | None] = mapped_column(default=None, nullable=True)
    divida_ativa_valor: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    pgfn_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # --- Internal payment history ---
    total_receivables: Mapped[int] = mapped_column(Integer, default=0)
    total_paid: Mapped[int] = mapped_column(Integer, default=0)
    total_late: Mapped[int] = mapped_column(Integer, default=0)
    total_unpaid: Mapped[int] = mapped_column(Integer, default=0)
    total_partial: Mapped[int] = mapped_column(Integer, default=0)
    avg_days_late: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    total_value_receivables: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"))
    total_value_received: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"))
    last_payment_date: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # --- Calculated risk ---
    risk_score: Mapped[str | None] = mapped_column(String(1), nullable=True)
    risk_score_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_flags: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
