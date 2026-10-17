import json
import pytest
from sqlalchemy import select
from app.db import SessionLocal
from app.main import runtime
from app.models import Lab, LabSession
from app.scenarios import choose_log_scenario, POOL


def test_scenario_selection_draws_each_detail_from_the_pool(monkeypatch):
    monkeypatch.setattr('app.scenarios.secrets.choice', lambda values: values[-1])
    assert choose_log_scenario() == {'actor': POOL['actors'][-1], 'source': POOL['sources'][-1],
                                     'failure_count': POOL['failure_counts'][-1], 'file': POOL['files'][-1]}


@pytest.mark.parametrize('copied', [False, True])
def test_variant_is_saved_hidden_and_graded_against_its_own_log(client, csrf, users, monkeypatch, copied):
    scenario = {'actor': 'taylor', 'source': '203.0.113.82', 'failure_count': 6, 'file': 'roster.csv'}
    monkeypatch.setattr('app.main.choose_log_scenario', lambda: scenario)
    monkeypatch.setattr(runtime, 'start', lambda session, manifest, secrets: {'runtime': 'docker', 'status': 'running', 'log_scenario': secrets['log_scenario']})
    monkeypatch.setattr(runtime, 'status', lambda refs: 'running')
    monkeypatch.setattr(runtime, 'stop', lambda refs: None)
    def action(refs, name, values):
        if name == 'generate_incident':
            return {'output': 'Generated', 'exit_code': 0, 'incident_generated': True}
        output = f"src={scenario['source']} actor=unknown action=login result=failed" if values['query'] == 'failed' else f"src=192.0.2.10 actor={scenario['actor']} action=file_upload file={scenario['file']}"
        return {'output': output, 'exit_code': 0, 'matches': 1}
    monkeypatch.setattr(runtime, 'lab_action', action)
    with SessionLocal() as db:
        lab = db.scalar(select(Lab).where(Lab.slug == 'traffic-forensics'))
        lab_id = str(lab.id)
    headers = {'X-CSRF-Token': csrf}
    launched = client.post('/api/lab-sessions', headers=headers, json={'lab_id': lab_id})
    assert launched.status_code == 200, launched.text
    sid = launched.json()['id']
    # Reopening keeps the same scenario instead of selecting a new one.
    resumed = client.post('/api/lab-sessions', headers=headers, json={'lab_id': lab_id})
    assert resumed.json()['id'] == sid
    detail = client.get(f'/api/lab-sessions/{sid}')
    assert 'log_scenario' not in detail.text and 'taylor' not in detail.text
    connection = client.get(f'/api/lab-sessions/{sid}/connect')
    assert 'taylor' not in connection.text
    with SessionLocal() as db:
        import uuid
        assert db.get(LabSession, uuid.UUID(sid)).runtime_refs['log_scenario'] == scenario
    for name, values in [('generate_incident', {}), ('search_logs', {'query': 'failed'}), ('search_logs', {'query': 'action=file_upload'})]:
        response = client.post(f'/api/lab-sessions/{sid}/actions', headers=headers, json={'action': name, 'values': values})
        assert response.status_code == 200, response.text
    assert scenario['source'] in response.json()['lab_evidence']['log_searches']
    answers = {'q1': 'alex', 'q2': '192.0.2.44', 'q3': 3, 'q4': 'draft.zip'} if copied else {'q1': scenario['actor'], 'q2': scenario['source'], 'q3': scenario['failure_count'], 'q4': scenario['file']}
    answers['q5'] = 'Review the source and account activity'
    submitted = client.post(f'/api/lab-sessions/{sid}/submit', headers=headers, json={'answers': answers})
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()['score'] == (10 if copied else 60)
