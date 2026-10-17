import pytest
from sqlalchemy import select
from app.db import SessionLocal
from app.models import Lab, LabQuestion
from app.scenarios import profile_questions
from app.grading import grade


@pytest.mark.parametrize('slug,profile,answers,copied', [
    ('nmap-network-recon', {'close_port': 9201, 'service': 'reports', 'extra_service': True},
     {'q1': 'SSH', 'q2': 4, 'q3': 'http', 'q4': 'reports', 'q5': 'closed'}, {'q2': 3, 'q4': 'inventory'}),
    ('sql-injection', {'account_count': 6, 'admin_role': 'owner', 'payload': "' OR 1=1 -- "},
     {'q1': 'An always-true OR condition', 'q2': 'parameterized queries', 'q3': 6, 'q4': 'owner', 'q5': 'Use parameterized SQL'}, {'q3': 3, 'q4': 'administrator'}),
])
def test_grading_uses_the_session_profile_and_rejects_other_variant_answers(client, slug, profile, answers, copied):
    with SessionLocal() as db:
        lab = db.scalar(select(Lab).where(Lab.slug == slug))
        questions = list(db.scalars(select(LabQuestion).where(LabQuestion.lab_id == lab.id)))
        profiled = profile_questions(questions, slug, profile)
        assert grade(profiled, answers, {})[:2] == (60, 60)
        assert grade(profiled, {**answers, **copied}, {})[:2] == (30, 60)
