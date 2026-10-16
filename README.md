# Cyber Range: College Demo

A local, no-cost prototype for demonstrating how a college cybersecurity lab portal could work. It uses SQLite and local Docker containers for three hands-on labs. It does not need paid hosting, a domain, or an email provider.

The frontend is React with JavaScript/JSX and Vite. The API is Python with FastAPI, and local data is stored in SQLite.

## What the demo shows

- Student, teacher, and administrator sign-in.
- Classes, assignments, a lab catalog, and server-side answer grading.
- Three hands-on labs: Nmap reconnaissance and SQL injection use disposable Docker targets on a private network; security log analysis searches a bundled synthetic log.
- Students can run the fixed lab actions, submit answers, and review their score and feedback. The app does not offer an unrestricted terminal or scan arbitrary networks.
- Admin controls for local demo accounts and enabling or hiding lessons. Temporary passwords and reset messages appear in the API terminal; no email provider is needed.

## Run locally on Windows

Install Python 3.12, Node.js 22, and Docker Desktop. Docker Desktop must be running for the Nmap and SQL labs. Open PowerShell terminals in the project folder. Use the returning-user steps every time you start the app after setup.

### Returning user: start the app

You do not need to reinstall dependencies or recreate demo accounts each time.

**Terminal 1: start the API**

```powershell
. .\scripts\demo-env.ps1
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

**Terminal 2: start the website**

```powershell
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Keep both terminals running while you use the app. Stop each server with `Ctrl+C` when finished.

### First setup: fresh clone or missing dependencies

Install the dependencies once per clone. From the project root, run:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd frontend
npm ci
cd ..
```

Then create demo accounts once for a fresh database. In a new PowerShell terminal opened at the project root, run:

```powershell
. .\scripts\demo-env.ps1
.\.venv\Scripts\python.exe .\scripts\seed_dev.py
```

The script prints the sign-in credentials and a randomly generated student join code. It refuses to recreate accounts if demo users already exist. Do not run it again on an already seeded database. The database is stored at `backend/cyberrange.db` and is not included in Git.

If Docker is not recognized, confirm it is installed with `docker --version` and `docker compose version`. Reopen VS Code after installing Docker Desktop. The first Nmap or SQL session downloads its training images and may take a few minutes. Log analysis works without Docker.

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

3. Open the folder in VS Code and complete the First setup steps above.
4. Start the API and website using the Returning user steps above.
5. Start Docker Desktop before launching the Nmap or SQL lab. The first run downloads the training images; log analysis works without Docker.

Teacher, student, and administrator walkthroughs are in [docs/TEACHER_GUIDE.md](docs/TEACHER_GUIDE.md), [docs/STUDENT_GUIDE.md](docs/STUDENT_GUIDE.md), and [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md).

## What's intentionally outside this demo

Public deployment, TLS, email verification, and production hosting are outside this prototype. Lab containers are restricted to local, isolated sessions. See [docs/LOCAL_DEMO.md](docs/LOCAL_DEMO.md) for a short presentation guide.
