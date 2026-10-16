import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, Uuid

from app.db import Base

JSON_TYPE = JSON()


def now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)


class User(TimestampMixin, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    aup_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuthSession(TimestampMixin, Base):
    __tablename__ = "auth_sessions"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    csrf_token_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ip: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PasswordResetToken(TimestampMixin, Base):
    __tablename__ = "password_reset_tokens"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class EmailVerificationToken(TimestampMixin, Base):
    __tablename__ = "email_verification_tokens"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Classroom(TimestampMixin, Base):
    __tablename__ = "classes"
    teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    term: Mapped[str] = mapped_column(String(80), default="")
    join_code: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    join_code_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ClassMember(TimestampMixin, Base):
    __tablename__ = "class_members"
    __table_args__ = (UniqueConstraint("class_id", "student_id"),)
    class_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)


class Lab(TimestampMixin, Base):
    __tablename__ = "labs"
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(180))
    summary: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(100))
    difficulty: Mapped[str] = mapped_column(String(20))
    estimated_minutes: Mapped[int] = mapped_column(Integer)
    version: Mapped[int] = mapped_column(Integer)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    manifest: Mapped[dict[str, Any]] = mapped_column(JSON_TYPE)
    guide_markdown: Mapped[str] = mapped_column(Text)
    questions: Mapped[list["LabQuestion"]] = relationship(back_populates="lab", cascade="all, delete-orphan")


class LabQuestion(TimestampMixin, Base):
    __tablename__ = "lab_questions"
    __table_args__ = (UniqueConstraint("lab_id", "qid"),)
    lab_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("labs.id", ondelete="CASCADE"), index=True)
    qid: Mapped[str] = mapped_column(String(64))
    type: Mapped[str] = mapped_column(String(24))
    prompt: Mapped[str] = mapped_column(Text)
    points: Mapped[int] = mapped_column(Integer)
    position: Mapped[int] = mapped_column(Integer)
    hints: Mapped[list[str]] = mapped_column(JSON_TYPE, default=list)
    answer_spec: Mapped[dict[str, Any]] = mapped_column(JSON_TYPE)
    public_options: Mapped[list[Any] | None] = mapped_column(JSON_TYPE)
    explanation: Mapped[str] = mapped_column(Text, default="")
    lab: Mapped[Lab] = relationship(back_populates="questions")


class Assignment(TimestampMixin, Base):
    __tablename__ = "assignments"
    lab_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("labs.id"), index=True)
    class_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("classes.id"), index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(180))
    instructions: Mapped[str] = mapped_column(Text, default="")
    opens_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    hard_deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    time_limit_minutes: Mapped[int | None] = mapped_column(Integer)
    scoring_policy: Mapped[str] = mapped_column(String(12), default="best")


class AssignmentTarget(TimestampMixin, Base):
    __tablename__ = "assignment_targets"
    __table_args__ = (UniqueConstraint("assignment_id", "student_id"),)
    assignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assignments.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)


class LabSession(TimestampMixin, Base):
    __tablename__ = "lab_sessions"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    lab_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("labs.id"), index=True)
    assignment_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("assignments.id"), index=True)
    mode: Mapped[str] = mapped_column(String(12))
    status: Mapped[str] = mapped_column(String(16), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_reason: Mapped[str | None] = mapped_column(String(120))
    runtime_refs: Mapped[dict[str, Any]] = mapped_column(JSON_TYPE, default=dict)
    secrets_encrypted: Mapped[str] = mapped_column(Text, default="")
    draft_answers: Mapped[dict[str, Any]] = mapped_column(JSON_TYPE, default=dict)


class Attempt(TimestampMixin, Base):
    __tablename__ = "attempts"
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lab_sessions.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    lab_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("labs.id"), index=True)
    assignment_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("assignments.id"), index=True)
    is_practice: Mapped[bool] = mapped_column(Boolean, default=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    duration_seconds: Mapped[int] = mapped_column(Integer)
    score: Mapped[int] = mapped_column(Integer)
    max_score: Mapped[int] = mapped_column(Integer)
    answers: Mapped[dict[str, Any]] = mapped_column(JSON_TYPE)
    per_question_results: Mapped[list[dict[str, Any]]] = mapped_column(JSON_TYPE)


class AuditLog(TimestampMixin, Base):
    __tablename__ = "audit_logs"
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(100), index=True)
    target_type: Mapped[str] = mapped_column(String(60))
    target_id: Mapped[str | None] = mapped_column(String(64))
    metadata_json: Mapped[dict[str, Any]] = mapped_column("metadata", JSON_TYPE, default=dict)
    ip: Mapped[str | None] = mapped_column(String(64))


class PlatformSetting(TimestampMixin, Base):
    __tablename__ = "platform_settings"
    key: Mapped[str] = mapped_column(String(100), unique=True)
    value: Mapped[Any] = mapped_column(JSON_TYPE)
