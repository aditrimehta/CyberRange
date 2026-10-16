from types import SimpleNamespace

import pytest

from app.grading import grade
from app.labs import public_manifest, validate_manifest
from app.security import hash_password, verify_password


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


def test_manifest_validator_rejects_internet_and_unjustified_exceptions():
    base = {"slug": "sample-lab", "title": "Sample lab", "summary": "A sufficiently long summary.", "category": "Network", "difficulty": "beginner", "estimated_minutes": 30, "version": 1, "objectives": ["Measure a result"], "environment": {"attacker": {"image": "test/attacker:1", "cpu": 1, "memory": "1g"}, "targets": []}, "network": {"internet": False}, "limits": {"max_duration_minutes": 60}, "questions": [{"id": f"q{i}", "type": "mcq", "prompt": "Select the correct training answer", "points": 5, "options": ["A"], "answer": "A", "explanation": "Why it is correct."} for i in range(5)]}
    validate_manifest(base)
    internet = {**base, "network": {"internet": True}}
    with pytest.raises(ValueError, match="internet"):
        validate_manifest(internet)
    exception = {**base, "environment": {**base["environment"], "targets": [{"name": "target", "image": "test/target:1", "cpu": 1, "memory": "512m", "security_exceptions": [{"capability": "NET_ADMIN", "justification": ""}]}]}}
    with pytest.raises(ValueError, match="justification"):
        validate_manifest(exception)


def test_public_manifest_removes_answer_material():
    manifest = {"slug": "x", "questions": [{"id": "q", "answer": "secret", "accepted": ["secret"], "regex": [".*"], "tolerance": 2, "check": {"command": ["secret"]}, "prompt": "Question?", "options": ["safe"]}]}
    result = str(public_manifest(manifest))
    assert "secret" not in result
    assert "command" not in result
    assert "safe" in result
