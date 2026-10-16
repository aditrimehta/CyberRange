# Cyber Range — College Demo

A local, no-cost prototype for demonstrating how a college cybersecurity lab portal could work. It uses SQLite and local Docker containers for three hands-on labs. It does not need paid hosting, a domain, or an email provider.

The frontend is React with JavaScript/JSX and Vite. The API is Python with FastAPI, and local data is stored in SQLite.

## What the demo shows

- Student, teacher, and administrator sign-in.
- Classes, assignments, a lab catalog, and server-side answer grading.
- Six guided cybersecurity lesson examples. Nmap reconnaissance and SQL injection use disposable Docker targets on a private network; security log analysis searches a bundled synthetic log. The other three lessons remain guided exercises.
- Students can run the fixed lab actions, submit answers, and review their score and feedback. The app does not offer an unrestricted terminal or scan arbitrary networks.
- Admin controls for local demo accounts and enabling or hiding lessons. Temporary passwords and reset messages appear in the API terminal; no email provider is needed.

## Run locally on Windows

Install Python 3.12, Node.js 22, and Docker Desktop. Start Docker Desktop before opening a hands-on Nmap or SQL injection lab. Open three PowerShell terminals in this project folder.

In a new terminal, confirm Docker is ready with `docker --version` and `docker compose version`. If PowerShell says `docker` is not recognized after installing Docker Desktop, close and reopen VS Code so its terminal picks up the Docker CLI path.

**Terminal 1 — start the API.**

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e .\backend
. .\scripts\demo-env.ps1
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

**Terminal 2 — add demo accounts.**

```powershell
. .\scripts\demo-env.ps1
.\.venv\Scripts\python.exe .\scripts\seed_dev.py
```

The script prints the demo sign-in credentials and student join code. Local account setup and password reset messages are printed in the API terminal.

**Terminal 3 — start the website.**

```powershell
cd frontend
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Keep the API and website terminals running while you use the demo. The SQLite database is created at `backend/cyberrange.db`. The first Nmap or SQL injection session builds the small target images and may take a few minutes; it needs internet access for that initial download.

Teacher, student, and administrator walkthroughs are in [docs/TEACHER_GUIDE.md](docs/TEACHER_GUIDE.md), [docs/STUDENT_GUIDE.md](docs/STUDENT_GUIDE.md), and [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md).

## What's intentionally outside this demo

Public deployment, TLS, email verification, and production hosting are outside this prototype. Lab containers are restricted to local, isolated sessions. See [docs/LOCAL_DEMO.md](docs/LOCAL_DEMO.md) for a short presentation guide.

## Starter lessons

1. Network Reconnaissance with Nmap
2. SQL Injection and Parameterized Queries
3. Password Auditing in a Lab
4. Exploitation Fundamentals with Metasploit
5. Network Traffic Analysis and Forensics
6. Linux Firewall Hardening
