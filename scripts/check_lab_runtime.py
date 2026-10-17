"""Exercise all three real environments, then verify they are removed."""
import json
import os
import sys
import uuid
import argparse
from types import SimpleNamespace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from app.runtime import DockerLabRuntime
from app.scenarios import choose_log_scenario, choose_lab_profile


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--lab', choices=['nmap-network-recon', 'sql-injection', 'traffic-forensics'])
    options = parser.parse_args()
    runtime = DockerLabRuntime(os.environ.get('LAB_VM_DISTRO', 'Ubuntu'))
    for slug in ('nmap-network-recon', 'sql-injection', 'traffic-forensics'):
        if options.lab and slug != options.lab:
            continue
        scenario = choose_log_scenario()
        profile = choose_lab_profile(slug)
        refs = runtime.start(SimpleNamespace(id=uuid.uuid4()), {'slug': slug}, {'log_scenario': scenario, 'lab_profile': profile})
        try:
            def run(action, **values):
                result = runtime.lab_action(refs, action, values)
                assert result['exit_code'] == 0, result
                return result
            if slug == 'nmap-network-recon':
                baseline = run('scan')['output']
                assert f"{profile['close_port']}/tcp open" in baseline
                assert profile['service'] in baseline, baseline
                run('close_service')
                assert f"{profile['close_port']}/tcp closed" in run('scan')['output']
            elif slug == 'sql-injection':
                values = {'username': profile['payload'], 'password': 'wrong'}
                accounts = json.loads(run('vulnerable_login', **values)['output'])['matched_accounts']
                assert len(accounts) == profile['account_count']
                assert accounts[0]['role'] == profile['admin_role']
                assert json.loads(run('safe_login', **values)['output'])['matched_accounts'] == []
                assert json.loads(run('vulnerable_login', **values)['output'])['matched_accounts'] == []
                assert len(json.loads(run('vulnerable_login', username='student', password='demo-student-password')['output'])['matched_accounts']) == 1
            else:
                assert run('search_logs', query='failed')['matches'] == 0
                run('generate_incident')
                assert run('search_logs', query='failed')['matches'] == scenario['failure_count']
                assert run('search_logs', query=scenario['source'])['matches'] == scenario['failure_count']
                assert scenario['actor'] in run('search_logs', query='result=success')['output']
                assert scenario['file'] in run('search_logs', query='action=file_upload')['output']
                run('generate_incident')
                assert run('search_logs', query='failed')['matches'] == scenario['failure_count']
            print(f'PASS {slug}: actions verified', flush=True)
        finally:
            runtime.stop(refs)
            result = runtime._compose(refs['project'], 'ps', '-a', '-q')
            assert result.returncode == 0 and not result.stdout.strip(), result
            print(f'PASS {slug}: environment removed', flush=True)


if __name__ == '__main__':
    main()
