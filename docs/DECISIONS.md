# Implementation decisions

- **Proxy and session desktop:** Traefik discovers the attacker container by its labels. It joins that session's internal network only for the session lifetime. Forward-auth checks the owner for every HTTP request and WebSocket upgrade. Its HTTP entrypoint binds only to the fixed application-network address, so joining a lab bridge does not expose API routes to lab containers.
- **Development database:** Compose uses PostgreSQL 16. SQLite is available for local unit tests and CLI evaluation without Docker.
- **Password reset mail:** SMTP is sent synchronously with a bounded network timeout. Delivery failure is logged by recipient domain only; reset tokens and passwords are never logged.
- **Flag values:** The backend creates cryptographically random per-session values, encrypts the stored map with a key derived from `SESSION_SECRET`, passes only the needed values to containers, and keeps answer specifications server-side.
- **Spectating:** Teacher VNC spectating is not enabled. The connect endpoint rejects non-owners; the teacher can monitor and terminate sessions. A read-only VNC protocol proxy is required before adding spectating.
- **Email verification:** Optional verification links are single-use, hashed in the database, and expire after 24 hours. SMTP must be configured before turning the feature on.
- **Docker image health:** Runtime start waits for Docker's container start operation and confirms liveness; lab-specific healthcheck probes are not yet applied from manifests.
- **Session extension:** Session extension is disabled. The UI does not offer extension.
- **Feature scope:** The core path is implemented: auth/AUP, role-aware APIs, classes and assignments, lab sync, server-side grading, session lifecycle, student workspace, teacher monitor/results/export, and an admin system view. Some requested management surfaces remain basic and are listed under limitations.
