import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255))
    cnpj: Mapped[str | None] = mapped_column(String(18), unique=True, nullable=True)
    plan: Mapped[str] = mapped_column(String(20), default="free")
    trial_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    users = relationship("User", back_populates="organization")
    receivables = relationship("Receivable", back_populates="organization")
    payments = relationship("Payment", back_populates="organization")
