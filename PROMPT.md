# CODEX BUILD PROMPT: "Cyber Range", a Virtual Cybersecurity Lab Platform for Colleges

> Paste this whole file into Codex, or commit it to the repo root as `PROMPT.md` and tell Codex: "Read PROMPT.md fully and execute it end to end."

---

## 0. Your role and how to work

You are a senior full-stack and DevSecOps engineer. Build a complete, working, production-quality MVP of the product described below, in this repository, from an empty folder to a runnable system.

Rules of engagement:

1. **Do not ask me questions.** Where this spec is silent, choose the most sensible option and record it in `docs/DECISIONS.md` (one short entry per decision).
2. **Finish everything.** Work through the milestones in section 14 in order. After each milestone run the linters and tests, fix failures, and make a git commit with a clear message. Do not stop after scaffolding.
3. **No placeholders.** No `TODO` stubs, pseudo-code, lorem ipsum, or "implement later" comments in delivered code. Everything referenced must exist and be wired up.
4. **Be honest about what you could and could not run.** Your sandbox probably has no Docker daemon and may have no internet access to pull images. Design the code so it can be fully tested without Docker (a `LabRuntime` interface plus a `FakeRuntime`, see section 3). Anything needing real Docker goes into tests marked `integration` and into `scripts/smoke_test.sh` for me to run. In your final report, separate **"verified by running here"** from **"written but not verifiable here"**. Never claim something works if you did not execute it.
5. **Security first.** This is a cybersecurity teaching platform that runs intentionally vulnerable machines. Its own security and isolation must be exemplary (section 8).
6. **Tell me every external step.** Anything that requires a human outside the repo (installing Docker, DNS, TLS, SMTP credentials, pulling third-party images, approvals) must go into `docs/EXTERNAL_STEPS.md` as an exact numbered checklist, and be repeated in your final message (section 13).

---

## 1. Product overview

**Cyber Range** is a browser-based platform where college instructors assign hands-on cybersecurity labs and students complete them inside disposable, isolated lab environments (an attacker desktop plus one or more vulnerable target machines) that they use entirely inside their web browser. Students install nothing. Teachers assign labs, monitor students live, and review scores and history afterwards.

Each lab teaches one concept (for example network reconnaissance, SQL injection, password attacks, exploitation, packet analysis, firewall hardening). A lab consists of: a lab environment (containers), a written guide, and graded questions.

**Roles**

| Role | Purpose |
|---|---|
| Admin | Institution IT. Creates teacher accounts, manages the lab catalog, platform limits, and system health. |
| Teacher | Creates classes, shares a join code, assigns labs with due dates, monitors live sessions, reviews performance. |
| Student | Joins a class, practices labs, completes assigned labs, sees own results. |

**Background.** This is a rebuild of a university capstone prototype (PHP, MySQL, Apache, Docker, Kali Linux plus Metasploitable2 reached through noVNC in an iframe). Keep its good ideas: teacher-owned join codes, practice mode versus assigned mode, server-side scoring, lab history. Fix its weaknesses: MD5 password hashing, security-question password reset, VNC ports exposed directly to the client, no resource or isolation controls, no automatic cleanup of running labs.

---

## 2. Technology stack (fixed, do not substitute without a DECISIONS.md entry)

**Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (typed), Alembic, Pydantic v2, PostgreSQL 16, `docker` SDK for Python, APScheduler (in-process reaper), `argon2-cffi`, `slowapi` (rate limiting), structured JSON logging. Tooling: pytest, pytest-cov, ruff, mypy.

**Frontend:** React 18, TypeScript (strict), Vite, Tailwind CSS, React Router, TanStack Query, react-hook-form with zod, `react-markdown` with `rehype-sanitize`, Recharts. Tooling: Vitest and Testing Library, ESLint, Playwright for one end-to-end happy path.

**Infrastructure:** Docker Compose, Traefik v3 as the single reverse proxy (TLS, routing, forward-auth for lab sessions), `tecnativa/docker-socket-proxy` between the API and the Docker daemon, Mailpit for development email, GitHub Actions for CI.

