import json
import logging
import re
import secrets
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload
from apscheduler.schedulers.background import BackgroundScheduler
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import get_settings
from app.db import Base, SessionLocal, engine, get_db
from app.grading import grade
from app.labs import load_packages, public_manifest
from app.models import Assignment, AssignmentTarget, Attempt, AuditLog, AuthSession, ClassMember, Classroom, EmailVerificationToken, Lab, LabQuestion, LabSession, PasswordResetToken, PlatformSetting, User, now
from app.runtime import DockerLabRuntime
from app.scenarios import choose_log_scenario, choose_lab_profile, profile_questions, log_questions, LEGACY_SCENARIO
from app.security import decrypt, digest, encrypt, expires_in, hash_password, token, verify_password

settings = get_settings()
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("cyberrange")
runtime = DockerLabRuntime(settings.lab_vm_distro)
PROTOTYPE_LAB_SLUGS = {"nmap-network-recon", "sql-injection", "traffic-forensics"}
PASS_PERCENT = 80


def passed_attempt(attempt):
    return bool(attempt and attempt.max_score > 0 and attempt.score * 100 >= PASS_PERCENT * attempt.max_score)


def attempt_outcome(attempt):
    return {"passed": passed_attempt(attempt), "needs_reattempt": not passed_attempt(attempt),
            "percentage": round(attempt.score / attempt.max_score * 100, 2) if attempt.max_score else 0, "pass_mark": PASS_PERCENT}


def selected_attempt(assignment, attempts):
    if not attempts:
        return None
    return max(attempts, key=lambda item: item.score / item.max_score if item.max_score else 0) if assignment.scoring_policy == 'best' else max(attempts, key=lambda item: item.submitted_at)
scheduler = BackgroundScheduler(daemon=True)
app = FastAPI(title="Cyber Range API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin], allow_credentials=True, allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Content-Type", "X-CSRF-Token"])


class LoginBody(BaseModel):
    email: str
    password: str


class RegisterBody(LoginBody):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    join_code: str = Field(min_length=8, max_length=8)


class PasswordBody(BaseModel):
    password: str = Field(min_length=12, max_length=256)


class ResetRequest(BaseModel):
    email: str


class ResetConfirm(BaseModel):
    token: str
    password: str = Field(min_length=12, max_length=256)


class ClassBody(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    term: str = Field(default="", max_length=80)


class ClassPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    term: str | None = Field(default=None, max_length=80)
    archived: bool | None = None


class SettingPatch(BaseModel):
    max_active_sessions: int | None = Field(default=None, ge=1, le=1000)
    max_sessions_per_user: int | None = Field(default=None, ge=1, le=10)
    default_idle_minutes: int | None = Field(default=None, ge=5, le=240)
    default_max_duration_minutes: int | None = Field(default=None, ge=15, le=600)


class JoinBody(BaseModel):
    code: str = Field(min_length=8, max_length=8)


class AssignmentBody(BaseModel):
    lab_id: uuid.UUID
    class_id: uuid.UUID
    title: str = Field(min_length=1, max_length=180)
    instructions: str = ""
    opens_at: datetime | None = None
    due_at: datetime | None = None
    hard_deadline_at: datetime | None = None
    max_attempts: int = Field(default=3, ge=1, le=20)
    time_limit_minutes: int | None = Field(default=None, ge=1, le=600)
    scoring_policy: str = "best"
    student_ids: list[uuid.UUID] | None = None


class LaunchBody(BaseModel):
    lab_id: uuid.UUID
    assignment_id: uuid.UUID | None = None


class AnswersBody(BaseModel):
    answers: dict[str, Any]


class LabActionBody(BaseModel):
    action: str = Field(min_length=1, max_length=32)
    values: dict[str, str] = Field(default_factory=dict)


def audit(db: Session, actor: uuid.UUID | None, action: str, target_type: str, target_id: str | None = None, metadata: dict[str, Any] | None = None, ip: str | None = None) -> None:
    db.add(AuditLog(actor_id=actor, action=action, target_type=target_type, target_id=target_id, metadata_json=metadata or {}, ip=ip))


def utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def user_json(user: User) -> dict[str, Any]:
    return {"id": str(user.id), "email": user.email, "role": user.role, "first_name": user.first_name, "last_name": user.last_name, "must_change_password": user.must_change_password, "aup_accepted": user.aup_accepted_at is not None, "email_verified": user.email_verified_at is not None}


def session_user(request: Request, db: Session) -> tuple[User, AuthSession]:
    raw = request.cookies.get(settings.session_cookie)
    if not raw:
        raise HTTPException(401, "Authentication required")
    auth = db.scalar(select(AuthSession).where(AuthSession.token_hash == digest(raw), AuthSession.revoked_at.is_(None)))
    if not auth or utc(auth.expires_at) < now():
        raise HTTPException(401, "Authentication required")
    user = db.get(User, auth.user_id)
    if not user or not user.is_active:
        raise HTTPException(401, "Authentication required")
    return user, auth


def require_user(request: Request, db: Session = Depends(get_db)) -> User:
    user, _ = session_user(request, db)
    if user.must_change_password and request.url.path != "/api/auth/change-password":
        raise HTTPException(403, "Password change required")
    if user.aup_accepted_at is None and request.url.path not in {"/api/auth/accept-aup", "/api/auth/change-password", "/api/me", "/api/auth/logout"}:
        raise HTTPException(403, "Acceptable Use Policy acceptance required")
    if settings.require_email_verification and user.email_verified_at is None and request.url.path not in {"/api/me", "/api/auth/logout"}:
        raise HTTPException(403, "Verify your email address before continuing")
    return user


def role(user: User, *allowed: str) -> None:
    if user.role not in allowed:
        raise HTTPException(403, "Not authorized")


@app.middleware("http")
async def csrf_guard(request: Request, call_next):
    if request.method in {"POST", "PATCH", "PUT", "DELETE"} and request.url.path not in {"/api/auth/login", "/api/auth/register-student", "/api/auth/password-reset/request", "/api/auth/password-reset/confirm"}:
        cookie = request.cookies.get("cr_csrf")
        header = request.headers.get("x-csrf-token")
        if not cookie or not header or not secrets.compare_digest(cookie, header):
            return JSONResponse({"detail": "CSRF validation failed"}, status_code=403)
        raw = request.cookies.get(settings.session_cookie)
        if raw:
            with SessionLocal() as db:
                auth = db.scalar(select(AuthSession).where(AuthSession.token_hash == digest(raw), AuthSession.revoked_at.is_(None)))
                if not auth or not secrets.compare_digest(auth.csrf_token_hash, digest(cookie)):
                    return JSONResponse({"detail": "CSRF validation failed"}, status_code=403)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
    return response


def start_login_session(response: Response, request: Request, db: Session, user: User) -> None:
    raw, csrf = token(), token()
    db.add(AuthSession(user_id=user.id, token_hash=digest(raw), csrf_token_hash=digest(csrf), expires_at=expires_in(), ip=request.client.host if request.client else None, user_agent=request.headers.get("user-agent", "")[:512]))
    user.last_login_at = now()
    user.failed_login_count = 0
    audit(db, user.id, "auth.login", "user", str(user.id), ip=request.client.host if request.client else None)
    response.set_cookie(settings.session_cookie, raw, httponly=True, secure=settings.secure_cookies, samesite="lax", max_age=604800, path="/")
    response.set_cookie("cr_csrf", csrf, httponly=False, secure=settings.secure_cookies, samesite="lax", max_age=604800, path="/")


def send_email(to: str, subject: str, body: str) -> None:
    if settings.smtp_host.lower() == "console":
        if settings.app_env.lower() != "development":
            raise RuntimeError("Console email is available only in development mode")
        print(f"\n===== LOCAL DEMO EMAIL to {to}: {subject} =====\n{body}\n===== END LOCAL DEMO EMAIL =====\n", flush=True)
        return
    msg = EmailMessage()
    msg["From"] = "cyber-range@localhost"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5) as smtp:
            if settings.smtp_user:
                smtp.starttls()
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
    except (OSError, smtplib.SMTPException):
        logger.warning(json.dumps({"event": "email.delivery_failed", "recipient_domain": to.rsplit("@", 1)[-1]}))


