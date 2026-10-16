import uuid
from datetime import timedelta

from sqlalchemy import select

from app.db import SessionLocal
from app.main import runtime
from app.models import Attempt, Classroom, Lab, LabQuestion, LabSession, now


def make_lab(db, slug="test-lab"):
    manifest = {"slug": slug, "title": "Test lab", "summary": "An isolated practice exercise.", "category": "Testing", "difficulty": "beginner", "estimated_minutes": 20, "version": 1, "objectives": ["Practice safe testing"], "questions": [{"id": "q1", "type": "mcq", "prompt": "Pick the correct answer", "points": 10, "options": ["correct", "wrong"], "answer": "correct", "explanation": "Correct because it is correct."}]}
    lab = Lab(slug=slug, title="Test lab", summary=manifest["summary"], category="Testing", difficulty="beginner", estimated_minutes=20, version=1, enabled=True, manifest=manifest, guide_markdown="# Test guide")
    db.add(lab)
    db.flush()
    db.add(LabQuestion(lab_id=lab.id, qid="q1", type="mcq", prompt="Pick the correct answer", points=10, position=0, hints=[], answer_spec={"answer": "correct"}, public_options=["correct", "wrong"], explanation="Correct because it is correct."))
    db.flush()
    return lab


def test_student_auth_lockout_is_generic(client, users):
    for _ in range(8):
        response = client.post("/api/auth/login", json={"email": "student@example.test", "password": "Wrong!Password2026"})
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"
    assert client.post("/api/auth/login", json={"email": "student@example.test", "password": "RangeDemo!Password2026"}).status_code == 401


def test_student_catalog_does_not_leak_answer_keys(client, csrf, users):
    with SessionLocal() as db:
        lab = make_lab(db)
        lab.manifest["questions"][0]["answer"] = "UNIQUE_SECRET_ANSWER_42"
        db.commit()
        slug = lab.slug
    response = client.get(f"/api/labs/{slug}")
    assert response.status_code == 200
    assert "UNIQUE_SECRET_ANSWER_42" not in response.text
    assert "answer" not in response.text


def test_practice_session_grades_server_side_and_persists_attempt(client, csrf, users):
    with SessionLocal() as db:
        lab = make_lab(db)
        db.commit()
        lab_id = str(lab.id)
    response = client.post("/api/lab-sessions", headers={"X-CSRF-Token": csrf}, json={"lab_id": lab_id})
    assert response.status_code == 200, response.text
    session_id = response.json()["id"]
    result = client.post(f"/api/lab-sessions/{session_id}/submit", headers={"X-CSRF-Token": csrf}, json={"answers": {"q1": "correct"}})
    assert result.status_code == 200, result.text
    assert result.json()["score"] == 10
    with SessionLocal() as db:
        attempt = db.scalar(select(Attempt).where(Attempt.session_id == uuid.UUID(session_id)))
        session = db.get(LabSession, uuid.UUID(session_id))
        assert attempt and attempt.is_practice and attempt.score == 10
        assert session and session.status == "stopped"
    detail = client.get(f"/api/lab-sessions/{session_id}")
    assert detail.json()["attempt_id"] == result.json()["attempt_id"]


def test_student_cannot_read_another_students_session(client, csrf, users):
    with SessionLocal() as db:
        lab = make_lab(db)
        other = users["other"]
        row = LabSession(user_id=other.id, lab_id=lab.id, assignment_id=None, mode="practice", status="running", started_at=now(), last_activity_at=now(), expires_at=now() + timedelta(minutes=20), runtime_refs={"status": "running"}, secrets_encrypted="")
        db.add(row)
        db.commit()
        session_id = row.id
    assert client.get(f"/api/lab-sessions/{session_id}").status_code == 404


def test_class_join_and_assignment_targets_are_scoped(client, csrf, users):
    with SessionLocal() as db:
        lab = make_lab(db)
        classroom = Classroom(teacher_id=users["teacher"].id, name="Owned class", term="Fall", join_code="ABCD2345")
        db.add(classroom)
        db.commit()
        class_id, lab_id = str(classroom.id), str(lab.id)
    teacher_csrf = None
    teacher_context = client.__class__(client.app)
    teacher_context.post("/api/auth/login", json={"email": "teacher@example.test", "password": "RangeDemo!Password2026"})
    teacher_csrf = teacher_context.get("/api/auth/csrf").json()["csrf_token"]
    joined = client.post("/api/classes/join", headers={"X-CSRF-Token": csrf}, json={"code": "ABCD2345"})
    assert joined.status_code == 200
    assignment = teacher_context.post("/api/assignments", headers={"X-CSRF-Token": teacher_csrf}, json={"lab_id": lab_id, "class_id": class_id, "title": "Practice", "student_ids": [str(users["other"].id)]})
    assert assignment.status_code == 422
    assignment = teacher_context.post("/api/assignments", headers={"X-CSRF-Token": teacher_csrf}, json={"lab_id": lab_id, "class_id": class_id, "title": "Practice"})
    assert assignment.status_code == 200
