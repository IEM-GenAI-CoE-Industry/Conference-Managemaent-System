# Conference Management System

A full-stack conference lifecycle application for managing conferences, sessions, registrations, payments, attendance, feedback, and event operations. The project combines a FastAPI backend with a React + TypeScript frontend and uses SQLite as the default database for local development.

## Features

- Conference and session management
- Registration and attendee tracking
- Payments and participant billing workflows
- Attendance and feedback collection
- Sponsor and exhibitor management
- Review and submission workflows
- Dashboard and analytics views
- Bottleneck and resource forecasting
- Search and certificate-related features
- JWT-based authentication and role-aware access

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy, JWT auth
- Frontend: React, TypeScript, Vite
- Database: SQLite
- API docs: FastAPI Swagger UI / OpenAPI

## Repository Structure

```text
Conference-Managemaent-System/
├── backend/
│   ├── auth.py
│   ├── database.py
│   ├── demo_test.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── resource_forecast.py
│   ├── seed_demo.py
│   ├── seed_test_data.py
│   └── routers/
├── frontend/
│   └── frontend/
│       ├── package.json
│       ├── public/
│       └── src/
├── LICENSE
├── .gitignore
└── README.md
```

## Prerequisites

- Python 3.10+ recommended
- Node.js 18+ and npm
- Git

## Backend Setup

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
cd backend
pip install -r requirements.txt
```

Seed the demo database:

```powershell
python -m backend.seed_demo
```

Start the API server:

```powershell
cd ..
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

## Frontend Setup

In a separate terminal:

```powershell
cd frontend\frontend
npm install
npm run dev
```

The frontend is served by Vite and is typically available at:

- Frontend UI: http://localhost:5173

## Demo Credentials

The demo seed creates example accounts for testing:

- Organizer: organizer@demo.com / demo123
- Participant: participant@demo.com / demo123
- Author: author@demo.com / demo123
- Reviewer: reviewer@demo.com / demo123
- Speaker: speaker@demo.com / demo123

## Optional Validation

Run the backend smoke test:

```powershell
cd backend
python -m backend.demo_test
```

This checks the main API flows such as login, conferences, dashboard, registrations, payments, and attendance.

## Notes

- SQLite data is stored locally in the backend directory and is created automatically when the app starts.
- The app is intended as a working prototype for conference operations management and is suitable for local development and demos.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
