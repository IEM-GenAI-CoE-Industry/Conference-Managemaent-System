# Conference Management System 

This repository contains the backend prototype and a small React demo dashboard. The implementation is aligned with the supplied CMS requirements and team assignment. 

## Backend demo

From the repository root:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
python -m backend.seed_demo
python -m uvicorn backend.main:app --reload
```

Open Swagger UI:

`http://127.0.0.1:8000/docs`

Demo organizer:
- Email: `organizer@demo.com`
- Password: `demo123`

Other demo users use the same password:
- `participant@demo.com`
- `author@demo.com`
- `reviewer@demo.com`
- `speaker@demo.com`
- `participant2@demo.com`

Run the smoke test in another terminal:

```powershell
python -m backend.demo_test
```

## Frontend demo

In a second terminal:

```powershell
cd frontend/frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The dashboard logs in with the demo organizer and displays registration, revenue, satisfaction, resource forecast, bottlenecks and room utilization.

## Prototype notes

- SQLite is used for the demo so the project runs without PostgreSQL setup.
- The architecture remains FastAPI + SQLAlchemy + JWT, matching the supplied stack at prototype level.
- `python -m backend.seed_demo` resets the local SQLite database and creates realistic demo data.
