# Conference Management System

A local-development prototype for managing conference workflows. It uses a FastAPI backend, a React and TypeScript frontend, and a file-backed SQLite database.

## Features

- Conference, session, and room management
- JWT authentication and role-based access for organizers, participants, authors, reviewers, and speakers
- Registration and demo payment flows, including receipts and refunds
- Submission and peer-review workflows
- Attendance, feedback, announcements, and search
- Sponsor and exhibitor management
- Dashboard statistics, resource forecasts, room utilization, and reviewer workload
- Certificate generation, download, and verification

## Technology

- Backend: Python, FastAPI, SQLAlchemy, PyJWT
- Frontend: React 19, TypeScript, Vite, React Router, Axios
- Database: SQLite
- API docs: FastAPI Swagger UI

## Prerequisites

- Python 3.10 or later
- Node.js 20.19+ or 22.12+ and npm (required by Vite 8)

## Run locally

### 1. Start the backend

Run these commands from the repository root in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

On startup, the backend creates or updates the SQLite schema at `backend\conference.db` and ensures the demo accounts and sample conference data are available.

- API: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

### 2. Start the frontend

In a second terminal, from the repository root:

```powershell
cd frontend\frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (typically http://localhost:5173). The frontend uses `http://127.0.0.1:8000` as its API by default. To use another API URL, create `frontend\frontend\.env.local` with:

```text
VITE_API_URL=http://127.0.0.1:8000
```

Restart the Vite server after changing the environment file.

## Demo accounts

All demo accounts use the password `demo123`:

| Role | Email |
| --- | --- |
| Organizer | `organizer@demo.com` |
| Participant | `participant@demo.com` |
| Author | `author@demo.com` |
| Reviewer | `reviewer@demo.com` |
| Speaker | `speaker@demo.com` |

## Checks and production build

Run the backend smoke test from the repository root:

```powershell
python -m backend.demo_test
```

Run frontend linting and create a production build from `frontend\frontend`:

```powershell
npm run lint
npm run build
```

## Database and payment notes

- The local database is `backend\conference.db`.
- `python -m backend.seed_demo` recreates the demo database from scratch and **deletes existing data in that database**. Use it only when you intend to reset the local data.
- Payments use a local `college_demo_gateway` adapter. It records demo order and transaction references and does not collect card or UPI credentials. A deployment must use an approved payment provider and validate signed webhooks server-side.
- This is a prototype, not a production-hardened conference platform.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