@app.on_event("startup")
def startup() -> None:
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(engine)
    # Packages are validated during startup; `labs sync` imports them into the configured database.
    load_packages(settings.lab_root)
    with SessionLocal() as db:
        sync_packages(db)
        for setting in db.scalars(select(PlatformSetting)):
            if hasattr(settings, setting.key):
                setattr(settings, setting.key, setting.value)
    scheduler.add_job(reap_sessions, "interval", seconds=30, id="session-reaper", replace_existing=True)
    scheduler.start()


@app.on_event("shutdown")
def shutdown() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)


def reap_sessions() -> int:
    with SessionLocal() as db:
        cutoff = now() - timedelta(minutes=settings.default_idle_minutes)
        rows = list(db.scalars(select(LabSession).where(LabSession.status.in_(["starting", "running"]))))
        removed = 0
        for row in rows:
            # Allow the bounded image build/startup to finish before checking health.
            if row.status == "starting" and now() - utc(row.started_at) < timedelta(minutes=5):
                continue
            if utc(row.expires_at) <= now() or utc(row.last_activity_at) <= cutoff or runtime.status(row.runtime_refs) != "running":
                try:
                    runtime.stop(row.runtime_refs)
                except RuntimeError:
                    logger.warning(json.dumps({"event": "session.cleanup_retry", "session_id": str(row.id)}))
                    continue
                row.status = "expired" if utc(row.expires_at) <= now() or utc(row.last_activity_at) <= cutoff else "failed"
                row.end_reason = "timeout" if row.status == "expired" else "runtime_crash"
                row.ended_at = now()
                removed += 1
        db.commit()
        return removed


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
def readyz(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(select(1))
    return {"status": "ready"}


@app.post("/api/auth/login")
@limiter.limit("10/minute")
def login(body: LoginBody, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(func.lower(User.email) == body.email.lower().strip()))
    locked = user and user.locked_until and utc(user.locked_until) > now()
    if not user or not user.is_active or locked or not verify_password(user.password_hash if user else "", body.password):
        if user and not locked:
            user.failed_login_count += 1
            if user.failed_login_count >= 8:
                user.locked_until = now() + timedelta(minutes=15)
            audit(db, user.id, "auth.login_failed", "user", str(user.id), ip=request.client.host if request.client else None)
        db.commit()
        raise HTTPException(401, "Invalid email or password")
    start_login_session(response, request, db, user)
    db.commit()
    return user_json(user)


@app.post("/api/auth/register-student")
@limiter.limit("5/minute")
def register_student(body: RegisterBody, request: Request, response: Response, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(409, "Could not create student account")
    classroom = db.scalar(select(Classroom).where(Classroom.join_code == body.join_code.upper(), Classroom.join_code_enabled.is_(True), Classroom.archived_at.is_(None)))
    if not classroom:
        raise HTTPException(400, "Invalid class join code")
    try:
        user = User(email=email, password_hash=hash_password(body.password), role="student", first_name=body.first_name.strip(), last_name=body.last_name.strip(), email_verified_at=None if settings.require_email_verification else now())
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    db.add(user)
    db.flush()
    db.add(ClassMember(class_id=classroom.id, student_id=user.id))
    if settings.require_email_verification:
        verification = token()
        db.add(EmailVerificationToken(user_id=user.id, token_hash=digest(verification), expires_at=now() + timedelta(hours=24)))
        send_email(user.email, "Verify your Cyber Range account", f"Open {settings.frontend_origin}/api/auth/email-verification?token={verification} to verify this account.")
    audit(db, user.id, "user.registered", "user", str(user.id), {"role": "student"}, request.client.host if request.client else None)
    start_login_session(response, request, db, user)
    db.commit()
    return user_json(user)


@app.get("/api/auth/email-verification")
def verify_email(token_value: str = Query(alias="token"), db: Session = Depends(get_db)):
    row = db.scalar(select(EmailVerificationToken).where(EmailVerificationToken.token_hash == digest(token_value), EmailVerificationToken.used_at.is_(None)))
    if not row or utc(row.expires_at) < now():
        raise HTTPException(400, "Invalid or expired verification link")
    user = db.get(User, row.user_id)
    user.email_verified_at = now()
    row.used_at = now()
    db.commit()
    return RedirectResponse(url=settings.frontend_origin, status_code=303)


@app.get("/api/auth/csrf")
def csrf(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get(settings.session_cookie)
    if raw:
        _, auth = session_user(request, db)
        csrf_value = token()
        auth.csrf_token_hash = digest(csrf_value)
    else:
        csrf_value = token()
    response.set_cookie("cr_csrf", csrf_value, httponly=False, secure=settings.secure_cookies, samesite="lax", path="/")
    db.commit()
    return {"csrf_token": csrf_value}


@app.post("/api/auth/logout")
def logout(request: Request, response: Response, user: User = Depends(require_user), db: Session = Depends(get_db)):
    _, auth = session_user(request, db)
    auth.revoked_at = now()
    audit(db, user.id, "auth.logout", "user", str(user.id))
    db.commit()
    response.delete_cookie(settings.session_cookie, path="/")
    response.delete_cookie("cr_csrf", path="/")
    return {"ok": True}


@app.post("/api/auth/logout-everywhere")
def logout_everywhere(user: User = Depends(require_user), db: Session = Depends(get_db)):
    for auth in db.scalars(select(AuthSession).where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))):
        auth.revoked_at = now()
    db.commit()
    return {"ok": True}


@app.post("/api/auth/accept-aup")
def accept_aup(request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user.aup_accepted_at = now()
    audit(db, user.id, "aup.accepted", "user", str(user.id), ip=request.client.host if request.client else None)
    db.commit()
    return {"accepted": True}


@app.post("/api/auth/change-password")
def change_password(body: PasswordBody, request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    try:
        user.password_hash = hash_password(body.password)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    user.must_change_password = False
    current_token = request.cookies.get(settings.session_cookie, "")
    current_hash = digest(current_token) if current_token else ""
    for auth in db.scalars(select(AuthSession).where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))):
        if auth.token_hash != current_hash:
            auth.revoked_at = now()
    db.commit()
    return {"changed": True}


@app.post("/api/auth/password-reset/request")
@limiter.limit("3/minute")
def request_reset(body: ResetRequest, request: Request, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(func.lower(User.email) == body.email.lower().strip()))
    if user and user.is_active:
        raw = token()
        db.add(PasswordResetToken(user_id=user.id, token_hash=digest(raw), expires_at=now() + timedelta(minutes=30)))
        db.commit()
        send_email(user.email, "Cyber Range password reset", f"Use this one-time token within 30 minutes: {raw}")
    return {"ok": True, "message": "If the account exists, reset instructions have been sent."}


@app.post("/api/auth/password-reset/confirm")
def confirm_reset(body: ResetConfirm, db: Session = Depends(get_db)):
    row = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == digest(body.token), PasswordResetToken.used_at.is_(None)))
    if not row or utc(row.expires_at) < now():
        raise HTTPException(400, "Invalid or expired reset token")
    user = db.get(User, row.user_id)
    try:
        user.password_hash = hash_password(body.password)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    user.must_change_password = False
    row.used_at = now()
    db.commit()
    return {"ok": True}


@app.get("/api/me")
def me(user: User = Depends(require_user)):
    return user_json(user)


@app.get("/api/labs")
def labs(user: User = Depends(require_user), db: Session = Depends(get_db)):
    return [{"id": str(x.id), "slug": x.slug, "title": x.title, "summary": x.summary, "category": x.category, "difficulty": x.difficulty, "estimated_minutes": x.estimated_minutes, "version": x.version, "questions": [{"id": q.qid, "type": q.type, "prompt": q.prompt, "points": q.points, "options": q.public_options, "hints": q.hints} for q in sorted(x.questions, key=lambda q: q.position)]} for x in db.scalars(select(Lab).options(joinedload(Lab.questions)).where(Lab.enabled.is_(True), Lab.slug.in_(PROTOTYPE_LAB_SLUGS))).unique()]


