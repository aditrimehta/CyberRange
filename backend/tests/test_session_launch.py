from datetime import timedelta
from unittest.mock import Mock
import pytest
from sqlalchemy import select
from app.db import SessionLocal
from app.main import runtime
from app.models import Lab, LabSession, now


@pytest.mark.parametrize('old_state', ['running', 'starting', 'expired', 'dead', 'different'])
def test_launch_resumes_or_reconciles_existing_sessions(client, csrf, users, monkeypatch, old_state):
    start = Mock(return_value={'status': 'running'})
    stop = Mock()
    monkeypatch.setattr(runtime, 'start', start)
    monkeypatch.setattr(runtime, 'stop', stop)
    monkeypatch.setattr(runtime, 'status', lambda refs: 'stopped' if old_state == 'dead' else 'running')
    with SessionLocal() as db:
        labs = list(db.scalars(select(Lab).where(Lab.enabled.is_(True))))
        selected = labs[0]
        old = LabSession(user_id=users['student'].id, lab_id=(labs[1] if old_state == 'different' else selected).id,
                         mode='practice', status='starting' if old_state == 'starting' else 'running',
                         started_at=now(), last_activity_at=now(), expires_at=now() + timedelta(minutes=-1 if old_state == 'expired' else 20),
                         runtime_refs={'status': 'running'}, secrets_encrypted='')
        db.add(old)
        db.commit()
        old_id, lab_id = str(old.id), str(selected.id)
    response = client.post('/api/lab-sessions', headers={'X-CSRF-Token': csrf}, json={'lab_id': lab_id})
    if old_state == 'different':
        assert response.status_code == 409, response.text
        assert response.json()['detail']['active_session']['id'] == old_id
        start.assert_not_called()
        stop.assert_not_called()
    else:
        assert response.status_code == 200, response.text
        if old_state in {'running', 'starting'}:
            assert response.json()['id'] == old_id
            assert response.json()['resumed'] is True
            start.assert_not_called()
            stop.assert_not_called()
        else:
            assert response.json()['id'] != old_id
            start.assert_called_once()
            stop.assert_called_once()
