from types import SimpleNamespace
import pytest
from app.runtime import DockerLabRuntime


def test_stop_removes_session_data_and_only_then_forgets_environment(monkeypatch):
    runtime = DockerLabRuntime()
    refs = {'runtime': 'docker', 'project': 'cr-test', 'session_id': 'test', 'status': 'running'}
    runtime.sessions['test'] = refs
    calls = []
    def compose(project, *args, **kwargs):
        calls.append((project, args))
        return SimpleNamespace(returncode=0, stdout='', stderr='')
    monkeypatch.setattr(runtime, '_compose', compose)
    runtime.stop(refs)
    assert calls[0][0] == 'cr-test'
    assert 'down' in calls[0][1] and '--volumes' in calls[0][1]
    assert refs['status'] == 'stopped'
    assert 'test' not in runtime.sessions


def test_failed_cleanup_stays_tracked_for_retry(monkeypatch):
    runtime = DockerLabRuntime()
    refs = {'runtime': 'docker', 'project': 'cr-test', 'session_id': 'test', 'status': 'running'}
    runtime.sessions['test'] = refs
    monkeypatch.setattr(runtime, '_compose', lambda *args, **kwargs: SimpleNamespace(returncode=1, stdout='', stderr='Docker unavailable'))
    with pytest.raises(RuntimeError):
        runtime.stop(refs)
    assert runtime.sessions['test']['status'] == 'running'
