"""Server-selected incident details, fixed for the lifetime of a lab session."""
import json
import secrets
from pathlib import Path
from types import SimpleNamespace

POOL = json.loads((Path(__file__).resolve().parents[2] / 'labs/runtime/target/incidents.json').read_text())
LEGACY_SCENARIO = {'actor': 'alex', 'source': '192.0.2.44', 'failure_count': 3, 'file': 'draft.zip'}


def choose_log_scenario():
    return {key: secrets.choice(POOL[pool]) for key, pool in (
        ('actor', 'actors'), ('source', 'sources'), ('failure_count', 'failure_counts'), ('file', 'files'))}


def choose_lab_profile(slug):
    if slug == 'nmap-network-recon':
        return {'close_port': secrets.choice([9001, 9101, 9201]), 'service': secrets.choice(['inventory', 'metrics', 'reports']),
                'extra_service': secrets.choice([True, False])}
    if slug == 'sql-injection':
        return {'account_count': secrets.choice([3, 4, 5, 6]), 'admin_role': secrets.choice(['administrator', 'owner', 'supervisor']),
                'payload': secrets.choice(["' OR '1'='1' -- ", "' OR 1=1 -- ", "' OR 'a'='a' -- "])}
    return {}


def profile_questions(questions, slug, profile):
    if not profile:
        return questions
    if slug == 'nmap-network-recon':
        values = {'q2': 4 if profile['extra_service'] else 3, 'q4': profile['service']}
    elif slug == 'sql-injection':
        values = {'q3': profile['account_count'], 'q4': profile['admin_role']}
    else:
        return questions
    output = []
    for question in questions:
        if question.qid not in values:
            output.append(question)
            continue
        value = values[question.qid]
        spec = {'answer': value, 'accepted': [value]} if question.type == 'short_text' else {'answer': value, 'tolerance': 0}
        output.append(SimpleNamespace(qid=question.qid, type=question.type, points=question.points, answer_spec=spec,
                                      explanation=f'Your session’s observed result is {value}.'))
    return output


def log_questions(questions, scenario):
    if not scenario:
        return questions
    answers = {'q1': scenario['actor'], 'q2': scenario['source'], 'q3': scenario['failure_count'], 'q4': scenario['file']}
    result = []
    for question in questions:
        if question.qid not in answers:
            result.append(question)
            continue
        value = answers[question.qid]
        spec = {'answer': value, 'accepted': [value]} if question.type == 'short_text' else {'answer': value, 'tolerance': 0}
        result.append(SimpleNamespace(qid=question.qid, type=question.type, points=question.points,
                                      answer_spec=spec, explanation=f'The log for your session shows {value}.'))
    return result
