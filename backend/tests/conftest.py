import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///./test-cyberrange.db"
os.environ["APP_ENV"] = "development"
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app, runtime
from app.models import User, now
from app.security import hash_password


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    if hasattr(runtime, "sessions"):
        runtime.sessions.clear()
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def users():
    created = {}
    with SessionLocal() as db:
        for role in ("admin", "teacher", "student", "other"):
            user = User(email=f"{role}@example.test", first_name=role.title(), last_name="Test", role="student" if role == "other" else role, password_hash=hash_password("RangeDemo!Password2026"), email_verified_at=now(), aup_accepted_at=now())
            db.add(user)
            created[role] = user
        db.commit()
        for role, user in created.items():
            db.refresh(user)
    return created


def login(client, email: str = "student@example.test") -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": "RangeDemo!Password2026"})
    assert response.status_code == 200, response.text
    csrf = client.get("/api/auth/csrf").json()["csrf_token"]
    return csrf


@pytest.fixture
def csrf(client, users):
    return login(client)
