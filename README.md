# Cyber Range — College Demo

A local, no-cost prototype for demonstrating how a college cybersecurity lab portal could work. It uses SQLite and a simulated lab runtime. It does not need Docker, paid hosting, a domain, or an email provider.

The frontend is React with JavaScript/JSX and Vite. The API is Python with FastAPI, and local data is stored in SQLite.

## What the demo shows

- Student, teacher, and administrator sign-in.
- Classes, assignments, a lab catalog, and server-side answer grading.
- Six guided cybersecurity lesson examples.
- A simulated lab workspace that shows session evidence and lets students submit and review graded answers. It does not run Kali tools or vulnerable target containers.
- Admin controls for local demo accounts and enabling or hiding lessons. Temporary passwords and reset messages appear in the API terminal; no email provider is needed.

## Run locally on Windows

Install Python 3.12 and Node.js 22. Open three PowerShell terminals in this project folder.

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

Open [http://localhost:5173](http://localhost:5173). Keep the API and website terminals running while you use the demo. The SQLite database is created at `backend/cyberrange.db`.

Teacher, student, and administrator walkthroughs are in [docs/TEACHER_GUIDE.md](docs/TEACHER_GUIDE.md), [docs/STUDENT_GUIDE.md](docs/STUDENT_GUIDE.md), and [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md).

## What's intentionally outside this demo

Real lab containers, public deployment, TLS, email verification, and production hosting are outside this prototype. See [docs/LOCAL_DEMO.md](docs/LOCAL_DEMO.md) for a short presentation guide.

## Starter lessons

1. Network Reconnaissance with Nmap
2. SQL Injection and Parameterized Queries
3. Password Auditing in a Lab
4. Exploitation Fundamentals with Metasploit
5. Network Traffic Analysis and Forensics
6. Linux Firewall Hardening
