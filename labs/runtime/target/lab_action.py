"""Fixed teaching actions executed inside a disposable lab environment."""
import json
import os
import sqlite3
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen

STATE = Path('/state')
POOL = json.loads(Path(__file__).with_name('incidents.json').read_text())
PROFILE = json.loads(os.environ.get('CR_LAB_PROFILE') or '{}')


def login(mode, username, password):
    database = sqlite3.connect(STATE / 'accounts.db')
    database.execute('CREATE TABLE IF NOT EXISTS accounts (username TEXT, password TEXT, role TEXT)')
    if not database.execute('SELECT COUNT(*) FROM accounts').fetchone()[0]:
        accounts = [
            ('admin', 'demo-admin-password', PROFILE.get('admin_role', 'administrator')),
            ('analyst', 'demo-analyst-password', 'analyst'),
            ('student', 'demo-student-password', 'student'),
        ]
        accounts += [(f'viewer{i}', 'demo-viewer-password', 'viewer') for i in range(PROFILE.get('account_count', 3) - 3)]
        database.executemany('INSERT INTO accounts VALUES (?, ?, ?)', accounts)
        database.commit()
    if mode == 'safe':
        (STATE / 'parameterized').touch()
    protected = (STATE / 'parameterized').exists()
    try:
        if protected:
            query = 'SELECT username, role FROM accounts WHERE username = ? AND password = ?'
            rows = database.execute(query, (username, password)).fetchall()
        else:
            query = f"SELECT username, role FROM accounts WHERE username = '{username}' AND password = '{password}'"
            rows = database.execute(query).fetchall()
        return {'mode': 'parameterized' if protected else 'vulnerable', 'query_template': query,
                'matched_accounts': [{'username': row[0], 'role': row[1]} for row in rows]}
    except sqlite3.Error:
        return {'mode': 'vulnerable', 'error': 'The input produced invalid SQL. Try the training payload.', 'matched_accounts': []}
    finally:
        database.close()


def send(path, source, **values):
    request = Request('http://127.0.0.1:8080/training/' + path, data=json.dumps(values).encode(),
                      headers={'Content-Type': 'application/json', 'X-Training-Source': source})
    with urlopen(request, timeout=3) as response:
        response.read()


def execute(action, values):
    if action in {'vulnerable', 'safe'}:
        return login(action, *values)
    if action == 'close_service':
        (STATE / 'inventory-disabled').touch()
        time.sleep(0.4)
        return {'output': f"Disabled the unnecessary listener on port {PROFILE.get('close_port', 9001)}. Rescan to verify."}
    if action == 'generate_incident':
        if (STATE / 'incident-generated').exists():
            return {'output': 'Activity already generated. Search the existing evidence.', 'incident_generated': True}
        scenario = json.loads(values[0]) if values else {'actor': 'alex', 'source': '192.0.2.44', 'failure_count': 3, 'file': 'draft.zip'}
        for key, pool in (('actor', 'actors'), ('source', 'sources'), ('failure_count', 'failure_counts'), ('file', 'files')):
            if scenario.get(key) not in POOL[pool]:
                raise ValueError('Unknown training scenario')
        send('login', '192.0.2.10', actor=scenario['actor'], password='training-password')
        for _ in range(scenario['failure_count']):
            send('login', scenario['source'], actor='unknown', password='wrong-password')
        send('upload', '192.0.2.10', actor=scenario['actor'], file=scenario['file'])
        (STATE / 'incident-generated').touch()
        return {'output': 'Generated a successful login, a burst of failed logins, and a fictional file upload. Investigate /state/access.log to discover the details for your session.', 'incident_generated': True}
    if action == 'search_logs':
        path = STATE / 'access.log'
        lines = path.read_text().splitlines() if path.exists() else []
        matches = [line for line in lines if values[0].strip().casefold() in line.casefold()][:20]
        return {'output': '\n'.join(matches) if matches else 'No matching events. Generate activity first, then try another search.', 'matches': len(matches)}
    raise ValueError('Unknown training action')


if __name__ == '__main__':
    print(json.dumps(execute(sys.argv[1], sys.argv[2:])))