**Lab images:** Dockerfiles in `labs/images/`.

UI quality bar: clean, modern, responsive, light and dark mode, WCAG AA contrast, keyboard accessible, clear empty, loading and error states everywhere.

---

## 3. Architecture

```
Browser ──HTTPS──> Traefik ──> web (static React build)
                      │──────> api (FastAPI) ──> PostgreSQL
                      │              │
                      │              └──> docker-socket-proxy ──> Docker Engine
                      │
                      └── /lab/<session_id>/  (forward-auth against api)
                              └──> attacker container (noVNC)  ──private net──> target container(s)
```

### 3.1 Lab session lifecycle

1. Student clicks **Launch** → `POST /api/lab-sessions {lab_id, assignment_id?}`.
2. API validates: role, assignment targets this student, not past the hard deadline, attempts remaining, per-user concurrency limit (default 1 active session), global cap `MAX_ACTIVE_SESSIONS`, and host resource headroom.
3. `LabRuntime.start(session)` creates a **per-session private network** (`internal=True`, so no internet), starts the target container(s) and the attacker container with resource limits, injects **per-session secrets** (random VNC password, dynamic flags), waits for health checks, and registers the route for `/lab/<session_id>/`. Status moves `starting → running` (or `failed` with a readable reason).
4. The student's workspace embeds the attacker desktop through `/lab/<session_id>/`. Traefik calls the API's forward-auth endpoint on every request and WebSocket upgrade. Only the owning student, that student's teacher (view-only), or an admin may connect. Lab containers never publish ports on the host.
5. Sessions end by: student **Stop**, **Submit** (configurable), teacher or admin **Terminate**, **idle timeout** (default 30 min), **max duration** (default 3 h, per-lab override), or crash. A background **reaper** (every 30 s) removes expired sessions' containers and networks. On API startup, **reconcile**: find containers and networks carrying the label `cyberrange.managed=true` and either adopt them (if a matching live session exists) or remove them.
6. On submit, answers are graded **server-side** and an `attempt` row is written.

### 3.2 Runtime abstraction

Define `LabRuntime` (a `typing.Protocol`) with `start`, `stop`, `status`, `exec`, `list_managed`, `stats`. Provide:

- `DockerRuntime`: the real implementation via the Docker SDK.
- `FakeRuntime`: in-memory, used by unit tests and by `RUNTIME=fake` dev mode, where the lab workspace shows a placeholder page in place of a desktop. This lets the whole UI be demoed and e2e-tested with no Docker.

Document in `ARCHITECTURE.md` how a future `LibvirtRuntime` (real VMs under KVM) would implement the same interface. Do not build it now.

### 3.3 Proxying and networking (recommended approach)

Use Traefik's Docker provider (via the socket proxy) with labels set on the attacker container. When a session starts, attach the Traefik container to that session's private network, and detach it when the session ends, so **no two sessions ever share a network**. Set `traefik.docker.network` to the session network. Use a forward-auth middleware pointing at `api /internal/lab-auth`. If you choose a different mechanism (for example an API-side WebSocket reverse proxy), explain why in `DECISIONS.md`. Either way these requirements hold:

- The VNC password is never placed in a URL or log. It is delivered to the owning browser by an authenticated API call at connect time.
- Teacher spectating is **read-only**. Prefer enforcing it server-side (for example a separate view-only VNC password, or dropping client-to-server frames at the proxy). If you can only do it client-side, document clearly that it is not a security boundary.
- Anything inside a session network must be unable to reach the Traefik dashboard or API, the Docker API, the host, the database, or other sessions.

---

## 4. Data model (PostgreSQL via Alembic migrations)

Use UUID primary keys and `created_at` / `updated_at` on all tables. Add sensible indexes and constraints.

