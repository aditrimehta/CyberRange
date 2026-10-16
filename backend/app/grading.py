import re
from typing import Any


def grade(questions: list[Any], answers: dict[str, Any], flags: dict[str, str], runtime: Any = None, refs: dict[str, Any] | None = None) -> tuple[int, int, list[dict[str, Any]]]:
    score = total = 0
    results: list[dict[str, Any]] = []
    for q in questions:
        spec = q.answer_spec
        qid, kind, points = q.qid, q.type, q.points
        submitted = answers.get(qid, "")
        expected = spec.get("answer")
        correct = False
        if kind in {"mcq", "flag"}:
            correct = str(submitted).strip() == str(flags.get(spec.get("flag_key", ""), expected)).strip()
        elif kind == "numeric":
            try:
                correct = abs(float(submitted) - float(expected)) <= float(spec.get("tolerance", 0))
            except (ValueError, TypeError):
                correct = False
        elif kind == "short_text":
            candidate = " ".join(str(submitted).casefold().split())
            valid = spec.get("accepted", [expected])
            correct = any(candidate == " ".join(str(v).casefold().split()) for v in valid)
            patterns = spec.get("regex", [])
            correct = correct or any(re.fullmatch(pattern, str(submitted), re.IGNORECASE) is not None for pattern in patterns)
        elif kind == "check" and runtime is not None and refs:
            check = spec["check"]
            out, code = runtime.exec(refs, check["target"], check["command"], int(check.get("timeout", 5)))
            correct = code == check.get("exit_code", 0) and (not check.get("stdout_contains") or check["stdout_contains"] in out)
        total += points
        if correct:
            score += points
        results.append({"qid": qid, "correct": correct, "points_earned": points if correct else 0, "points_possible": points, "explanation": q.explanation})
    return score, total, results
