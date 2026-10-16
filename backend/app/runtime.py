from typing import Any, Protocol


class LabRuntime(Protocol):
    def start(self, session: Any, manifest: dict[str, Any], secrets: dict[str, str]) -> dict[str, Any]: ...
    def stop(self, refs: dict[str, Any]) -> None: ...
    def status(self, refs: dict[str, Any]) -> str: ...
    def exec(self, refs: dict[str, Any], target: str, command: list[str], timeout: int = 5) -> tuple[str, int]: ...
    def list_managed(self) -> list[dict[str, Any]]: ...
    def stats(self, refs: dict[str, Any]) -> dict[str, Any]: ...


class FakeRuntime:
    """Local demo runtime. It simulates fixed lab checks and starts no containers."""

    def __init__(self) -> None:
        self.sessions: dict[str, dict[str, Any]] = {}

    def start(self, session: Any, manifest: dict[str, Any], secrets: dict[str, str]) -> dict[str, Any]:
        refs = {"session_id": str(session.id), "status": "running", "started": True}
        self.sessions[str(session.id)] = refs
        return refs

    def stop(self, refs: dict[str, Any]) -> None:
        refs["status"] = "stopped"

    def status(self, refs: dict[str, Any]) -> str:
        return refs.get("status", "stopped")

    def exec(self, refs: dict[str, Any], target: str, command: list[str], timeout: int = 5) -> tuple[str, int]:
        # The local simulation does not run commands, so it cannot pass a
        # command check by returning the expected output from the manifest.
        return "", 1

    def list_managed(self) -> list[dict[str, Any]]:
        return list(self.sessions.values())

    def stats(self, refs: dict[str, Any]) -> dict[str, Any]:
        return {"cpu_percent": 0, "memory_bytes": 0}