- **users**: email (unique, citext), password_hash (argon2id), role (`admin|teacher|student`), first_name, last_name, is_active, must_change_password, email_verified_at, aup_accepted_at, last_login_at, failed_login_count, locked_until.
- **auth_sessions**: user_id, token_hash, csrf_token_hash, expires_at, ip, user_agent, revoked_at. (Opaque random session tokens in an `HttpOnly; Secure; SameSite=Lax` cookie, stored hashed. Do not use JWT for browser auth.)
- **password_reset_tokens**: user_id, token_hash, expires_at (30 min), used_at.
- **classes**: teacher_id, name, term, join_code (unique, unambiguous alphabet, 8 chars), join_code_enabled, archived_at.
- **class_members**: class_id, student_id, joined_at (unique pair).
- **labs**: slug (unique), title, summary, category, difficulty, estimated_minutes, version, enabled, manifest (jsonb, with answers stripped), guide_markdown.
- **lab_questions**: lab_id, qid, type, prompt, points, position, hints (jsonb), **answer_spec (jsonb, server-only, never serialized to any API response)**.
- **assignments**: lab_id, class_id, created_by, title, instructions, opens_at, due_at, hard_deadline_at (nullable), max_attempts (default 3), time_limit_minutes (nullable), scoring_policy (`best|latest`).
- **assignment_targets**: assignment_id, student_id (supports whole class or a subset).
- **lab_sessions**: user_id, lab_id, assignment_id (nullable), mode (`practice|graded`), status (`starting|running|stopping|stopped|failed|expired`), started_at, last_activity_at, expires_at, ended_at, end_reason, runtime_refs (jsonb), secrets (jsonb, encrypted at rest, server-only).
- **attempts**: session_id, user_id, lab_id, assignment_id (nullable), is_practice, submitted_at, duration_seconds, score, max_score, answers (jsonb), per_question_results (jsonb).
- **audit_logs**: actor_id, action, target_type, target_id, metadata (jsonb), ip, created_at.
- **platform_settings**: key/value (quotas, timeouts, registration toggles).

---

## 5. Features by role

### 5.1 Authentication and accounts

- Email plus password login. Argon2id hashing. Password policy: at least 12 characters, checked against a small common-password list. Login rate limiting and temporary account lockout. Generic error messages (no account enumeration).
- **Student sign-up** with a class **join code** plus name, email, password. Student is auto-enrolled in that class. A student can join additional classes later with other codes. Optional email verification controlled by `REQUIRE_EMAIL_VERIFICATION`.
- **Teacher accounts are created by an admin.** A temporary password is generated and emailed; `must_change_password` forces a change at first login.
- **Password reset by emailed single-use token** (expires in 30 minutes, stored hashed). Replace the prototype's security-question flow entirely.
- First login shows the **Acceptable Use Policy** (labs are for authorized, educational use only, inside the platform only). Store acceptance time. Block app access until accepted.
- CSRF protection on all state-changing requests (double-submit token header). Logout and "log out everywhere".

### 5.2 Admin

- Create, deactivate, and reset users; list and search all users; assign or reset teacher accounts.
- Lab catalog management: enable or disable labs, view each lab's manifest and resource footprint, trigger "sync labs from disk".
- Platform settings: concurrency caps, idle and max-duration defaults, registration toggles.
- **System dashboard:** active sessions with owner, lab, age, container CPU and memory; host capacity gauge; force-terminate any session; "terminate all".
- Audit log viewer with filters.

### 5.3 Teacher

- **Classes:** create, rename, archive; view the join code, regenerate it, enable or disable it; roster with remove-student.
- **Lab catalog:** browse and filter by category and difficulty; preview the objectives, guide, and question count (never the answers).
- **Assign a lab:** to a whole class or selected students; title, instructions, open date, due date, optional hard deadline, max attempts, optional time limit, scoring policy.
- **Assignments overview:** per assignment, a results table (student, status `not started|in progress|submitted|overdue`, best and latest score, time spent, attempts). Drill into an attempt to see per-question results and the student's answers.
- **Attempt history** per student per lab.
- **Class analytics:** completion rate, average score, score distribution, hardest questions (lowest correct rate), time-on-lab. Charts via Recharts. **CSV export** of results.
- **Live monitor:** real-time (SSE or 5 s polling) list of active sessions belonging to the teacher's students: student, lab, status, elapsed time, time remaining. Actions: **Terminate** and **Spectate (read-only)**.