@app.get("/api/labs/{slug}")
def lab_detail(slug: str, user: User = Depends(require_user), db: Session = Depends(get_db)):
    lab = db.scalar(select(Lab).options(joinedload(Lab.questions)).where(Lab.slug == slug, Lab.enabled.is_(True), Lab.slug.in_(PROTOTYPE_LAB_SLUGS)))
    if not lab:
        raise HTTPException(404, "Lab not found")
    result = public_manifest(lab.manifest)
    result["guide_markdown"] = lab.guide_markdown
    return result


@app.get("/api/classes")
def list_classes(user: User = Depends(require_user), db: Session = Depends(get_db)):
    if user.role == "teacher":
        rows = list(db.scalars(select(Classroom).where(Classroom.teacher_id == user.id, Classroom.archived_at.is_(None))))
        return [{"id": str(c.id), "name": c.name, "term": c.term, "join_code": c.join_code, "join_code_enabled": c.join_code_enabled, "member_count": db.scalar(select(func.count()).select_from(ClassMember).where(ClassMember.class_id == c.id))} for c in rows]
    if user.role == "student":
        return [{"id": str(c.id), "name": c.name, "joined_at": utc(member.created_at).isoformat()} for c, member in db.execute(select(Classroom, ClassMember).join(ClassMember).where(ClassMember.student_id == user.id, Classroom.archived_at.is_(None)))]
    return [{"id": str(c.id), "name": c.name, "term": c.term, "teacher_id": str(c.teacher_id)} for c in db.scalars(select(Classroom))]


@app.post("/api/classes")
def create_class(body: ClassBody, request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "teacher")
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    code = "".join(secrets.choice(alphabet) for _ in range(8))
    while db.scalar(select(Classroom.id).where(Classroom.join_code == code)):
        code = "".join(secrets.choice(alphabet) for _ in range(8))
    row = Classroom(teacher_id=user.id, name=body.name, term=body.term, join_code=code)
    db.add(row)
    db.flush()
    audit(db, user.id, "class.created", "class", str(row.id), ip=request.client.host if request.client else None)
    db.commit()
    return {"id": str(row.id), "name": row.name, "term": row.term, "join_code": code}


@app.post("/api/classes/join")
def join_class(body: JoinBody, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "student")
    row = db.scalar(select(Classroom).where(Classroom.join_code == body.code.upper(), Classroom.join_code_enabled.is_(True), Classroom.archived_at.is_(None)))
    if not row:
        raise HTTPException(404, "Invalid join code")
    if not db.scalar(select(ClassMember.id).where(ClassMember.class_id == row.id, ClassMember.student_id == user.id)):
        db.add(ClassMember(class_id=row.id, student_id=user.id))
        db.commit()
    return {"id": str(row.id), "name": row.name}


@app.patch("/api/classes/{class_id}")
def update_class(class_id: uuid.UUID, body: ClassPatch, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "teacher")
    row = owned_class(db, user, class_id)
    if body.name is not None:
        row.name = body.name
    if body.term is not None:
        row.term = body.term
    if body.archived is not None:
        row.archived_at = now() if body.archived else None
    db.commit()
    return {"id": str(row.id), "name": row.name, "term": row.term, "archived": row.archived_at is not None}


@app.post("/api/classes/{class_id}/join-code/regenerate")
def regenerate_join_code(class_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "teacher")
    row = owned_class(db, user, class_id)
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    code = "".join(secrets.choice(alphabet) for _ in range(8))
    while db.scalar(select(Classroom.id).where(Classroom.join_code == code)):
        code = "".join(secrets.choice(alphabet) for _ in range(8))
    row.join_code = code
    db.commit()
    return {"join_code": code}


@app.patch("/api/classes/{class_id}/join-code")
def set_join_code(class_id: uuid.UUID, enabled: bool, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "teacher")
    row = owned_class(db, user, class_id)
    row.join_code_enabled = enabled
    db.commit()
    return {"join_code_enabled": enabled}


@app.delete("/api/classes/{class_id}/members/{student_id}")
def remove_member(class_id: uuid.UUID, student_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "teacher")
    owned_class(db, user, class_id)
    member = db.scalar(select(ClassMember).where(ClassMember.class_id == class_id, ClassMember.student_id == student_id))
    if not member:
        raise HTTPException(404, "Class member not found")
    db.delete(member)
    db.commit()
    return {"removed": True}


def owned_class(db: Session, user: User, class_id: uuid.UUID) -> Classroom:
    row = db.get(Classroom, class_id)
    if not row or (user.role == "teacher" and row.teacher_id != user.id):
        raise HTTPException(404, "Class not found")
    return row


@app.get("/api/classes/{class_id}/members")
def members(class_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "teacher", "admin")
    owned_class(db, user, class_id)
    return [{"id": str(s.id), "email": s.email, "first_name": s.first_name, "last_name": s.last_name, "joined_at": m.created_at.isoformat()} for m, s in db.execute(select(ClassMember, User).join(User, User.id == ClassMember.student_id).where(ClassMember.class_id == class_id))]


@app.post("/api/assignments")
def create_assignment(body: AssignmentBody, request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "teacher")
    classroom = owned_class(db, user, body.class_id)
    lab = db.get(Lab, body.lab_id)
    if not lab or not lab.enabled or lab.slug not in PROTOTYPE_LAB_SLUGS:
        raise HTTPException(404, "Lab not found")
    if body.scoring_policy not in {"best", "latest"}:
        raise HTTPException(422, "Invalid scoring policy")
    row = Assignment(lab_id=lab.id, class_id=classroom.id, created_by=user.id, title=body.title, instructions=body.instructions, opens_at=body.opens_at, due_at=body.due_at, hard_deadline_at=body.hard_deadline_at, max_attempts=body.max_attempts, time_limit_minutes=body.time_limit_minutes, scoring_policy=body.scoring_policy)
    db.add(row)
    db.flush()
    targets = body.student_ids or [m.student_id for m in db.scalars(select(ClassMember).where(ClassMember.class_id == classroom.id))]
    enrolled = {m.student_id for m in db.scalars(select(ClassMember).where(ClassMember.class_id == classroom.id))}
    if not set(targets).issubset(enrolled):
        raise HTTPException(422, "Assignment targets must belong to this class")
    for student_id in targets:
        db.add(AssignmentTarget(assignment_id=row.id, student_id=student_id))
    audit(db, user.id, "assignment.created", "assignment", str(row.id), ip=request.client.host if request.client else None)
    db.commit()
    return {"id": str(row.id), "title": row.title, "class_id": str(row.class_id), "lab_id": str(row.lab_id), "target_count": len(targets)}


@app.get("/api/assignments")
def assignments(user: User = Depends(require_user), db: Session = Depends(get_db)):
    if user.role == "teacher":
        rows = db.scalars(select(Assignment).join(Classroom, Classroom.id == Assignment.class_id).join(Lab, Lab.id == Assignment.lab_id).where(Classroom.teacher_id == user.id, Lab.enabled.is_(True), Lab.slug.in_(PROTOTYPE_LAB_SLUGS)))
    elif user.role == "student":
        rows = db.scalars(select(Assignment).join(AssignmentTarget).join(Lab, Lab.id == Assignment.lab_id).where(AssignmentTarget.student_id == user.id, Lab.enabled.is_(True), Lab.slug.in_(PROTOTYPE_LAB_SLUGS)))
    else:
        rows = db.scalars(select(Assignment).join(Lab, Lab.id == Assignment.lab_id).where(Lab.enabled.is_(True), Lab.slug.in_(PROTOTYPE_LAB_SLUGS)))
    return [{"id": str(a.id), "title": a.title, "lab_id": str(a.lab_id), "class_id": str(a.class_id), "due_at": a.due_at.isoformat() if a.due_at else None, "max_attempts": a.max_attempts, "scoring_policy": a.scoring_policy} for a in rows]


