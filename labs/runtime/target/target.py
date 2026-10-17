from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from socket import SO_REUSEADDR, SOL_SOCKET, socket
from threading import Thread
from pathlib import Path
from datetime import datetime, timezone
import json
import os

STATE = Path('/state')
STATE.mkdir(exist_ok=True)
ALLOWED_FILES = json.loads(Path(__file__).with_name('incidents.json').read_text())['files']
PROFILE = json.loads(os.environ.get('CR_LAB_PROFILE') or '{}')
CLOSE_PORT = PROFILE.get('close_port', 9001)


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        size = min(int(self.headers.get('Content-Length', '0')), 4096)
        data = json.loads(self.rfile.read(size))
        source = self.headers.get('X-Training-Source', '192.0.2.10')
        actor = data.get('actor', 'unknown')
        if self.path == '/training/login':
            result = 'success' if data.get('password') == 'training-password' else 'failed'
            action = 'login'
        elif self.path == '/training/upload':
            filename = data.get('file', 'draft.zip')
            if filename not in ALLOWED_FILES:
                self.send_error(400)
                return
            (STATE / filename).write_text('Fictional training upload')
            action, result = 'file_upload', 'success'
        else:
            self.send_error(404)
            return
        line = f"{datetime.now(timezone.utc).isoformat()} src={source} actor={actor} action={action} result={result}"
        if action == 'file_upload':
            line += f' file={filename}'
        with (STATE / 'access.log').open('a') as log:
            log.write(line + '\n')
        body = json.dumps({'result': result}).encode()
        self.send_response(200)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        body = b"CyberRange local target. Service inventory: training web application.\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


def send_banner(connection, banner):
    with connection:
        connection.settimeout(4)
        try:
            connection.sendall(banner)
            connection.recv(4096)
        except (TimeoutError, OSError):
            pass


def banner_server(port, banner):
    server = socket()
    server.setsockopt(SOL_SOCKET, SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", port))
    server.listen(16)
    server.settimeout(0.2)
    while True:
        if port == CLOSE_PORT and (STATE / 'inventory-disabled').exists():
            server.close()
            return
        try:
            connection, _ = server.accept()
        except TimeoutError:
            continue
        Thread(target=send_banner, args=(connection, banner), daemon=True).start()


Thread(target=banner_server, args=(2222, b"SSH-2.0-CyberRange-Training\r\n"), daemon=True).start()
Thread(target=banner_server, args=(CLOSE_PORT, f"CyberRange service={PROFILE.get('service', 'inventory')}\r\n".encode()), daemon=True).start()
if PROFILE.get('extra_service'):
    Thread(target=banner_server, args=(9301, b"CyberRange service=status\r\n"), daemon=True).start()
ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
