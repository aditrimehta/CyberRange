# Cyber Range

Cyber Range is a browser-based teaching lab platform for authorized cybersecurity coursework. Teachers create classes and assign lessons; students work through disposable private lab sessions and receive server-scored feedback. The first demo uses `FakeRuntime`, so the account, course, assignment, and grading flows work without starting vulnerable containers.

## Quick start

Requirements: Docker Engine with Docker Compose v2, and GNU Make.

```sh
cp .env.example .env
make dev
make seed
```

Open [http://localhost](http://localhost). The optional local mail inbox is at [http://localhost:8025](http://localhost:8025). Demo accounts and passwords are printed by `make seed`; the student join code is printed too. This setup is for development only.

To run the real container labs, install Docker on a dedicated Linux host, set unique secrets in `.env`, then:

```sh
make build-images
RUNTIME=docker make dev-docker
make seed
```

For public deployment use `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` after configuring DNS and TLS. Read [docs/EXTERNAL_STEPS.md](docs/EXTERNAL_STEPS.md) first.

## Product flows

- Student signup with a teacher-owned join code, class membership, AUP, login, reset, and Argon2id passwords.
- Lab catalog with sanitized Markdown guides and answer keys excluded from student responses.
- Practice and assigned sessions, autosaved drafts, server-side grading for multiple choice, text, numeric, flags, and fixed checks.
- Teacher classes, assignments, roster-targeting, result review, CSV export, live session monitoring, and termination.
- Admin account, lab catalog, system and audit endpoints.
- Isolated Docker session networks, resource limits, no published lab ports, forward-auth, idle cleanup, and startup reconciliation.

## Developer commands

`make test`, `make lint`, `make labs-validate`, `make labs-sync`, `make build-images`, and `make smoke`. Local Python commands run from `backend/`; frontend commands run from `frontend/`. See [AGENTS.md](AGENTS.md) for conventions and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for boundaries.

## Starter labs

1. Network Reconnaissance with Nmap
2. SQL Injection and Parameterized Queries
3. Password Auditing in a Lab
4. Exploitation Fundamentals with Metasploit
5. Network Traffic Analysis and Forensics
6. Linux Firewall Hardening

## Security note

Vulnerable targets belong on an isolated, dedicated host. Container isolation shares the host kernel. Do not expose PostgreSQL, the Docker Engine, or lab ports to the internet. See [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).
