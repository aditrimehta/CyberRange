# Cyber Range — College Demo

A local, no-cost prototype for demonstrating how a college cybersecurity lab portal could work. It uses SQLite and local Docker containers for three hands-on labs. It does not need paid hosting, a domain, or an email provider.

The frontend is React with JavaScript/JSX and Vite. The API is Python with FastAPI, and local data is stored in SQLite.

## What the demo shows

- Student, teacher, and administrator sign-in.
- Classes, assignments, a lab catalog, and server-side answer grading.
- Three hands-on labs: Nmap reconnaissance and SQL injection use disposable Docker targets on a private network; security log analysis searches a bundled synthetic log.
- Students can run the fixed lab actions, submit answers, and review their score and feedback. The app does not offer an unrestricted terminal or scan arbitrary networks.
- Admin controls for local demo accounts and enabling or hiding lessons. Temporary passwords and reset messages appear in the API terminal; no email provider is needed.

## Run locally on Windows

Install Python 3.12, Node.js 22, and Docker Desktop. Start Docker Desktop before opening a hands-on Nmap or SQL injection lab. Open three PowerShell terminals in this project folder. These commands are for a fresh clone on Windows.

In a new terminal, confirm Docker is ready with `docker --version` and `docker compose version`. If PowerShell says `docker` is not recognized after installing Docker Desktop, close and reopen VS Code so its terminal picks up the Docker CLI path.

**Terminal 1 — start the API.**

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
. .\scripts\demo-env.ps1
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

**Terminal 2 — add demo accounts.**

```powershell
. .\scripts\demo-env.ps1
.\.venv\Scripts\python.exe .\scripts\seed_dev.py
```

For a fresh database, the script prints the demo sign-in credentials and student join code. It refuses to recreate accounts if the demo users already exist. Local account setup and password reset messages are printed in the API terminal.

**Terminal 3 — start the website.**

```powershell
cd frontend
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Keep the API and website terminals running while you use the demo. The SQLite database is created at `backend/cyberrange.db`. The first Nmap or SQL injection session builds the small target images and may take a few minutes; it needs internet access for that initial download.

### Demo sign-ins

Run the seed command once on a fresh database. Use these accounts on the sign-in page:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@cyberrange.local` | `RangeAdmin!2026` |
| Teacher | `teacher@cyberrange.local` | `RangeTeacher!2026` |
| Student 1 | `student1@cyberrange.local` | `RangeStudent1!2026` |
| Student 2 | `student2@cyberrange.local` | `RangeStudent2!2026` |
| Student 3 | `student3@cyberrange.local` | `RangeStudent3!2026` |

The student join code is randomly generated and printed by the seed script. These are local demo credentials; do not reuse them outside the prototype.

### Instructions for someone cloning the project

1. Install Git, Python 3.12, Node.js 22, and Docker Desktop.
2. In PowerShell, clone the repository and enter its folder:

   ```powershell
   git clone https://github.com/aditrimehta/CyberRange.git
   cd CyberRange
   ```

3. Open the folder in VS Code and follow the three-terminal steps above.
4. Run the seed script once to create the demo accounts and class. The database and `.env` are local and are not included in Git.
5. Start Docker Desktop before launching the Nmap or SQL lab. The first run downloads the training images; log analysis works without Docker.
6. Keep the API and Vite terminals open while using the site. Stop each server with `Ctrl+C` when finished.

Teacher, student, and administrator walkthroughs are in [docs/TEACHER_GUIDE.md](docs/TEACHER_GUIDE.md), [docs/STUDENT_GUIDE.md](docs/STUDENT_GUIDE.md), and [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md).

## What's intentionally outside this demo

Public deployment, TLS, email verification, and production hosting are outside this prototype. Lab containers are restricted to local, isolated sessions. See [docs/LOCAL_DEMO.md](docs/LOCAL_DEMO.md) for a short presentation guide.