def assignment_for_student(db: Session, assignment_id: uuid.UUID, user: User) -> Assignment:
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    lab = db.get(Lab, assignment.lab_id)
    if not lab or not lab.enabled or lab.slug not in PROTOTYPE_LAB_SLUGS:
        raise HTTPException(404, "Assignment not found")
    if user.role == "teacher":
        owned_class(db, user, assignment.class_id)
        return assignment
    if user.role != "student" or not db.scalar(select(AssignmentTarget.id).where(AssignmentTarget.assignment_id == assignment_id, AssignmentTarget.student_id == user.id)):
        raise HTTPException(404, "Assignment not found")
    return assignment


@app.post("/api/lab-sessions")
@limiter.limit("10/minute")
def launch(body: LaunchBody, request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "student")
    lab = db.get(Lab, body.lab_id)
    if not lab or not lab.enabled or lab.slug not in PROTOTYPE_LAB_SLUGS:
        raise HTTPException(404, "Lab not found")
    assignment = assignment_for_student(db, body.assignment_id, user) if body.assignment_id else None
    if assignment and assignment.lab_id != lab.id:
        raise HTTPException(422, "Assignment lab mismatch")
    if assignment:
        current = now()
        if assignment.opens_at and utc(assignment.opens_at) > current or assignment.hard_deadline_at and utc(assignment.hard_deadline_at) < current:
            raise HTTPException(403, "Assignment is not currently available")
        count = db.scalar(select(func.count()).select_from(Attempt).where(Attempt.user_id == user.id, Attempt.assignment_id == assignment.id)) or 0
        if count >= assignment.max_attempts:
            previous = list(db.scalars(select(Attempt).where(Attempt.user_id == user.id, Attempt.assignment_id == assignment.id)))
            if passed_attempt(selected_attempt(assignment, previous)):
                raise HTTPException(403, "Attempt limit reached")
            # Below the pass mark, remediation remains available until a pass.
    # Reconcile the student's previous environment before applying capacity limits.
    # Reopening a lab resumes it; a different lab offers an explicit switch.
    owned_sessions = list(db.scalars(select(LabSession).where(LabSession.user_id == user.id, LabSession.status.in_(["starting", "running"])).order_by(LabSession.started_at.desc())))
    for existing in owned_sessions:
        current = now()
        expired = utc(existing.expires_at) <= current or utc(existing.last_activity_at) <= current - timedelta(minutes=settings.default_idle_minutes)
        starting = existing.status == "starting" and current - utc(existing.started_at) < timedelta(minutes=5)
        healthy = starting or (not expired and runtime.status(existing.runtime_refs) == "running")
        if not healthy or expired:
            try:
                runtime.stop(existing.runtime_refs)
            except RuntimeError as exc:
                raise HTTPException(503, "The previous lab could not be cleaned up. Check Docker is running, then try again.") from exc
            existing.status, existing.ended_at = "expired" if expired else "failed", current
            existing.end_reason = "timeout" if expired else "runtime_crash"
            db.commit()
            continue
        if existing.lab_id == lab.id and existing.assignment_id == (assignment.id if assignment else None):
            existing.last_activity_at = current
            db.commit()
            return {"id": str(existing.id), "lab_id": str(existing.lab_id), "status": existing.status, "mode": existing.mode, "expires_at": utc(existing.expires_at).isoformat(), "workspace_url": None, "resumed": True}
        if len(owned_sessions) >= settings.max_sessions_per_user:
            existing_lab = db.get(Lab, existing.lab_id)
            raise HTTPException(409, {"message": "Resume your current lab, or stop it before opening a different one.", "active_session": {"id": str(existing.id), "lab_title": existing_lab.title, "status": existing.status}})
    active = db.scalar(select(func.count()).select_from(LabSession).where(LabSession.status.in_(["starting", "running"]))) or 0
    if active >= settings.max_active_sessions:
        reap_sessions()
        active = db.scalar(select(func.count()).select_from(LabSession).where(LabSession.status.in_(["starting", "running"]))) or 0
    mine = db.scalar(select(func.count()).select_from(LabSession).where(LabSession.user_id == user.id, LabSession.status.in_(["starting", "running"]))) or 0
    if mine >= settings.max_sessions_per_user or active >= settings.max_active_sessions:
        raise HTTPException(429, "All lab environments are currently in use. Please try again shortly.")
    start = now()
    duration = min(assignment.time_limit_minutes if assignment and assignment.time_limit_minutes else lab.estimated_minutes + 10, settings.default_max_duration_minutes)
    row = LabSession(user_id=user.id, lab_id=lab.id, assignment_id=assignment.id if assignment else None, mode="graded" if assignment else "practice", status="starting", started_at=start, last_activity_at=start, expires_at=start + timedelta(minutes=duration))
    flags = {}
    for question in lab.manifest["questions"]:
        answer = question.get("answer", "")
        if question["type"] == "flag":
            key = answer[7:-2] if isinstance(answer, str) and answer.startswith("{{flag:") else question["id"]
            flags[key] = secrets.token_urlsafe(18)
    secret_map = {"vnc": token()[:8], **flags}
    profile = choose_lab_profile(lab.slug)
    if profile:
        secret_map['lab_profile'] = profile
    if lab.slug == "traffic-forensics":
        secret_map["log_scenario"] = choose_log_scenario()
    # Manifest flag keys create session-specific answers for grading.
    row.secrets_encrypted = encrypt(json.dumps(secret_map))
    db.add(row)
    # Persist the starting state before runtime.start(), which may take several
    # seconds. Holding SQLite's write transaction during container startup
    # blocks other API requests from writing to the database.
    db.commit()
    try:
        row.runtime_refs = runtime.start(row, lab.manifest, secret_map)
        row.status = "running"
    except Exception as exc:
        row.status = "failed"
        row.end_reason = "runtime_start_failed"
        logger.error(json.dumps({"event": "session.start_failed", "session_id": str(row.id), "error_type": type(exc).__name__}))
        db.commit()
        message = str(exc) if isinstance(exc, RuntimeError) else "Lab could not be started"
        raise HTTPException(503, message) from exc
    audit(db, user.id, "session.started", "lab_session", str(row.id), {"lab": lab.slug}, request.client.host if request.client else None)
    db.commit()
    return {"id": str(row.id), "lab_id": str(lab.id), "status": row.status, "mode": row.mode, "expires_at": row.expires_at.isoformat(), "workspace_url": None}


def session_access(db: Session, user: User, session_id: uuid.UUID) -> LabSession:
    row = db.get(LabSession, session_id)
    if not row:
        raise HTTPException(404, "Session not found")
    if user.role == "student" and row.user_id != user.id:
        raise HTTPException(404, "Session not found")
    if user.role == "teacher":
        assignment = db.get(Assignment, row.assignment_id) if row.assignment_id else None
        if not assignment or owned_class(db, user, assignment.class_id).teacher_id != user.id:
            raise HTTPException(404, "Session not found")
    return row


