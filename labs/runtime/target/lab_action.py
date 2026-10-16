import json
import sqlite3
import sys


def login(mode, username, password):
    database = sqlite3.connect(":memory:")
    database.execute("CREATE TABLE accounts (username TEXT, password TEXT, role TEXT)")
    database.executemany(
        "INSERT INTO accounts VALUES (?, ?, ?)",
        [
            ("admin", "demo-admin-password", "administrator"),
            ("analyst", "demo-analyst-password", "analyst"),
            ("student", "demo-student-password", "student"),
        ],
    )
    if mode == "vulnerable":
        query = f"SELECT username, role FROM accounts WHERE username = '{username}' AND password = '{password}'"
        rows = database.execute(query).fetchall()
    else:
        rows = database.execute(
            "SELECT username, role FROM accounts WHERE username = ? AND password = ?",
            (username, password),
        ).fetchall()
    print(json.dumps({"mode": mode, "matched_accounts": [{"username": row[0], "role": row[1]} for row in rows]}))


if __name__ == "__main__" and len(sys.argv) == 4:
    login(sys.argv[1], sys.argv[2][:120], sys.argv[3][:120])
else:
    raise SystemExit(2)
