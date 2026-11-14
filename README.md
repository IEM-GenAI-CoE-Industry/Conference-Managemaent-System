# Conference Management System

This repository contains a working prototype for a conference management application built with a FastAPI backend and a React + TypeScript frontend. It is intended for local development, demo use, and continued prototype work rather than a production deployment.

## What this project includes

The app currently supports the following prototype workflows:

- Conference listing and detail views
- Session and agenda browsing
- User authentication with JWT tokens and role checks
- Organizer/participant access patterns
- Registration creation and per-user registration queries
- Server-priced registration payments with gateway-style order/callback states, receipts, and refunds
- Attendance marking and attendance lookup
- Feedback submission and summary views
- Sponsor and exhibitor management
- Dashboard statistics and reviewer/speaker directory endpoints
- Certificate generation, verification, and PDF download
- Demo database seeding for local testing

## Technology stack

- Backend: Python, FastAPI, SQLAlchemy, PyJWT
- Frontend: React, TypeScript, Vite
- Database: SQLite (local file-backed prototype database)
- API documentation: FastAPI OpenAPI / Swagger UI

## Repository layout

```text
Conference-Managemaent-System/
├── backend/
│   ├── auth.py
│   ├── database.py
│   ├── demo_test.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── seed_demo.py
│   ├── conference.db
│   └── routers/
├── frontend/
│   └── frontend/
│       ├── package.json
│       ├── public/
│       └── src/
├── LICENSE
├── .gitignore
├── README.md
└── .venv/   (optional local virtual environment)
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- Git

## Backend setup

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

Seed the demo database:

```powershell
python -m backend.seed_demo
```

This creates the SQLite database used by the backend and inserts demo conference data.

Start the backend:

```powershell
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API is available at:

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

## Frontend setup

In a separate terminal:

```powershell
cd frontend\frontend
npm install
npm run dev
```

The frontend is served by Vite on:

- Frontend UI: http://localhost:5173

## Demo accounts

The demo seed creates these accounts:

- Organizer: organizer@demo.com / demo123
- Participant: participant@demo.com / demo123
- Author: author@demo.com / demo123
- Reviewer: reviewer@demo.com / demo123
- Speaker: speaker@demo.com / demo123

## Validation

Run the backend smoke test from the repository root:

```powershell
python -m backend.demo_test
```

This smoke test exercises the major prototype login, profile, conference, dashboard, registration, payment, and attendance flows.

## Notes

- The project uses SQLite locally; the database file is created under the backend folder.
- The backend initializes demo data automatically when needed.
- Payments use an explicit `college_demo_gateway` adapter locally. It behaves like a hosted UPI/card checkout and records order and transaction references, but never collects card or UPI credentials. For deployment, replace the callback adapter with the college's Razorpay, PayU, SBI Collect, or approved provider integration and verify its signed webhook server-side.
- This repository is a prototype and not a fully production-hardened conference platform.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