@app.get("/api/lab-sessions/{session_id}")
def session_detail(session_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    row = session_access(db, user, session_id)
    lab = db.get(Lab, row.lab_id)
    attempt = db.scalar(select(Attempt).where(Attempt.session_id == row.id).order_by(Attempt.submitted_at.desc()))
    profile = row.runtime_refs.get('lab_profile', {})
    briefing = {"close_port": profile.get('close_port', 9001)} if lab.slug == 'nmap-network-recon' else {"training_payload": profile.get('payload', "' OR '1'='1' -- ")} if lab.slug == 'sql-injection' else {}
    return {"id": str(row.id), "lab_id": str(row.lab_id), "assignment_id": str(row.assignment_id) if row.assignment_id else None, "lab_slug": lab.slug, "lab_title": lab.title, "status": row.status, "mode": row.mode, "expires_at": utc(row.expires_at).isoformat(), "attempt_id": str(attempt.id) if attempt else None, "draft_answers": row.draft_answers if row.user_id == user.id else {}, "lab_evidence": public_evidence(row), "briefing": briefing}


def public_evidence(row: LabSession) -> dict[str, Any]:
    evidence = row.runtime_refs.get("lab_evidence", {})
    return {key: evidence[key] for key in ("scan_completed", "service_closed", "rescan_verified", "vulnerable_bypass_observed", "safe_query_observed", "incident_generated", "log_searches") if key in evidence}


@app.post("/api/lab-sessions/{session_id}/answers-draft")
def save_draft(session_id: uuid.UUID, body: AnswersBody, user: User = Depends(require_user), db: Session = Depends(get_db)):
    row = session_access(db, user, session_id)
    if row.user_id != user.id or row.status != "running":
        raise HTTPException(403, "Cannot update this session")
    allowed = {q.qid for q in db.scalars(select(LabQuestion).where(LabQuestion.lab_id == row.lab_id))}
    if not set(body.answers).issubset(allowed):
        raise HTTPException(422, "Unknown question id")
    row.draft_answers = body.answers
    row.last_activity_at = now()
    db.commit()
    return {"saved": True}


@app.post("/api/lab-sessions/{session_id}/submit")
def submit(session_id: uuid.UUID, body: AnswersBody, request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    row = session_access(db, user, session_id)
    if row.user_id != user.id or row.status != "running":
        raise HTTPException(403, "Cannot submit this session")
    lab = db.get(Lab, row.lab_id)
    evidence = row.runtime_refs.get("lab_evidence", {})
    if lab.slug == "nmap-network-recon" and not (evidence.get("scan_completed") and evidence.get("rescan_verified")):
        raise HTTPException(409, "Scan the target, close the unnecessary service, then rescan to verify its port is closed")
    if lab.slug == "sql-injection" and not (evidence.get("vulnerable_bypass_observed") and evidence.get("safe_query_observed")):
        raise HTTPException(409, "Demonstrate the vulnerable bypass and compare it with the safe query before submitting")
    if lab.slug == "traffic-forensics":
        if not evidence.get("incident_generated"):
            raise HTTPException(409, "Generate the training activity, then investigate its logs before submitting")
        scenario = row.runtime_refs.get("log_scenario", LEGACY_SCENARIO)
        missing = sorted({scenario["source"], "file_upload"} - set(evidence.get("log_searches", [])))
        if missing:
            raise HTTPException(409, "Investigate the failed-login source and the upload event before submitting. Use the investigation hints if needed.")
    questions = list(db.scalars(select(LabQuestion).where(LabQuestion.lab_id == row.lab_id).order_by(LabQuestion.position)))
    prompts = {question.qid: question.prompt for question in questions}
    if not set(body.answers).issubset({q.qid for q in questions}):
        raise HTTPException(422, "Unknown question id")
    secrets_map = json.loads(decrypt(row.secrets_encrypted))
    if lab.slug == "traffic-forensics":
        questions = log_questions(questions, row.runtime_refs.get("log_scenario"))
    questions = profile_questions(questions, lab.slug, row.runtime_refs.get('lab_profile'))
    flags = {q.answer_spec.get("flag_key", q.qid): secrets_map[q.answer_spec.get("flag_key", q.qid)] for q in questions if q.type == "flag" and q.answer_spec.get("flag_key", q.qid) in secrets_map}
    score, maximum, results = grade(questions, body.answers, flags, runtime, row.runtime_refs)
    for result in results:
        result['prompt'] = prompts.get(result['qid'], '')
    attempt = Attempt(session_id=row.id, user_id=user.id, lab_id=row.lab_id, assignment_id=row.assignment_id, is_practice=row.assignment_id is None, duration_seconds=max(0, int((now() - utc(row.started_at)).total_seconds())), score=score, max_score=maximum, answers=body.answers, per_question_results=results)
    row.status, row.ended_at, row.end_reason = "stopped", now(), "submitted"
    runtime.stop(row.runtime_refs)
    db.add(attempt)
    audit(db, user.id, "session.submitted", "lab_session", str(row.id), {"score": score, "max_score": maximum}, request.client.host if request.client else None)
    db.commit()
    return {"attempt_id": str(attempt.id), "score": score, "max_score": maximum, "per_question_results": results, "duration_seconds": attempt.duration_seconds, **attempt_outcome(attempt)}


@app.post("/api/lab-sessions/{session_id}/stop")
def stop_session(session_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    row = session_access(db, user, session_id)
    if row.user_id != user.id and user.role not in {"teacher", "admin"}:
        raise HTTPException(403, "Not authorized")
    runtime.stop(row.runtime_refs)
    row.status, row.ended_at, row.end_reason = "stopped", now(), "user_stopped"
    db.commit()
    return {"status": row.status}


@app.post("/api/lab-sessions/{session_id}/extend")
def extend_session(session_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    row = session_access(db, user, session_id)
    if row.user_id != user.id or row.status != "running":
        raise HTTPException(403, "Cannot extend this session")
    if not settings.allow_session_extension:
        raise HTTPException(403, "Session extension is disabled")
    assignment = db.get(Assignment, row.assignment_id) if row.assignment_id else None
    maximum_minutes = assignment.time_limit_minutes if assignment and assignment.time_limit_minutes else settings.default_max_duration_minutes
    maximum = utc(row.started_at) + timedelta(minutes=maximum_minutes)
    row.expires_at = min(utc(row.expires_at) + timedelta(minutes=10), maximum)
    if row.expires_at <= now():
        raise HTTPException(403, "Session reached its maximum duration")
    db.commit()
    return {"expires_at": row.expires_at.isoformat()}


@app.get("/api/lab-sessions/{session_id}/connect")
def connect(session_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    row = session_access(db, user, session_id)
    if row.user_id != user.id:
        raise HTTPException(403, "Spectator desktop access is disabled")
    if row.status != "running":
        raise HTTPException(409, "This demo session is no longer running")
    secret_map = json.loads(decrypt(row.secrets_encrypted))
    # The fake runtime has no terminal to discover flags in. Return their simulated
    # evidence only to the authenticated owner of this running demo session.
    evidence = [f"Simulated training flag: {value}" for key, value in secret_map.items() if key not in {"vnc", "log_scenario", "lab_profile"}]
    return {"url": "", "vnc_password": None, "placeholder": True, "evidence": evidence}


@app.post("/api/lab-sessions/{session_id}/actions")
@limiter.limit("20/minute")
def lab_action(session_id: uuid.UUID, body: LabActionBody, request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    row = session_access(db, user, session_id)
    if row.user_id != user.id or row.status != "running":
        raise HTTPException(403, "This lab session is not available")
    lab = db.get(Lab, row.lab_id)
    values = body.values
    if lab.slug == "nmap-network-recon" and body.action in {"scan", "close_service"}:
        if values:
            raise HTTPException(422, "This scan does not accept command options")
        if body.action == "close_service" and not row.runtime_refs.get("lab_evidence", {}).get("scan_completed"):
            raise HTTPException(409, "Run the baseline scan before closing the service")
        if not hasattr(runtime, "lab_action"):
            raise HTTPException(503, "Hands-on labs are unavailable")
        try:
            result = runtime.lab_action(row.runtime_refs, body.action, {})
        except RuntimeError as exc:
            raise HTTPException(503, str(exc)) from exc
    elif lab.slug == "sql-injection" and body.action in {"vulnerable_login", "safe_login"}:
        if set(values) != {"username", "password"} or any(len(value) > 120 for value in values.values()):
            raise HTTPException(422, "Enter a username and password of at most 120 characters")
        if not hasattr(runtime, "lab_action"):
            raise HTTPException(503, "Hands-on labs are unavailable")
        if body.action == "safe_login":
            prior = row.runtime_refs.get("lab_evidence", {})
            if not prior.get("vulnerable_bypass_observed") or values["username"] != prior.get("vulnerable_input"):
                raise HTTPException(409, "Demonstrate the vulnerable bypass first, then apply the fix with the same username input")
        try:
            result = runtime.lab_action(row.runtime_refs, body.action, values)
        except RuntimeError as exc:
            raise HTTPException(503, str(exc)) from exc
    elif lab.slug == "traffic-forensics" and body.action in {"search_logs", "generate_incident"}:
        if body.action == "search_logs":
            query = values.get("query", "").strip()
            if set(values) != {"query"} or not 2 <= len(query) <= 80:
                raise HTTPException(422, "Enter a search term between 2 and 80 characters")
        elif values:
            raise HTTPException(422, "Activity generation does not accept options")
        if row.runtime_refs.get("runtime") != "docker":
            raise HTTPException(409, "Start a new log-analysis session to use the interactive environment")
        try:
            result = runtime.lab_action(row.runtime_refs, body.action, values)
        except RuntimeError as exc:
            raise HTTPException(503, str(exc)) from exc
    else:
        raise HTTPException(422, "That action is not available in this lab")
    evidence = dict(row.runtime_refs.get("lab_evidence", {}))
    if lab.slug == "nmap-network-recon" and result.get("exit_code") == 0:
        close_port = row.runtime_refs.get('lab_profile', {}).get('close_port', 9001)
        if body.action == "close_service":
            evidence["service_closed"] = True
        elif not evidence.get("service_closed"):
            evidence["scan_completed"] = bool(re.search(rf"^{close_port}/tcp\s+open\b", result.get("output", ""), re.MULTILINE))
        elif evidence.get("scan_completed"):
            evidence["rescan_verified"] = bool(re.search(rf"^{close_port}/tcp\s+closed\b", result.get("output", ""), re.MULTILINE))
    elif lab.slug == "sql-injection":
        try:
            accounts = json.loads(result.get("output", "{}")).get("matched_accounts", [])
        except (json.JSONDecodeError, AttributeError):
            accounts = []
        if body.action == "vulnerable_login":
            if len(accounts) > 1:
                evidence["vulnerable_bypass_observed"] = True
                evidence["vulnerable_input"] = values["username"]
        elif body.action == "safe_login":
            evidence["safe_query_observed"] = len(accounts) == 0 and values["username"] == evidence.get("vulnerable_input")
    elif lab.slug == "traffic-forensics" and result.get("exit_code") == 0:
        if body.action == "generate_incident" and result.get("incident_generated"):
            evidence["incident_generated"] = True
        elif body.action == "search_logs" and result.get("matches", 0):
            searched = set(evidence.get("log_searches", []))
            # Credit the evidence inspected, including searches such as action=file_upload.
            scenario = row.runtime_refs.get("log_scenario", LEGACY_SCENARIO)
            for term in (scenario["source"], "file_upload"):
                if term in result.get("output", "").casefold():
                    searched.add(term)
            evidence["log_searches"] = sorted(searched)
    # SQLAlchemy's JSON columns do not notice edits to nested dictionaries.
    # Assign a new root object so activity evidence survives the request.
    row.runtime_refs = {**row.runtime_refs, "lab_evidence": evidence}
    row.last_activity_at = now()
    audit(db, user.id, "lab.action", "lab_session", str(row.id), {"lab": lab.slug, "action": body.action}, request.client.host if request.client else None)
    db.commit()
    return {**result, "lab_evidence": public_evidence(row)}


@app.get("/internal/lab-auth")
def lab_auth(request: Request, db: Session = Depends(get_db)):
    sid = request.headers.get("X-Forwarded-Uri", "").split("/")
    if len(sid) < 3:
        raise HTTPException(401)
    try:
        session_id = uuid.UUID(sid[2])
        user, _ = session_user(request, db)
        row = session_access(db, user, session_id)
        if row.status != "running":
            raise HTTPException(403)
        row.last_activity_at = now()
        db.commit()
        return Response(status_code=200, headers={"X-CyberRange-User": str(user.id)})
    except (ValueError, HTTPException):
        raise HTTPException(401, "Unauthorized")


@app.get("/api/attempts/{attempt_id}")
def attempt_detail(attempt_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    row = db.get(Attempt, attempt_id)
    if not row:
        raise HTTPException(404, "Attempt not found")
    if user.role == "student" and row.user_id != user.id:
        raise HTTPException(404, "Attempt not found")
    if user.role == "teacher":
        if row.assignment_id:
            assignment_for_student(db, row.assignment_id, user)
        elif not (row.is_practice and db.scalar(select(ClassMember.id).join(Classroom, Classroom.id == ClassMember.class_id).where(ClassMember.student_id == row.user_id, Classroom.teacher_id == user.id))):
            raise HTTPException(404, "Attempt not found")
    return {"id": str(row.id), "score": row.score, "max_score": row.max_score, "submitted_at": row.submitted_at.isoformat(), "duration_seconds": row.duration_seconds, "answers": row.answers, "per_question_results": row.per_question_results, **attempt_outcome(row)}


@app.get("/api/monitor/sessions")
def monitor(user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "teacher", "admin")
    query = select(LabSession).where(LabSession.status.in_(["starting", "running"]))
    if user.role == "teacher":
        query = query.join(Assignment, Assignment.id == LabSession.assignment_id).join(Classroom, Classroom.id == Assignment.class_id).where(Classroom.teacher_id == user.id)
    output = []
    for session in db.scalars(query):
        student, lab = db.get(User, session.user_id), db.get(Lab, session.lab_id)
        assignment = db.get(Assignment, session.assignment_id) if session.assignment_id else None
        classroom = db.get(Classroom, assignment.class_id) if assignment else None
        output.append({'id': str(session.id), 'student_id': str(session.user_id), 'student_name': f'{student.first_name} {student.last_name}',
                       'lab_id': str(session.lab_id), 'lab_title': lab.title, 'class_name': classroom.name if classroom else 'Practice',
                       'status': session.status, 'started_at': utc(session.started_at).isoformat(), 'expires_at': utc(session.expires_at).isoformat()})
    return output


@app.post("/api/monitor/sessions/{session_id}/terminate")
def terminate(session_id: uuid.UUID, request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "teacher", "admin")
    row = session_access(db, user, session_id)
    runtime.stop(row.runtime_refs)
    row.status, row.ended_at, row.end_reason = "stopped", now(), "teacher_terminated"
    audit(db, user.id, "session.terminated", "lab_session", str(row.id), ip=request.client.host if request.client else None)
    db.commit()
    return {"status": row.status}


@app.get("/api/admin/users")
def admin_users(q: str = "", user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "admin")
    rows = db.scalars(select(User).where(func.lower(User.email).contains(q.lower())).order_by(User.email).limit(200))
    return [{**user_json(x), "is_active": x.is_active, "created_at": x.created_at.isoformat()} for x in rows]


class AdminUserBody(BaseModel):
    email: str
    first_name: str
    last_name: str
    role: str = "teacher"


@app.post("/api/admin/users")
def admin_create_user(body: AdminUserBody, request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "admin")
    if body.role not in {"teacher", "student", "admin"} or db.scalar(select(User.id).where(func.lower(User.email) == body.email.lower())):
        raise HTTPException(409, "Account could not be created")
    temp = token()[:20] + "Aa1!"
    target = User(email=body.email.lower().strip(), first_name=body.first_name, last_name=body.last_name, role=body.role, password_hash=hash_password(temp), must_change_password=True, email_verified_at=None if settings.require_email_verification else now())
    db.add(target)
    db.flush()
    verification_link = ""
    if settings.require_email_verification:
        raw = token()
        db.add(EmailVerificationToken(user_id=target.id, token_hash=digest(raw), expires_at=now() + timedelta(hours=24)))
        verification_link = f"\nVerify your email: {settings.frontend_origin}/api/auth/email-verification?token={raw}"
    audit(db, user.id, "user.created", "user", str(target.id), {"role": target.role}, request.client.host if request.client else None)
    db.commit()
    send_email(target.email, "Your Cyber Range account", f"Sign in with temporary password: {temp}{verification_link}")
    return {"id": str(target.id), "email": target.email, "role": target.role}


@app.patch("/api/admin/users/{user_id}")
def admin_update_user(user_id: uuid.UUID, request: Request, is_active: bool | None = None, role_name: str | None = None, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "admin")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "User not found")
    if is_active is not None:
        target.is_active = is_active
        if not is_active:
            for auth in db.scalars(select(AuthSession).where(AuthSession.user_id == target.id, AuthSession.revoked_at.is_(None))):
                auth.revoked_at = now()
    if role_name:
        if role_name not in {"student", "teacher", "admin"}:
            raise HTTPException(422, "Invalid role")
        target.role = role_name
    audit(db, user.id, "user.updated", "user", str(target.id), ip=request.client.host if request.client else None)
    db.commit()
    return user_json(target)


@app.post("/api/admin/users/{user_id}/reset-password")
def admin_reset_password(user_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "admin")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "User not found")
    temporary = token()[:24] + "Range!"
    target.password_hash = hash_password(temporary)
    target.must_change_password = True
    for auth in db.scalars(select(AuthSession).where(AuthSession.user_id == target.id, AuthSession.revoked_at.is_(None))):
        auth.revoked_at = now()
    db.commit()
    send_email(target.email, "Cyber Range password reset", f"Your temporary password is: {temporary}")
    return {"reset": True}


@app.get("/api/admin/labs")
def admin_labs(user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "admin")
    return [{"id": str(x.id), "slug": x.slug, "title": x.title, "enabled": x.enabled, "manifest": public_manifest(x.manifest)} for x in db.scalars(select(Lab).where(Lab.slug.in_(PROTOTYPE_LAB_SLUGS)))]


@app.patch("/api/admin/labs/{lab_id}")
def set_lab(lab_id: uuid.UUID, enabled: bool, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "admin")
    lab = db.get(Lab, lab_id)
    if not lab or lab.slug not in PROTOTYPE_LAB_SLUGS:
        raise HTTPException(404, "Lab not found")
    lab.enabled = enabled
    db.commit()
    return {"id": str(lab.id), "enabled": lab.enabled}


@app.post("/api/admin/labs/sync")
def sync_labs(user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "admin")
    count = sync_packages(db)
    return {"synced": count}


def sync_packages(db: Session) -> int:
    # Keep the college prototype focused on the three guided, hands-on labs.
    packages = [package for package in load_packages(settings.lab_root) if package[0]["slug"] in PROTOTYPE_LAB_SLUGS]
    for extra_lab in db.scalars(select(Lab).where(Lab.slug.notin_(PROTOTYPE_LAB_SLUGS))):
        extra_lab.enabled = False
    for manifest, guide in packages:
        lab = db.scalar(select(Lab).where(Lab.slug == manifest["slug"]))
        if not lab:
            lab = Lab(slug=manifest["slug"], title=manifest["title"], summary=manifest.get("summary", ""), category=manifest["category"], difficulty=manifest["difficulty"], estimated_minutes=manifest["estimated_minutes"], version=manifest["version"], manifest=manifest, guide_markdown=guide)
            db.add(lab)
            db.flush()
        else:
            for key in ("title", "summary", "category", "difficulty", "estimated_minutes", "version", "manifest", "guide_markdown"):
                value = guide if key == "guide_markdown" else manifest if key == "manifest" else manifest.get(key, "") if key == "summary" else manifest[key]
                setattr(lab, key, value)
        existing = {q.qid: q for q in db.scalars(select(LabQuestion).where(LabQuestion.lab_id == lab.id))}
        for position, item in enumerate(manifest["questions"]):
            answer_keys = {"answer", "accepted", "regex", "tolerance", "check", "flag_key"}
            answer = {key: value for key, value in item.items() if key in answer_keys}
            if item["type"] == "flag" and isinstance(item.get("answer"), str) and item["answer"].startswith("{{flag:"):
                answer["flag_key"] = item["answer"][7:-2]
            question = existing.pop(item["id"], None) or LabQuestion(lab_id=lab.id, qid=item["id"], type=item["type"], prompt=item["prompt"], points=item["points"], position=position)
            question.type, question.prompt, question.points, question.position = item["type"], item["prompt"], item["points"], position
            question.hints, question.answer_spec, question.public_options, question.explanation = item.get("hints", []), answer, item.get("options"), item.get("explanation", "")
            db.add(question)
        for stale in existing.values():
            db.delete(stale)
    db.commit()
    return len(packages)


@app.get("/api/admin/settings")
def get_admin_settings(user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "admin")
    return {"max_active_sessions": settings.max_active_sessions, "max_sessions_per_user": settings.max_sessions_per_user, "default_idle_minutes": settings.default_idle_minutes, "default_max_duration_minutes": settings.default_max_duration_minutes, "allow_session_extension": settings.allow_session_extension, "runtime": "Docker-backed local labs"}


@app.patch("/api/admin/settings")
def update_admin_settings(body: SettingPatch, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "admin")
    values = body.model_dump(exclude_none=True)
    for key, value in values.items():
        setattr(settings, key, value)
        row = db.scalar(select(PlatformSetting).where(PlatformSetting.key == key))
        if row:
            row.value = value
        else:
            db.add(PlatformSetting(key=key, value=value))
    db.commit()
    return {**values, "updated": True}


@app.get("/api/admin/system")
def system(user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "admin")
    rows = list(db.scalars(select(LabSession).where(LabSession.status.in_(["starting", "running"]))))
    return {"active_sessions": len(rows), "capacity": settings.max_active_sessions, "runtime": "Disposable Docker environments for all three labs", "sessions": [{"id": str(s.id), "owner_id": str(s.user_id), "lab_id": str(s.lab_id), "status": s.status, "stats": runtime.stats(s.runtime_refs)} for s in rows]}


@app.post("/api/admin/system/terminate-all")
def terminate_all(request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "admin")
    rows = list(db.scalars(select(LabSession).where(LabSession.status.in_(["starting", "running"]))))
    for row in rows:
        runtime.stop(row.runtime_refs)
        row.status, row.ended_at, row.end_reason = "stopped", now(), "admin_terminated_all"
    audit(db, user.id, "sessions.terminated_all", "lab_session", metadata={"count": len(rows)}, ip=request.client.host if request.client else None)
    db.commit()
    return {"terminated": len(rows)}


@app.get("/api/admin/audit-logs")
def audit_logs(user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "admin")
    return [{"actor_id": str(x.actor_id) if x.actor_id else None, "action": x.action, "target_type": x.target_type, "target_id": x.target_id, "created_at": x.created_at.isoformat()} for x in db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(200))]


@app.get("/api/assignments/{assignment_id}/results")
def assignment_results(assignment_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "teacher", "admin")
    assignment = assignment_for_student(db, assignment_id, user) if user.role == "teacher" else db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    assignment_lab = db.get(Lab, assignment.lab_id)
    if not assignment_lab or not assignment_lab.enabled or assignment_lab.slug not in PROTOTYPE_LAB_SLUGS:
        raise HTTPException(404, "Assignment not found")
    targets = list(db.scalars(select(AssignmentTarget).where(AssignmentTarget.assignment_id == assignment.id)))
    output = []
    for target in targets:
        student = db.get(User, target.student_id)
        attempts = list(db.scalars(select(Attempt).where(Attempt.assignment_id == assignment.id, Attempt.user_id == target.student_id).order_by(Attempt.submitted_at)))
        best_score = max((a.score for a in attempts), default=None)
        latest_score = attempts[-1].score if attempts else None
        selected_score = best_score if assignment.scoring_policy == "best" else latest_score
        chosen = selected_attempt(assignment, attempts)
        output.append({"student_id": str(target.student_id), "name": f"{student.first_name} {student.last_name}", "status": "submitted" if attempts else "not started", "attempts": len(attempts), "score": selected_score, "best_score": best_score, "latest_score": latest_score,
                       "max_score": chosen.max_score if chosen else None, "passed": passed_attempt(chosen) if chosen else False,
                       "needs_reattempt": bool(chosen and not passed_attempt(chosen)), "percentage": attempt_outcome(chosen)['percentage'] if chosen else None,
                       "duration_seconds": sum(item.duration_seconds for item in attempts), "submitted_at": utc(chosen.submitted_at).isoformat() if chosen else None})
    return output


@app.get("/api/students/{student_id}/history")
def student_history(student_id: uuid.UUID, lab: uuid.UUID | None = None, user: User = Depends(require_user), db: Session = Depends(get_db)):
    if user.role == "student" and user.id != student_id:
        raise HTTPException(404, "History not found")
    if user.role == "teacher":
        class_ids = select(Classroom.id).where(Classroom.teacher_id == user.id)
        if not db.scalar(select(ClassMember.id).where(ClassMember.student_id == student_id, ClassMember.class_id.in_(class_ids))):
            raise HTTPException(404, "History not found")
    query = select(Attempt).join(Lab, Lab.id == Attempt.lab_id).where(Attempt.user_id == student_id, Lab.enabled.is_(True), Lab.slug.in_(PROTOTYPE_LAB_SLUGS))
    if user.role == 'teacher':
        query = query.where((Attempt.is_practice.is_(True) & Attempt.assignment_id.is_(None)) | Attempt.assignment_id.in_(select(Assignment.id).where(Assignment.class_id.in_(class_ids))))
    if lab:
        query = query.where(Attempt.lab_id == lab)
    return [{"id": str(x.id), "session_id": str(x.session_id), "lab_id": str(x.lab_id), "assignment_id": str(x.assignment_id) if x.assignment_id else None, "is_practice": x.is_practice, "score": x.score, "max_score": x.max_score, "submitted_at": utc(x.submitted_at).isoformat(), "duration_seconds": x.duration_seconds, **attempt_outcome(x)} for x in db.scalars(query.order_by(Attempt.submitted_at.desc()))]


@app.get("/api/analytics/classes/{class_id}")
def analytics(class_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    classroom = owned_class(db, user, class_id)
    role(user, "teacher", "admin")
    assignments = list(db.scalars(select(Assignment).join(Lab, Lab.id == Assignment.lab_id).where(Assignment.class_id == classroom.id, Lab.enabled.is_(True), Lab.slug.in_(PROTOTYPE_LAB_SLUGS))))
    target_count = sum(db.scalar(select(func.count()).select_from(AssignmentTarget).where(AssignmentTarget.assignment_id == a.id)) or 0 for a in assignments)
    attempts = list(db.scalars(select(Attempt).join(Assignment, Assignment.id == Attempt.assignment_id).join(Lab, Lab.id == Attempt.lab_id).where(Assignment.class_id == class_id, Lab.enabled.is_(True), Lab.slug.in_(PROTOTYPE_LAB_SLUGS))))
    results = [item for assignment in assignments for item in assignment_results(assignment.id, user, db)]
    selected = [item for item in results if item['score'] is not None]
    passed_count = sum(item['passed'] for item in results)
    return {"assignment_count": len(assignments), "target_count": target_count, "submitted_count": len(selected), "attempt_count": len(attempts), "passed_count": passed_count,
            "needs_reattempt_count": sum(item['needs_reattempt'] for item in results), "completion_rate": round(passed_count / target_count, 4) if target_count else 0,
            "average_score": round(sum(item['percentage'] for item in selected) / len(selected) / 100, 4) if selected else None, "pass_mark": PASS_PERCENT}


@app.get('/api/classes/{class_id}/workspace')
def class_workspace(class_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    classroom = owned_class(db, user, class_id)
    if user.role == 'student' and not db.scalar(select(ClassMember.id).where(ClassMember.class_id == class_id, ClassMember.student_id == user.id)):
        raise HTTPException(404, 'Class not found')
    teacher = db.get(User, classroom.teacher_id)
    query = select(Assignment).join(Lab, Lab.id == Assignment.lab_id).where(Assignment.class_id == class_id, Lab.enabled.is_(True), Lab.slug.in_(PROTOTYPE_LAB_SLUGS))
    if user.role == 'student':
        query = query.join(AssignmentTarget).where(AssignmentTarget.student_id == user.id)
    work = []
    for assignment in db.scalars(query.order_by(Assignment.created_at.desc())):
        lab = db.get(Lab, assignment.lab_id)
        item = {'id': str(assignment.id), 'title': assignment.title, 'lab_id': str(lab.id), 'lab_title': lab.title, 'instructions': assignment.instructions,
                'due_at': utc(assignment.due_at).isoformat() if assignment.due_at else None, 'scoring_policy': assignment.scoring_policy, 'max_attempts': assignment.max_attempts}
        if user.role == 'student':
            attempts = list(db.scalars(select(Attempt).where(Attempt.assignment_id == assignment.id, Attempt.user_id == user.id)))
            chosen = selected_attempt(assignment, attempts)
            active = db.scalar(select(LabSession.id).where(LabSession.assignment_id == assignment.id, LabSession.user_id == user.id, LabSession.status.in_(['starting', 'running'])))
            item.update({'attempts': len(attempts), 'status': ('Passed' if passed_attempt(chosen) else 'Needs reattempt') if chosen else ('In progress' if active else 'Not started'),
                         'score': chosen.score if chosen else None, 'max_score': chosen.max_score if chosen else None, 'active_session_id': str(active) if active else None,
                         'passed': passed_attempt(chosen) if chosen else False})
        else:
            item['students'] = assignment_results(assignment.id, user, db)
        work.append(item)
    response = {'id': str(classroom.id), 'name': classroom.name, 'term': classroom.term, 'teacher': f'{teacher.first_name} {teacher.last_name}', 'assignments': work, 'pass_mark': PASS_PERCENT}
    if user.role == 'student':
        membership = db.scalar(select(ClassMember).where(ClassMember.class_id == class_id, ClassMember.student_id == user.id))
        response['joined_at'] = utc(membership.created_at).isoformat()
    if user.role != 'student':
        response['join_code'] = classroom.join_code if classroom.join_code_enabled else None
        response['analytics'] = analytics(class_id, user, db)
        roster = members(class_id, user, db)
        student_ids = [uuid.UUID(student['id']) for student in roster]
        practice = list(db.execute(select(Attempt, Lab, User).join(Lab, Lab.id == Attempt.lab_id).join(User, User.id == Attempt.user_id).where(
            Attempt.user_id.in_(student_ids), Attempt.is_practice.is_(True), Attempt.assignment_id.is_(None),
            Lab.enabled.is_(True), Lab.slug.in_(PROTOTYPE_LAB_SLUGS)).order_by(Attempt.submitted_at.desc())))
        response['extra_practice'] = [{'id': str(attempt.id), 'student_id': str(student.id), 'student_name': f'{student.first_name} {student.last_name}',
                                      'lab_id': str(lab.id), 'lab_title': lab.title, 'score': attempt.score, 'max_score': attempt.max_score,
                                      'submitted_at': utc(attempt.submitted_at).isoformat(), 'duration_seconds': attempt.duration_seconds,
                                      **attempt_outcome(attempt)} for attempt, lab, student in practice]
        for student in roster:
            rows = [result for item in work for result in item['students'] if result['student_id'] == student['id']]
            student.update({'assigned': len(rows), 'submitted': sum(row['score'] is not None for row in rows), 'passed': sum(row['passed'] for row in rows),
                            'needs_reattempt': sum(row['needs_reattempt'] for row in rows), 'attempts': sum(row['attempts'] for row in rows),
                            'duration_seconds': sum(row['duration_seconds'] for row in rows)})
            extra = [item for item in response['extra_practice'] if item['student_id'] == student['id']]
            student['extra_practice_attempts'] = len(extra)
            student['extra_labs_passed'] = len({item['lab_id'] for item in extra if item['passed']})
        response['students'] = roster
    return response


@app.get("/api/assignments/{assignment_id}/export.csv")
def export_csv(assignment_id: uuid.UUID, user: User = Depends(require_user), db: Session = Depends(get_db)):
    role(user, "teacher", "admin")
    from fastapi.responses import PlainTextResponse
    from csv import writer
    from io import StringIO
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    if user.role == "teacher":
        owned_class(db, user, assignment.class_id)
    stream = StringIO()
    out = writer(stream)
    out.writerow(["student_email", "attempts", "selected_score", "max_score", "percentage", "result", "best_score", "latest_score", "time_spent_seconds"])
    for row in assignment_results(assignment_id, user, db):
        student = db.get(User, uuid.UUID(row["student_id"]))
        out.writerow([student.email, row["attempts"], row["score"], row['max_score'], row['percentage'], 'Passed' if row['passed'] else 'Needs reattempt' if row['needs_reattempt'] else 'Not submitted', row["best_score"], row["latest_score"], row['duration_seconds']])
    return PlainTextResponse(stream.getvalue(), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=assignment-{assignment_id}.csv"})


@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception):
    logger.exception(json.dumps({"event": "request.failed", "path": request.url.path, "error_type": type(exc).__name__}))
    return JSONResponse({"detail": "Internal server error"}, status_code=500)
