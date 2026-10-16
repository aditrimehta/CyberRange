# Threat model

## Assets

- Student and teacher identities, password hashes, browser sessions, and reset tokens.
- Course membership, assignment results, attempts, and audit records.
- Generated per-session flags and VNC passwords.
- Host CPU, memory, disk, Docker Engine, PostgreSQL, and proxy configuration.

## Trust boundaries and actors

- **Browser to public proxy/API:** anonymous users can register only through a valid class join code. Authenticated users can make requests only within their role and object ownership.
- **API to PostgreSQL:** ORM queries use bound parameters. API responses use explicit serializers and do not serialize answer specifications or secret maps.
- **API to Docker control:** Docker access flows through the socket proxy. A compromised API can create or alter Docker resources; this is a high-impact residual risk.
- **Lab container to host and other sessions:** malicious student input or a compromised vulnerable target is assumed. Labs use per-session internal networks, no host ports, no host mounts, capability drops, no-new-privileges, pids, CPU and memory limits, and no Docker socket.
- **Curious or malicious teacher:** a teacher is limited to their own classes and assignments. Teacher spectating is disabled rather than implemented as a client-side read-only claim.
- **Malicious student:** may attempt IDOR, answer extraction, brute force, session sharing, cross-network access, or resource exhaustion.

## Mitigations

- Argon2id password hashes, random opaque cookie sessions stored as hashes, lockout after repeated failures, same-origin CORS, CSRF header checks, secure cookie configuration in production, CSP and security response headers.
- Database-level ownership lookups for class and assignment paths; random UUID resource IDs; generic login failures.
- Server-side grading, session-random flags, encrypted-at-rest session secrets, sanitized Markdown, fixed manifest commands for `check` questions.
- Traefik forward-auth checks the session owner; teacher connect attempts are denied. Reverse-proxy Docker API access is restricted to the application subnet/address and the lab entrypoint is not bound on session bridges.
- Internal per-session bridges, no published lab ports, no privileged containers, dropped capabilities, resource limits, and automatic cleanup.
- Structured logs avoid passwords, cookie tokens, flags, and VNC passwords. Audit records cover account and session events.

## Explicit lab exceptions

- Attacker container: `NET_RAW` is added for Nmap discovery and SYN scans.
- Firewall-hardening target: `NET_ADMIN` is added to the disposable target so the student can configure its firewall.
- Metasploitable2 target: the image intentionally contains legacy vulnerable services; it remains isolated on an internal per-session network with no published ports.
- Password lab: weak credentials are disposable and only exist inside the private lab network.

## Residual risk

Docker containers share the host kernel. A container escape or Docker Engine vulnerability can compromise the host. Anyone who compromises the API can influence Docker through the socket proxy. Use a dedicated Linux host or VM, keep Docker and base images patched, limit administrative access, back up the database, monitor disk and resource use, and obtain written institutional authorization. A privileged student or a compromised proxy may also attempt denial of service within the configured capacity limits. This MVP does not provide read-only teacher VNC spectating or email verification.
