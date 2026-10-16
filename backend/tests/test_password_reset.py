from app import main


def test_password_reset_is_single_use_and_does_not_enumerate(client, users, monkeypatch):
    messages = []
    monkeypatch.setattr(main, "send_email", lambda to, subject, body: messages.append((to, subject, body)))
    first = client.post("/api/auth/password-reset/request", json={"email": "student@example.test"})
    missing = client.post("/api/auth/password-reset/request", json={"email": "absent@example.test"})
    assert first.json() == missing.json()
    assert len(messages) == 1
    raw_token = messages[0][2].rsplit(": ", 1)[-1]
    changed = client.post("/api/auth/password-reset/confirm", json={"token": raw_token, "password": "NewRange!Password2026"})
    assert changed.status_code == 200
    reused = client.post("/api/auth/password-reset/confirm", json={"token": raw_token, "password": "AnotherRange!Password2026"})
    assert reused.status_code == 400
    assert client.post("/api/auth/login", json={"email": "student@example.test", "password": "NewRange!Password2026"}).status_code == 200
