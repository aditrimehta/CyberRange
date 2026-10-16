from types import SimpleNamespace

import pytest

from app.grading import grade
from app.labs import public_manifest, validate_manifest
from app.security import hash_password, verify_password
from app.runtime import FakeRuntime


def test_argon2_password_policy_and_verification():
    with pytest.raises(ValueError):
        hash_password("short")
    hashed = hash_password("Correct!HorseBattery2026")
    assert hashed.startswith("$argon2id$")
    assert verify_password(hashed, "Correct!HorseBattery2026")
    assert not verify_password(hashed, "Incorrect!HorseBattery2026")
    assert not verify_password("not-a-hash", "anything")


def question(qid, kind, points=5, answer=None, **spec):
    return SimpleNamespace(qid=qid, type=kind, points=points, answer_spec={"answer": answer, **spec}, explanation="feedback")


def test_grade_supports_mcq_text_numeric_flag_and_check():
    items = [question("mcq", "mcq", answer="A"), question("text", "short_text", answer="safe query", accepted=["safe query"]), question("num", "numeric", answer=22, tolerance=1), question("flag", "flag", answer="{{flag:x}}", flag_key="x"), question("check", "check", check={"target": "attacker", "command": ["true"], "exit_code": 0})]

    class Runtime:
        def exec(self, refs, target, command, timeout):
            assert target == "attacker" and command == ["true"]
            return "ok", 0

    score, maximum, results = grade(items, {"mcq": "A", "text": " SAFE   QUERY ", "num": "23", "flag": "session-value"}, {"x": "session-value"}, Runtime(), {})
    assert (score, maximum) == (25, 25)
    assert all(item["correct"] for item in results)


def test_fake_runtime_does_not_award_manifest_check_automatically():
    runtime = FakeRuntime()
    session = SimpleNamespace(id="demo-session")
    refs = runtime.start(session, {"questions": [{"type": "check", "check": {"target": "attacker", "command": ["nmap"], "stdout_contains": "8080/closed", "exit_code": 0}}]}, {})
    output, exit_code = runtime.exec(refs, "attacker", ["nmap"])
    assert (output, exit_code) == ("", 1)


def test_manifest_validator_accepts_simple_simulated_lab():
    base = {"slug": "sample-lab", "title": "Sample lab", "summary": "A sufficiently long summary.", "category": "Network", "difficulty": "beginner", "estimated_minutes": 30, "version": 1, "objectives": ["Measure a result"], "questions": [{"id": f"q{i}", "type": "mcq", "prompt": "Select the correct training answer", "points": 5, "options": ["A"], "answer": "A", "explanation": "Why it is correct."} for i in range(5)]}
    validate_manifest(base)


def test_public_manifest_removes_answer_material():
    manifest = {"slug": "x", "questions": [{"id": "q", "answer": "secret", "accepted": ["secret"], "regex": [".*"], "tolerance": 2, "check": {"command": ["secret"]}, "prompt": "Question?", "options": ["safe"]}]}
    result = str(public_manifest(manifest))
    assert "secret" not in result
    assert "command" not in result
    assert "safe" in result
