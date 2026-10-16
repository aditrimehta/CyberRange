from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from socket import SO_REUSEADDR, SOL_SOCKET, socket
from threading import Thread


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"CyberRange local target. Service inventory: training web application.\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


def banner_server(port, banner):
    server = socket()
    server.setsockopt(SOL_SOCKET, SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", port))
    server.listen(16)
    while True:
        connection, _ = server.accept()
        with connection:
            connection.sendall(banner)


Thread(target=banner_server, args=(2222, b"SSH-2.0-CyberRange-Training\r\n"), daemon=True).start()
Thread(target=banner_server, args=(9001, b"CyberRange service=inventory\r\n"), daemon=True).start()
ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
