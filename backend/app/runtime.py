import shutil
import json
import os
import subprocess
from pathlib import Path
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


class DockerLabRuntime(FakeRuntime):
    """Runs the three hands-on demo labs in private, per-session Compose projects."""

    HANDS_ON = {"nmap-network-recon", "sql-injection", "traffic-forensics"}
    ROOT = Path(__file__).resolve().parents[2]
    COMPOSE_FILE = ROOT / "labs" / "runtime" / "compose.yaml"

    def __init__(self, vm_distro: str = "") -> None:
        super().__init__()
        self.vm_distro = vm_distro

    def _docker_prefix(self) -> list[str]:
        return ["wsl", "-d", self.vm_distro, "--", "docker"] if self.vm_distro else ["docker"]

    def start(self, session: Any, manifest: dict[str, Any], secrets: dict[str, str]) -> dict[str, Any]:
        slug = manifest.get("slug", "")
        session_id = str(session.id)
        if slug not in self.HANDS_ON:
            return super().start(session, manifest, secrets)
        if not shutil.which("wsl" if self.vm_distro else "docker"):
            raise RuntimeError("Docker CLI was not found. Start Docker Desktop, open a new terminal, and confirm `docker --version` works.")
        project = f"cr-{session_id.replace('-', '')}"
        services = ["target"] + (["nmap-tools"] if slug == "nmap-network-recon" else [])
        try:
            result = self._compose(project, "up", "--build", "-d", "--wait", *services, timeout=240, profile=secrets.get('lab_profile', {}))
        except RuntimeError as exc:
            try:
                self._compose(project, "down", "--remove-orphans", "--timeout", "2", timeout=10)
            except RuntimeError:
                pass
            raise RuntimeError("Docker took too long to start the lab. Check Docker Desktop and try again.") from exc
        if result.returncode:
            detail = (result.stderr or result.stdout).strip()[-1200:]
            try:
                self._compose(project, "down", "--remove-orphans", "--timeout", "2", timeout=10)
            except RuntimeError:
                pass
            raise RuntimeError(detail or "Docker could not start the lab containers.")
        refs = {"session_id": session_id, "slug": slug, "status": "running", "runtime": "docker", "project": project}
        if secrets.get('lab_profile'):
            refs['lab_profile'] = secrets['lab_profile']
        if slug == "traffic-forensics" and secrets.get("log_scenario"):
            refs["log_scenario"] = secrets["log_scenario"]
        self.sessions[session_id] = refs
        return refs

    def _compose(self, project: str, *args: str, timeout: int = 30, profile=None) -> subprocess.CompletedProcess[str]:
        compose_path = str(self.COMPOSE_FILE)
        if self.vm_distro:
            compose_path = "/mnt/" + self.COMPOSE_FILE.drive[0].lower() + self.COMPOSE_FILE.as_posix()[2:]
        command = [*self._docker_prefix(), "compose", "-p", project, "-f", compose_path, *args]
        environment = dict(os.environ)
        if profile is not None:
            serialized = json.dumps(profile)
            environment['CR_LAB_PROFILE'] = serialized
            if self.vm_distro:
                command = ['wsl', '-d', self.vm_distro, '--', 'env', f'CR_LAB_PROFILE={serialized}', 'docker', *command[5:]]
        try:
            return subprocess.run(command, cwd=self.ROOT, env=environment, capture_output=True, text=True, timeout=timeout, check=False)
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise RuntimeError("Docker Desktop is not responding. Start Docker Desktop and retry.") from exc

    def stop(self, refs: dict[str, Any]) -> None:
        runtime = refs.get("runtime")
        if runtime == "docker":
            try:
                result = self._compose(refs["project"], "down", "--volumes", "--remove-orphans", "--timeout", "5", timeout=30)
                if result.returncode:
                    detail = (result.stderr or result.stdout).strip()[-1200:]
                    raise RuntimeError(detail or "Docker could not remove the lab containers.")
            except RuntimeError:
                # Keep the environment tracked so cleanup can be retried.
                raise
            refs["status"] = "stopped"
            self.sessions.pop(refs.get("session_id", ""), None)
            return
        if runtime == "local-logs":
            refs["status"] = "stopped"
            self.sessions.pop(refs.get("session_id", ""), None)
            return
        super().stop(refs)

    def status(self, refs: dict[str, Any]) -> str:
        if refs.get("runtime") == "docker":
            if not shutil.which("wsl" if self.vm_distro else "docker"):
                return "stopped"
            try:
                result = self._compose(refs["project"], "ps", "--status", "running", "--services", timeout=10)
                return "running" if result.returncode == 0 and result.stdout.strip() else "stopped"
            except RuntimeError:
                return "stopped"
        return super().status(refs)

    def lab_action(self, refs: dict[str, Any], action: str, values: dict[str, str]) -> dict[str, Any]:
        if refs.get("runtime") != "docker" or self.status(refs) != "running":
            raise RuntimeError("The lab container is not running. Stop and relaunch the lab.")
        if refs.get("slug") == "nmap-network-recon" and action == "scan":
            profile = refs.get('lab_profile', {})
            ports = [2222, 8080, profile.get('close_port', 9001)] + ([9301] if profile.get('extra_service') else [])
            command = ["exec", "-T", "nmap-tools", "nmap", "-n", "-Pn", "-sT", "-sV", "--allports", "--script=banner", "-p", ','.join(map(str, ports)), "target"]
        elif refs.get("slug") == "nmap-network-recon" and action == "close_service":
            command = ["exec", "-T", "target", "python", "/app/lab_action.py", "close_service"]
        elif refs.get("slug") == "sql-injection" and action in {"vulnerable_login", "safe_login"}:
            mode = "vulnerable" if action == "vulnerable_login" else "safe"
            command = ["exec", "-T", "target", "python", "/app/lab_action.py", mode, values["username"], values["password"]]
        elif refs.get("slug") == "traffic-forensics" and action in {"generate_incident", "search_logs"}:
            command = ["exec", "-T", "target", "python", "/app/lab_action.py", action]
            if action == "search_logs":
                command.append(values["query"])
            elif refs.get("log_scenario"):
                command.append(json.dumps(refs["log_scenario"]))
        else:
            raise ValueError("That action is not available in this lab.")
        result = self._compose(refs["project"], *command, timeout=60 if action == "scan" else 20)
        output = '\n'.join(part.strip() for part in (result.stdout, result.stderr) if part.strip())[-5000:]
        response = {"output": output, "exit_code": result.returncode}
        if action in {"search_logs", "generate_incident", "close_service"} and result.returncode == 0:
            response.update(json.loads(output))
        return response
