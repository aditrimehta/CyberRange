from datetime import timedelta
import pytest
from sqlalchemy import select
from app.db import SessionLocal
from app.main import passed_attempt, runtime
from app.models import User, Classroom, ClassMember, Assignment, AssignmentTarget, Lab, LabSession, Attempt, now
from conftest import login


def setup_class(users, scores=(40, 48)):
    with SessionLocal() as db:
        lab = db.scalar(select(Lab).where(Lab.slug == 'sql-injection'))
        classroom = Classroom(teacher_id=users['teacher'].id, name='Security 101', term='Fall', join_code='CLASS123')
        db.add(classroom); db.flush()
        for key in ('student', 'other'):
            db.add(ClassMember(class_id=classroom.id, student_id=users[key].id))
        assignment = Assignment(class_id=classroom.id, lab_id=lab.id, created_by=users['teacher'].id, title='Login investigation', max_attempts=1, scoring_policy='best')
        db.add(assignment); db.flush()
        for key in ('student', 'other'):
            db.add(AssignmentTarget(assignment_id=assignment.id, student_id=users[key].id))
        for index, score in enumerate(scores):
            session = LabSession(user_id=users['student'].id, lab_id=lab.id, assignment_id=assignment.id, mode='graded', status='stopped', started_at=now(), last_activity_at=now(), expires_at=now() + timedelta(minutes=20), runtime_refs={}, secrets_encrypted='')
            db.add(session); db.flush()
            db.add(Attempt(session_id=session.id, user_id=users['student'].id, lab_id=lab.id, assignment_id=assignment.id, is_practice=False, submitted_at=now() + timedelta(seconds=index), duration_seconds=120, score=score, max_score=60, answers={'q1': 'saved answer'}, per_question_results=[]))
        db.commit()
        return str(classroom.id), str(assignment.id), str(lab.id)


@pytest.mark.parametrize('score,maximum,expected', [(47, 60, False), (48, 60, True), (60, 60, True), (0, 0, False)])
def test_eighty_percent_boundary(score, maximum, expected):
    from types import SimpleNamespace
    assert passed_attempt(SimpleNamespace(score=score, max_score=maximum)) is expected


def test_classroom_progress_distinguishes_submission_and_pass_and_restricts_access(client, csrf, users):
    cid, aid, _ = setup_class(users)
    student = client.get(f'/api/classes/{cid}/workspace')
    assert student.status_code == 200
    assert 'students' not in student.json() and 'analytics' not in student.json()
    assignment = student.json()['assignments'][0]
    assert assignment['status'] == 'Passed' and assignment['attempts'] == 2
    login(client, 'teacher@example.test')
    teacher = client.get(f'/api/classes/{cid}/workspace').json()
    assert teacher['analytics']['submitted_count'] == 1
    assert teacher['analytics']['attempt_count'] == 2
    assert teacher['analytics']['passed_count'] == 1
    assert teacher['analytics']['completion_rate'] == 0.5
    assert teacher['analytics']['average_score'] == 0.8
    assert teacher['students'][0]['attempts'] in (0, 2)
    # Another teacher cannot inspect this classroom.
    with SessionLocal() as db:
        stranger = User(email='stranger@example.test', first_name='Other', last_name='Teacher', role='teacher', password_hash=users['teacher'].password_hash, email_verified_at=now(), aup_accepted_at=now())
        db.add(stranger); db.commit()
    login(client, 'stranger@example.test')
    assert client.get(f'/api/classes/{cid}/workspace').status_code == 404
    assert client.get(f'/api/analytics/classes/{cid}').status_code == 404


@pytest.mark.parametrize('score,expected', [(40, 200), (48, 403)])
def test_failed_student_can_remediate_beyond_attempt_limit(client, csrf, users, monkeypatch, score, expected):
    cid, aid, lid = setup_class(users, scores=(score,))
    monkeypatch.setattr(runtime, 'start', lambda *args: {'status': 'running'})
    response = client.post('/api/lab-sessions', headers={'X-CSRF-Token': csrf}, json={'lab_id': lid, 'assignment_id': aid})
    assert response.status_code == expected, response.text
    detail = client.get(f'/api/classes/{cid}/workspace').json()
    assert detail['assignments'][0]['status'] == ('Needs reattempt' if score < 48 else 'Passed')


def test_unenrolled_student_cannot_open_classroom(client, csrf, users):
    cid, _, _ = setup_class(users)
    with SessionLocal() as db:
        membership = db.scalar(select(ClassMember).where(ClassMember.class_id == __import__('uuid').UUID(cid), ClassMember.student_id == users['other'].id))
        db.delete(membership); db.commit()
    login(client, 'other@example.test')
    assert client.get(f'/api/classes/{cid}/workspace').status_code == 404
