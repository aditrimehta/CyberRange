# Cyber Range: College Demo

A local, no-cost prototype for demonstrating how a college cybersecurity lab portal could work. It uses SQLite and local Docker containers for three hands-on labs. It does not need paid hosting, a domain, or an email provider.

The frontend is React with JavaScript/JSX and Vite. The API is Python with FastAPI, and local data is stored in SQLite. On this Windows demo, one Ubuntu WSL2 VM hosts Docker. Each student session gets a private network and disposable containers inside that shared host. The platform does not boot a separate VM per student. This keeps startup and memory costs low while exercises change real services, databases, and files.

## What the demo shows

- Student, teacher, and administrator sign-in.
- Classes, assignments, a lab catalog, and server-side answer grading.
- Exactly three hands-on labs: scan and close a service with Nmap; demonstrate and fix SQL injection; generate HTTP activity and investigate the application log it creates.
- Log analysis selects from 864 combinations of incident details per new session. Details stay fixed on resume; grading uses the session's own incident. Investigation hints suggest searches, while progress tracks the evidence actually viewed.
- Nmap varies its unnecessary listener's port/name and whether an extra status service is present. SQL varies its example payload, account count, and admin role. All variants stay fixed for that session and are graded on the server.
- Students browse **My classes** and class-specific assignments. Teacher class dashboards report submissions, passes at 80%, remediation, attempts, and time spent. Below 80%, students must reattempt; remediation is available until passing. Every submitted attempt is retained in SQLite, including answers and feedback, while temporary environment data is removed.
- Students can run the fixed lab actions, submit answers, and review their score and feedback. The app does not offer an unrestricted terminal or scan arbitrary networks.
- Admin controls for local demo accounts and enabling or hiding lessons. Temporary passwords and reset messages appear in the API terminal; no email provider is needed.

## Run locally on Windows

Install Python 3.12, Node.js 22, and Docker Desktop, with its WSL integration enabled for Ubuntu. All three labs require Docker. The demo environment selects Ubuntu through `LAB_VM_DISTRO`; verify it with `wsl -d Ubuntu -- docker info`. Set `LAB_VM_DISTRO` to an empty string to use Docker directly on another host. Open PowerShell terminals in the project folder.

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

Verify the VM connection with `wsl -d Ubuntu -- docker compose version`. The first session builds the shared training images and may take a few minutes. Later sessions reuse these images; student data is never stored in the images.

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
5. Start Docker Desktop and enable Ubuntu integration before launching any lab. The first run downloads the training images.

Teacher, student, and administrator walkthroughs are in [docs/TEACHER_GUIDE.md](docs/TEACHER_GUIDE.md), [docs/STUDENT_GUIDE.md](docs/STUDENT_GUIDE.md), and [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md).

## What's intentionally outside this demo

The files under `backend/tests/` and frontend `*.test.jsx` are development regression tests. They are not needed to start the app or run its labs, and Vite excludes them from the production website bundle. Keep them when developing; run Python tests with pytest and frontend checks with `npm test`.

Each session's target has a read-only root filesystem and an 8 MB temporary filesystem for its database, logs, and exercise changes. No lab service publishes a port to Windows. Submission, stop, expiry, or idle cleanup removes the session's Compose project and temporary data. Closing the browser alone leaves it available until idle cleanup. The shared VM and image cache stay available. Run `.\.venv\Scripts\python.exe scripts/check_lab_runtime.py` to verify all three real exercises and their cleanup.

Public deployment, TLS, email verification, and production hosting are outside this prototype. Lab containers are restricted to local, isolated sessions. See [docs/LOCAL_DEMO.md](docs/LOCAL_DEMO.md) for a short presentation guide.
