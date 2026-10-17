import uuid
from datetime import timedelta
from app.db import SessionLocal
from app.models import LabSession, now
from conftest import login
from test_class_progress import setup_class


def test_monitor_names_and_classroom_scope(client, csrf, users):
    cid, aid, lid = setup_class(users, scores=())
    with SessionLocal() as db:
        row = LabSession(user_id=users['student'].id, lab_id=uuid.UUID(lid), assignment_id=uuid.UUID(aid), mode='graded', status='running',
                         started_at=now(), last_activity_at=now(), expires_at=now() + timedelta(minutes=20), runtime_refs={}, secrets_encrypted='')
        db.add(row); db.commit()
    login(client, 'teacher@example.test')
    response = client.get('/api/monitor/sessions')
    assert response.status_code == 200
    session = response.json()[0]
    assert session['student_name'] == 'Student Test'
    assert session['class_name'] == 'Security 101'
    assert session['lab_title'] == 'SQL Injection and Parameterized Queries'
    assert session['expires_at'].endswith('+00:00')
    with SessionLocal() as db:
        from app.models import User
        other = db.get(User, users['other'].id)
        other.role = 'teacher'; db.commit()
    login(client, 'other@example.test')
    assert client.get('/api/monitor/sessions').json() == []
