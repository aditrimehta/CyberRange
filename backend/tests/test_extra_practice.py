import uuid
from datetime import timedelta
from sqlalchemy import select
from app.db import SessionLocal
from app.models import User, Lab, LabSession, Attempt, Classroom, ClassMember, Assignment
from app.models import now
from conftest import login
from test_class_progress import setup_class


def test_teacher_can_review_enrolled_students_practice_but_not_unrelated_work(client, csrf, users):
    cid, _, lid = setup_class(users, scores=())
    with SessionLocal() as db:
        outsider = User(email='outsider@example.test', first_name='Outside', last_name='Student', role='student', password_hash=users['student'].password_hash)
        teacher2 = User(email='teacher2@example.test', first_name='Other', last_name='Teacher', role='teacher', password_hash=users['teacher'].password_hash)
        db.add_all([outsider, teacher2]); db.flush()
        foreign = Classroom(teacher_id=teacher2.id, name='Other classroom', term='', join_code='OTHER123')
        db.add(foreign); db.flush()
        foreign_assignment = Assignment(class_id=foreign.id, lab_id=uuid.UUID(lid), created_by=teacher2.id, title='Other teacher work')
        db.add(foreign_assignment); db.flush()
        ids = []
        for student_id, assignment_id in [(users['student'].id, None), (outsider.id, None), (users['student'].id, foreign_assignment.id)]:
            session = LabSession(user_id=student_id, lab_id=uuid.UUID(lid), assignment_id=assignment_id, mode='graded' if assignment_id else 'practice', status='stopped', started_at=now(), last_activity_at=now(), expires_at=now()+timedelta(minutes=20), runtime_refs={}, secrets_encrypted='')
            db.add(session); db.flush()
            attempt = Attempt(session_id=session.id, user_id=student_id, lab_id=uuid.UUID(lid), assignment_id=assignment_id, is_practice=assignment_id is None, duration_seconds=180, score=60, max_score=60,
                              answers={'q1': 'saved practice answer'}, per_question_results=[{'qid': 'q1', 'prompt': 'Training question', 'correct': True, 'points_earned': 10, 'points_possible': 10, 'explanation': 'Feedback'}])
            db.add(attempt); db.flush(); ids.append(str(attempt.id))
        db.commit()
    login(client, 'teacher@example.test')
    view = client.get(f'/api/classes/{cid}/workspace').json()
    assert [row['id'] for row in view['extra_practice']] == [ids[0]]
    assert view['analytics']['completion_rate'] == 0
    assert view['analytics']['submitted_count'] == 0
    review = client.get(f'/api/attempts/{ids[0]}')
    assert review.status_code == 200 and review.json()['answers']['q1'] == 'saved practice answer'
    assert client.get(f'/api/attempts/{ids[1]}').status_code == 404
    assert client.get(f'/api/attempts/{ids[2]}').status_code == 404
    history = client.get(f"/api/students/{users['student'].id}/history").json()
    assert [item['id'] for item in history] == [ids[0]]
    with SessionLocal() as db:
        member = db.scalar(select(ClassMember).where(ClassMember.class_id == uuid.UUID(cid), ClassMember.student_id == users['student'].id))
        db.delete(member); db.commit()
    assert client.get(f'/api/attempts/{ids[0]}').status_code == 404
