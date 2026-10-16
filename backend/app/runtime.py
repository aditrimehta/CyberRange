from typing import Any, Protocol
import re
import time


class LabRuntime(Protocol):
    def start(self, session: Any, manifest: dict[str, Any], secrets: dict[str, str]) -> dict[str, Any]: ...
    def stop(self, refs: dict[str, Any]) -> None: ...
    def status(self, refs: dict[str, Any]) -> str: ...
    def exec(self, refs: dict[str, Any], target: str, command: list[str], timeout: int = 5) -> tuple[str, int]: ...
    def list_managed(self) -> list[dict[str, Any]]: ...
    def stats(self, refs: dict[str, Any]) -> dict[str, Any]: ...


class FakeRuntime:
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
        return "", 1

    def list_managed(self) -> list[dict[str, Any]]:
        return list(self.sessions.values())

    def stats(self, refs: dict[str, Any]) -> dict[str, Any]:
        return {"cpu_percent": 0, "memory_bytes": 0}


class DockerRuntime(FakeRuntime):
    """Per-session private Docker networks; containers are never host-published."""

    def __init__(self) -> None:
        import docker
        from app.config import get_settings
        self.client = docker.DockerClient(base_url=get_settings().docker_host if hasattr(get_settings(), "docker_host") else "tcp://socket-proxy:2375")
        self.sessions = {}

    def start(self, session: Any, manifest: dict[str, Any], secrets: dict[str, str]) -> dict[str, Any]:
        sid = str(session.id)
        labels = {"cyberrange.managed": "true", "cyberrange.session": sid}
        net = self.client.networks.create(f"cr-{sid[:12]}", driver="bridge", internal=True, labels=labels)
        containers = []
        try:
            for target in manifest["environment"].get("targets", []):
                env = {k: re.sub(r"\{\{flag:([a-zA-Z0-9_-]+)\}\}", lambda match: secrets.get(match.group(1), ""), str(v)) for k, v in target.get("env", {}).items()}
                allowed_caps = {x.get("capability") for x in target.get("security_exceptions", []) if x.get("capability") in {"NET_ADMIN"}}
                options = {"name": f"cr-{sid[:8]}-{target['name']}", "hostname": target.get("hostname", target["name"]), "environment": env, "labels": labels, "read_only": False, "cap_drop": ["ALL"], "cap_add": list(allowed_caps), "security_opt": ["no-new-privileges:true"], "pids_limit": 128, "mem_limit": target.get("memory", "512m"), "nano_cpus": int(float(target.get("cpu", 0.5)) * 1_000_000_000), "privileged": False}
                health = target.get("healthcheck")
                if health:
                    options["healthcheck"] = {"Test": health["cmd"], "Interval": self._duration_ns(health.get("interval", "5s")), "Timeout": self._duration_ns(health.get("timeout", "2s")), "Retries": int(health.get("retries", 12))}
                container = self.client.containers.create(target["image"], **options)
                net.connect(container, aliases=[target["name"]])
                container.start()
                containers.append(container.id)
            attacker = manifest["environment"]["attacker"]
            from app.config import get_settings
            config = get_settings()
            prefix = f"/lab/{sid}"
            router = f"cr-{sid[:12]}"
            labels.update({"traefik.enable": "true", "traefik.docker.network": net.name, f"traefik.http.routers.{router}.rule": f"Host(`{config.domain}`) && PathPrefix(`{prefix}/`)", f"traefik.http.services.{router}.loadbalancer.server.port": "6080", f"traefik.http.routers.{router}.middlewares": f"cr-auth-{sid[:12]},cr-strip-{sid[:12]}", f"traefik.http.middlewares.cr-auth-{sid[:12]}.forwardauth.address": "http://api:8000/internal/lab-auth", f"traefik.http.middlewares.cr-auth-{sid[:12]}.forwardauth.trustforwardheader": "true", f"traefik.http.middlewares.cr-auth-{sid[:12]}.forwardauth.authrequestheaders": "Cookie", f"traefik.http.middlewares.cr-strip-{sid[:12]}.stripprefix.prefixes": prefix})
            if config.app_env == "production":
                labels.update({f"traefik.http.routers.{router}.entrypoints": "websecure", f"traefik.http.routers.{router}.tls": "true", f"traefik.http.routers.{router}.tls.certresolver": "le"})
            container = self.client.containers.create(attacker["image"], name=f"cr-{sid[:8]}-attacker", environment={"VNC_PASSWORD": secrets["vnc"], **{f"FLAG_{k.upper()}": v for k, v in secrets.items() if k != "vnc"}}, labels=labels, cap_drop=["ALL"], cap_add=["NET_RAW"], security_opt=["no-new-privileges:true"], pids_limit=512, mem_limit=attacker.get("memory", "2g"), nano_cpus=int(float(attacker.get("cpu", 1)) * 1_000_000_000), privileged=False)
            net.connect(container, aliases=["attacker"])
            container.start()
            containers.append(container.id)
            proxy = self.client.containers.get("cyberrange-traefik")
            proxy.connect(net)
            self._wait_ready(container)
            refs = {"network_id": net.id, "network_name": net.name, "containers": containers, "status": "running", "session_id": sid}
            self.sessions[sid] = refs
            return refs
        except Exception:
            for cid in containers:
                try:
                    self.client.containers.get(cid).remove(force=True)
                except Exception:
                    pass
            net.remove()
            raise

    def stop(self, refs: dict[str, Any]) -> None:
        for cid in refs.get("containers", []):
            try:
                self.client.containers.get(cid).remove(force=True)
            except Exception:
                pass
        try:
            network = self.client.networks.get(refs["network_id"])
            try:
                self.client.containers.get("cyberrange-traefik").disconnect(network, force=True)
            except Exception:
                pass
            network.remove()
        except Exception:
            pass
        refs["status"] = "stopped"

    def status(self, refs: dict[str, Any]) -> str:
        try:
            return "running" if any(self.client.containers.get(cid).status == "running" for cid in refs["containers"]) else "stopped"
        except Exception:
            return "failed"

    def exec(self, refs: dict[str, Any], target: str, command: list[str], timeout: int = 5) -> tuple[str, int]:
        container = next(self.client.containers.get(cid) for cid in refs["containers"] if target in self.client.containers.get(cid).name)
        result = container.exec_run(["timeout", f"{max(1, min(timeout, 30))}s", *command], demux=True)
        out = result.output[0] if isinstance(result.output, tuple) else result.output
        return (out or b"").decode(errors="replace"), int(result.exit_code or 0)

    @staticmethod
    def _duration_ns(value: str) -> int:
        match = re.fullmatch(r"([0-9]+)(ms|s|m)", value)
        if not match:
            raise ValueError("Healthcheck duration must use ms, s, or m")
        factor = {"ms": 1_000_000, "s": 1_000_000_000, "m": 60_000_000_000}[match.group(2)]
        return int(match.group(1)) * factor

    @staticmethod
    def _wait_ready(container: Any) -> None:
        for _ in range(90):
            container.reload()
            state = container.attrs.get("State", {})
            if state.get("Status") != "running":
                raise RuntimeError("Attacker desktop stopped during startup")
            health = state.get("Health", {}).get("Status")
            if health == "healthy" or not health:
                return
            if health == "unhealthy":
                raise RuntimeError("Attacker desktop health check failed")
            time.sleep(1)
        raise RuntimeError("Attacker desktop did not become ready")

    def list_managed(self) -> list[dict[str, Any]]:
        return [{"id": c.id, "labels": c.labels} for c in self.client.containers.list(all=True, filters={"label": "cyberrange.managed=true"})]

    def reconcile(self, active_session_ids: set[str]) -> int:
        removed = 0
        for container in self.client.containers.list(all=True, filters={"label": "cyberrange.managed=true"}):
            if container.labels.get("cyberrange.session") not in active_session_ids:
                try:
                    container.remove(force=True)
                    removed += 1
                except Exception:
                    pass
        for network in self.client.networks.list(filters={"label": "cyberrange.managed=true"}):
            if network.attrs.get("Labels", {}).get("cyberrange.session") not in active_session_ids:
                try:
                    network.remove()
                    removed += 1
                except Exception:
                    pass
        return removed