### 5.4 Student

- **Dashboard:** assigned labs grouped by `Due soon / In progress / Completed / Overdue`, practice catalog (filter by category and difficulty), a progress summary.
- **Practice mode:** can launch any enabled lab. Attempts are stored with `is_practice=true`, visible only to the student, and never counted toward grades.
- **Assigned mode:** counts toward the assignment; respects attempts, time limit, and deadlines.
- **Lab workspace page:** responsive three-area layout:
  - header: lab title, session status, countdown timer, **Stop**, **Submit**, "extend session" (only if the platform setting allows)
  - left or collapsible: the markdown **guide** with step navigation and optional hints
  - main: the embedded attacker desktop with a fullscreen toggle
  - side or collapsible: the **questions** panel with per-question input and autosaved draft answers
  - startup progress indicator while the environment boots; automatic reconnect to a still-running session after a page reload
- **Results page** after submit: score, per-question correctness, explanation text, time taken.
- **History page:** all attempts with scores and dates.

### 5.5 Stretch goals (only after everything above is done and tested)

Points and badges, an opt-in class leaderboard, bulk CSV import of students.

### 5.6 Explicit non-goals for v1

Real VMs (libvirt/KVM), cloud autoscaling, Windows labs, saving and resuming lab state, teachers authoring labs in the UI, SSO/LDAP (leave a clean hook, do not build it), native mobile apps.

---

## 6. Lab system

### 6.1 Declarative lab packages

Each lab lives in `labs/<slug>/` with `lab.yaml`, `guide.md`, and optional `assets/`. Provide a JSON Schema for `lab.yaml`, a validator, and a CLI:

```
python -m app.cli labs validate     # validate every lab package
python -m app.cli labs sync         # upsert labs and questions into the database
```

Manifest shape (finalize the schema yourself, keeping these concepts):

```yaml
slug: nmap-network-recon
title: Network Reconnaissance with Nmap
category: Network Security
difficulty: beginner            # beginner | intermediate | advanced
estimated_minutes: 45
version: 1
objectives:
  - Discover live hosts and open ports
  - Identify service versions and interpret banners
environment:
  attacker:
    image: cyberrange/kali-desktop:latest
    cpu: 1.0
    memory: 2g
  targets:
    - name: target1
      image: cyberrange/lab-recon-target:1
      hostname: target1
      cpu: 0.5
      memory: 512m
      healthcheck: {cmd: ["CMD", "nc", "-z", "localhost", "22"], interval: 5s, retries: 12}
      env:
        FLAG_RECON: "{{flag:recon}}"      # unique random flag per session
      security_exceptions: []              # each exception needs a written justification
network:
  internet: false                          # must be false in v1
limits:
  max_duration_minutes: 120
questions:
  - id: q1
    type: mcq                              # mcq | short_text | numeric | flag | check
    prompt: Which TCP port is the FTP service listening on?
    points: 10
    options: [20, 21, 22, 23]
    answer: 21
    explanation: FTP control connections use TCP 21.
    hints: ["Run a service scan against target1."]
  - id: q5
    type: flag
    prompt: Submit the flag found in the banner of the hidden service.
    points: 20
    answer: "{{flag:recon}}"
```

### 6.2 Grading types (all server-side)

- `mcq`, `numeric` (with tolerance), `short_text` (case and whitespace-insensitive match or regex list).
- `flag`: compares against the **per-session random flag** the platform generated and injected, so answers cannot be shared between students.
- `check`: the platform runs a command inside a container via `LabRuntime.exec` and evaluates stdout or the exit code (used for defensive labs such as firewall hardening). Commands are defined in the manifest, never supplied by the student, with a timeout.
- Answers and flags are **never** returned by any endpoint reachable by students. Write an automated test that scans all student-visible API responses for answer leakage.

