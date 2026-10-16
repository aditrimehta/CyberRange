"""Create a local demo institution; never run in production."""
import os
import secrets
import sys

sys.path.insert(0, os.environ.get("BACKEND_PATH", os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.db import Base, SessionLocal, engine
from app.main import sync_packages
from app.models import Assignment, AssignmentTarget, ClassMember, Classroom, Lab, User
from app.security import hash_password

if os.getenv("APP_ENV", "development") == "production":
    raise SystemExit("Refusing to seed a production environment")
Base.metadata.create_all(engine)
with SessionLocal() as db:
    sync_packages(db)
    if db.query(User).filter_by(email="admin@cyberrange.local").first():
        raise SystemExit("Demo data already exists; refusing to reset passwords")
    creds = {"admin@cyberrange.local": "RangeAdmin!2026", "teacher@cyberrange.local": "RangeTeacher!2026", **{f"student{i}@cyberrange.local": f"RangeStudent{i}!2026" for i in range(1, 4)}}
    users = {}
    for email, password in creds.items():
        role = "admin" if email.startswith("admin") else "teacher" if email.startswith("teacher") else "student"
        user = User(email=email, first_name=role.title(), last_name="Demo", role=role, password_hash=hash_password(password), email_verified_at=__import__("app.models", fromlist=["now"]).now(), aup_accepted_at=__import__("app.models", fromlist=["now"]).now())
        db.add(user)
        users[email] = user
    db.flush()
    code = "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(8))
    classroom = Classroom(teacher_id=users["teacher@cyberrange.local"].id, name="Cyber Range Demo", term="Fall 2026", join_code=code)
    db.add(classroom)
    db.flush()
    for i in range(1, 4):
        db.add(ClassMember(class_id=classroom.id, student_id=users[f"student{i}@cyberrange.local"].id))
    lab = db.query(Lab).first()
    if lab:
        assignment = Assignment(lab_id=lab.id, class_id=classroom.id, created_by=users["teacher@cyberrange.local"].id, title=f"Introduction: {lab.title}", instructions="Complete the guide and submit your answers.", max_attempts=3, scoring_policy="best")
        db.add(assignment)
        db.flush()
        for i in range(1, 4):
            db.add(AssignmentTarget(assignment_id=assignment.id, student_id=users[f"student{i}@cyberrange.local"].id))
    db.commit()
    print("Demo credentials (change before deployment):")
    for email, password in creds.items():
        print(f"  {email} / {password}")
    print(f"Student join code: {code}")
