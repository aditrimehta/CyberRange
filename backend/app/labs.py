from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator

REQUIRED = {"slug", "title", "category", "difficulty", "estimated_minutes", "version", "questions"}
KINDS = {"mcq", "short_text", "numeric", "flag", "check"}


def load_packages(root: str | Path) -> list[tuple[dict[str, Any], str]]:
    root = Path(root)
    if not root.exists():
        return []
    result = []
    for folder in sorted(root.iterdir()):
        manifest_path, guide_path = folder / "lab.yaml", folder / "guide.md"
        if not folder.is_dir() or folder.name.startswith("_") or not manifest_path.exists():
            continue
        manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
        validate_manifest(manifest)
        result.append((manifest, guide_path.read_text(encoding="utf-8") if guide_path.exists() else ""))
    return result


def validate_manifest(data: dict[str, Any]) -> None:
    schema_path = Path(__file__).resolve().parents[2] / "labs" / "schema" / "lab.schema.json"
    if schema_path.exists():
        schema = yaml.safe_load(schema_path.read_text(encoding="utf-8"))
        issues = sorted(Draft202012Validator(schema).iter_errors(data or {}), key=lambda error: list(error.absolute_path))
        if issues:
            first = issues[0]
            path = ".".join(str(part) for part in first.absolute_path) or "manifest"
            raise ValueError(f"{path}: {first.message}")
    missing = REQUIRED - set(data or {})
    if missing:
        raise ValueError(f"Missing manifest keys: {', '.join(sorted(missing))}")
    if data["difficulty"] not in {"beginner", "intermediate", "advanced"}:
        raise ValueError("Invalid difficulty")
    if len(data["questions"]) < 5:
        raise ValueError("Each lab needs at least five questions")
    for q in data["questions"]:
        if q.get("type") not in KINDS or not q.get("id") or int(q.get("points", 0)) <= 0:
            raise ValueError(f"Invalid question: {q.get('id', '<missing>')}")
        if q.get("type") == "check" and not q.get("check", {}).get("command"):
            raise ValueError("Check questions require a fixed platform command")
def public_manifest(manifest: dict[str, Any]) -> dict[str, Any]:
    clean = {k: v for k, v in manifest.items() if k not in {"questions"}}
    clean["questions"] = [{k: v for k, v in q.items() if k not in {"answer", "accepted", "regex", "tolerance", "check"}} for q in manifest["questions"]]
    return clean