### 6.3 Starter labs: build all six completely

Each lab needs: a working environment, a genuinely instructional `guide.md` (learning objectives, concept background, step-by-step tasks, hints, a "what you learned" wrap-up), and at least 5 graded questions mixing the types above. Write real content, not outlines.

1. **Network reconnaissance with Nmap** (beginner). Custom target container exposing several services (SSH, FTP, HTTP, one non-standard port) with banners and a per-session flag.
2. **SQL injection** (beginner to intermediate). Target: a known intentionally vulnerable web app image such as DVWA (for example `vulnerables/web-dvwa`) or a small purpose-built vulnerable Flask app you write. Include login bypass, UNION-based extraction, and a defensive question about parameterized queries.
3. **Password attacks** (intermediate). Target container with weak SSH and FTP credentials (Hydra) plus a provided file of hashes (John the Ripper). Wordlists live in the attacker image. No GPU required.
4. **Exploitation with Metasploit** (intermediate). Target: a Metasploitable2-style image (for example `tleemcjr/metasploitable2`, or another Docker build of it) exploiting one well-known service vulnerability (for example vsftpd 2.3.4 backdoor). Where that image needs extra capabilities, declare them in `security_exceptions` with justification.
5. **Network traffic analysis and forensics** (beginner to intermediate). Single attacker container, no target. Provide a deterministic generator script (using scapy) that builds a PCAP containing HTTP form login, FTP cleartext credentials, DNS queries, and a small exfiltration pattern. Students use Wireshark or tshark to answer questions.
6. **Linux firewall hardening** (intermediate, defensive). A hardened-by-the-student target; the student configures iptables or nftables rules so only intended ports are reachable. `check`-type questions verify the result by scanning from a second container.

Also provide `labs/_template/` and `docs/LAB_AUTHORING.md` explaining step by step how a teacher or developer adds a seventh lab without touching application code.

### 6.4 Attacker image (`labs/images/kali-desktop/`)

Write the Dockerfile and entrypoint: `kalilinux/kali-rolling` base, XFCE desktop, TigerVNC server, noVNC with websockify on a fixed internal port, supervisor, non-root `student` user, VNC password injected from environment at start, a healthcheck, and a **curated** tool set (nmap, netcat, hydra, john, sqlmap, nikto, gobuster, metasploit-framework, wireshark and tshark, tcpdump, curl, firefox-esr, common wordlists). Avoid `kali-linux-large`. Add a `make build-images` target. Mention approximate image sizes and build time in the docs.

---

## 7. API surface (OpenAPI auto-generated; implement at least these)

```
POST /api/auth/login | logout | register-student | accept-aup | change-password
POST /api/auth/password-reset/request | confirm
GET  /api/me

GET/POST /api/admin/users ... PATCH /api/admin/users/{id}
GET/PATCH /api/admin/labs ; POST /api/admin/labs/sync
GET/PATCH /api/admin/settings
GET  /api/admin/system ; GET /api/admin/audit-logs

GET/POST /api/classes ; PATCH/DELETE /api/classes/{id}
POST /api/classes/{id}/join-code/regenerate ; GET /api/classes/{id}/members
POST /api/classes/join   (student, with code)

GET  /api/labs ; GET /api/labs/{slug}     (no answers)
GET/POST /api/assignments ; GET /api/assignments/{id}/results
GET  /api/attempts/{id} ; GET /api/students/{id}/history?lab=
GET  /api/analytics/classes/{id} ; GET /api/assignments/{id}/export.csv

POST /api/lab-sessions ; GET /api/lab-sessions/{id}
POST /api/lab-sessions/{id}/stop | extend | submit | answers-draft
GET  /api/lab-sessions/{id}/connect      (VNC credentials for the owner only)
GET  /api/monitor/sessions               (SSE)  ; POST /api/monitor/sessions/{id}/terminate
GET  /internal/lab-auth                  (Traefik forward-auth; not reachable from outside)
GET  /healthz ; GET /readyz
```

