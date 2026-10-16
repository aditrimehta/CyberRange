import os
import sqlite3
from flask import Flask, request

app = Flask(__name__)
db = sqlite3.connect("/tmp/training.db", check_same_thread=False)
db.execute("CREATE TABLE IF NOT EXISTS users (name TEXT, password TEXT)")
db.executemany("INSERT INTO users VALUES (?, ?)", [("admin", "synthetic-admin-only"), ("analyst", "training-only"), ("guest", "guest-only")])
db.commit()

@app.get("/")
def index():
    return """<!doctype html><html><head><title>Cyber Range SQL lab</title></head><body><h1>Training account login</h1><p>Only use this local exercise.</p><form method='post' action='/login'><label>Username <input name='username'></label><label>Password <input name='password' type='password'></label><button>Sign in</button></form><p><a href='/accounts'>Training account inventory</a></p><details><summary>Safe query example</summary><code>db.execute('SELECT name FROM users WHERE name=? AND password=?', (name, password))</code></details></body></html>"""

@app.post("/login")
def login():
    name, password = request.form.get("username", ""), request.form.get("password", "")
    # Intentionally vulnerable teaching fixture. Bound the demo response to this local target.
    query = f"SELECT name FROM users WHERE name = '{name}' AND password = '{password}'"
    try:
        row = db.execute(query).fetchone()
    except sqlite3.Error:
        row = None
    if row:
        return f"<h1>Training sign in succeeded</h1><p>Welcome, {row[0]}.</p><p>Session marker: {os.getenv('FLAG_SQLI', 'range-training-flag')}</p><a href='/accounts'>View fixture</a>", 200
    return "<h1>Sign in failed</h1><a href='/'>Try the training form</a>", 401

@app.get("/accounts")
def accounts():
    rows = db.execute("SELECT name FROM users ORDER BY name").fetchall()
    return "<h1>Training fixture accounts</h1><p>" + ", ".join(x[0] for x in rows) + "</p><a href='/'>Back</a>"

app.run(host="0.0.0.0", port=80)