Every endpoint enforces RBAC and object-level ownership server-side (for example a teacher sees only their own classes' students).

---

## 8. Security requirements (non-negotiable)

**Platform**

- Argon2id; secure cookies; CSRF protection; strict CORS (same-origin by default); security headers including a strict CSP; request validation on every input; ORM or parameterized queries only; rate limits on login, registration, reset, and session launch.
- RBAC and IDOR test matrix: for each endpoint, assert student, teacher (own and other), and admin behavior.
- Secrets only via environment or Docker secrets. `.env.example` has no real values. Refuse to start in production mode with default or weak secrets.
- Structured logs with no passwords, tokens, VNC passwords, or flags. Audit-log security-relevant events (logins, failures, user changes, assignments, session terminations).
- CI runs `pip-audit` and `npm audit`; pin dependency versions.

**Sandbox (every lab container)**

- Not privileged; `no-new-privileges`; `cap_drop: ALL` then add back only what is needed (for example `NET_RAW` for the attacker so Nmap SYN scans work); `pids_limit`, memory, and CPU limits; no host networking; no host bind mounts; **never mount the Docker socket into a lab container**; no published host ports; per-session `internal` network with no internet egress; non-root user where the image allows. Any exception must appear in the lab manifest under `security_exceptions` with a justification, and be listed in `THREAT_MODEL.md`.
- The API reaches Docker **only** through `docker-socket-proxy` with the minimum permissions enabled. The API container runs as non-root.
- Write `docs/THREAT_MODEL.md`: assets, trust boundaries, attacker model (malicious student, compromised lab container, curious teacher), mitigations, and **residual risk**. State plainly that anyone who compromises the API can influence Docker, and recommend a dedicated host or VM for production.

---

## 9. Repository layout

```
/
├── README.md  PROMPT.md  AGENTS.md  Makefile  docker-compose.yml  docker-compose.prod.yml  .env.example
├── backend/            # FastAPI app, alembic/, tests/
├── frontend/           # React app, tests/, e2e/
├── labs/
│   ├── _template/
│   ├── <six starter lab packages>/
│   └── images/         # kali-desktop and custom target Dockerfiles
├── deploy/             # traefik config, socket-proxy config, backup script
├── scripts/            # smoke_test.sh, seed_dev.py
├── docs/               # see section 12
└── .github/workflows/ci.yml
```

Create an `AGENTS.md` at the root describing build, test, and lint commands and the code conventions you used, so future agents can work in the repo.

---

## 10. Developer experience

- `make dev` starts everything with `RUNTIME=fake` by default; `make dev-docker` uses the real runtime. Other targets: `make test`, `make lint`, `make migrate`, `make seed`, `make build-images`, `make smoke`.
- `scripts/seed_dev.py` (refuses to run when `APP_ENV=production`) creates a demo admin, one teacher, three students, a class, and one assignment, and prints the credentials.
- `python -m app.cli create-admin` for production bootstrapping.
- Health checks on every compose service. Migrations run automatically on API start (togglable).
- `deploy/backup.sh` with `pg_dump` plus restore instructions.
- `.env.example` must document every variable with a comment.

---

## 11. Testing and quality gates

- Backend: pytest with at least 80% coverage on services. Must include grading (all question types, including leakage tests), auth and lockout, password reset, RBAC and IDOR matrix, session lifecycle and reaper using `FakeRuntime`, and manifest validation tests (including rejecting `internet: true` and unjustified exceptions).
- `integration` marker: real Docker tests (start a lab, verify isolation properties, verify cleanup). Skipped automatically when Docker is unavailable.
- Frontend: Vitest tests for the key components (login, join flow, assignment form, workspace, results).
- One Playwright e2e against `RUNTIME=fake`: teacher creates a class, student joins, teacher assigns, student launches, answers, submits, and the teacher sees the score.
- `scripts/smoke_test.sh`: for me to run on a real Docker host. It builds the images, starts the stack, creates a session for each starter lab, checks that the attacker desktop responds, checks that the target is reachable from the attacker but not from the internet or other sessions, checks cleanup, and prints PASS or FAIL per lab.
- CI: lint, type-check, tests, audits.

---

## 12. Documentation to produce

`README.md` (quick start in 10 commands or fewer), `docs/ARCHITECTURE.md`, `docs/THREAT_MODEL.md`, `docs/LAB_AUTHORING.md`, `docs/DEPLOYMENT.md`, `docs/ADMIN_GUIDE.md`, `docs/TEACHER_GUIDE.md`, `docs/STUDENT_GUIDE.md`, `docs/DECISIONS.md`, `docs/EXTERNAL_STEPS.md`.

---

## 13. EXTERNAL STEPS: you must tell me these

Create `docs/EXTERNAL_STEPS.md` as a numbered checklist with exact commands, and paste the same checklist at the end of your final message. At minimum cover the following, and add anything else you discover while building:

1. **Host requirements.** Linux server or VM, Docker Engine and Compose v2 versions, and a capacity table: approximate RAM, CPU, and disk per concurrent session, with a formula for how many simultaneous students a given host supports.
2. **Building and pulling images.** `make build-images` (expected size and time), plus every third-party image used, with exact names and tags, how to verify each one pulls, and what to do if a tag has moved or disappeared. Mention Docker Hub rate limits.
3. **Domain, DNS, TLS.** What is needed for Let's Encrypt (public DNS and ports 80/443), or how to use an internal CA or a self-signed certificate on a campus network.
4. **Email.** SMTP credentials and the exact environment variables (used for teacher onboarding and password reset).
5. **Secrets.** Commands to generate each required secret and where to put them.
6. **First run.** Migrations, `labs sync`, creating the first admin, logging in, accepting the AUP.
7. **Network and firewall.** Only 80/443 exposed; confirm the Docker daemon and database ports are not.
8. **Smoke test.** How to run `scripts/smoke_test.sh` and how to read the result.
9. **Institutional and legal.** Written approval from the institution's IT or security office, an acceptable-use policy for students, and why the host should be dedicated or isolated.
10. **Backups and updates.** How to schedule `backup.sh`, restore, and update the stack.
11. **Anything you could not verify in your sandbox**, each with the exact command I should run to verify it.

---

## 14. Milestones (commit after each)

1. **Foundations:** repo skeleton, compose stack, config, DB and migrations, logging, CI, health endpoints.
2. **Identity:** auth, sessions, CSRF, AUP, password reset, RBAC, admin user management, audit log.
3. **Classes and assignments:** classes, join codes, rosters, assignments and targets.
4. **Lab system:** manifest schema and validator, `labs sync`, catalog API, all grading types with tests.
5. **Runtime:** `LabRuntime`, `FakeRuntime`, `DockerRuntime`, session lifecycle, reaper, reconcile, Traefik forward-auth, socket proxy.
6. **Frontend (student and shared):** app shell, auth screens, dashboard, workspace, results, history.
7. **Frontend (teacher and admin):** classes, assign flow, results, analytics, CSV export, live monitor, system dashboard.
8. **Content:** attacker image, custom target images, the six starter labs with full guides and questions, PCAP generator.
9. **Hardening and finish:** threat model, isolation tests, smoke test, e2e, accessibility pass, all docs, final polish.

---

## 15. Definition of done and final report

Done means: `make dev` brings up a working system; the Playwright e2e passes in fake mode; all backend and frontend tests and lints pass; the six labs validate and sync; the docs exist; and `scripts/smoke_test.sh` is ready for me to run on a Docker host.

Your **final message** must contain, in this order:

1. **What was built** (a short summary, plus a list of the starter labs).
2. **How to run it** (five commands or fewer, for both fake mode and real Docker mode).
3. **Verified here vs. not verified here** (honest, specific).
4. **EXTERNAL STEPS FOR ME** (the full checklist from section 13).
5. **Known limitations and recommended next steps.**
