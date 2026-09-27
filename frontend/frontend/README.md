# Conference Management System Frontend

This is the React frontend for the Conference Management System. It provides the admin and attendee portal UI for conference operations, registrations, payments, sessions, reviews, search, and reporting.

## Stack

- React 19
- Vite
- TypeScript
- React Router
- Axios for API calls

## Features

- Authentication and signup flow
- Dashboard and conference management
- Session and registration management
- Payments, attendance, and certificate tracking
- Search, announcements, feedback, and reporting pages
- Role-based portal navigation and protected routing

## Local setup

From the frontend app folder:

```bash
cd frontend/frontend
npm install
npm run dev
```

The app will run with Vite on the default local development URL, typically:

```text
http://localhost:5173
```

## Production build

```bash
cd frontend/frontend
npm run build
```

## Project structure

```text
src/
  App.tsx
  Layout.tsx
  api.ts
  pages/
  components/
  main.tsx
```

## Notes

- The app expects the backend API to be running and reachable via the configured Axios base URL in `src/api.ts`.
- Protected screens are gated by a token stored in localStorage.
- The default route redirects authenticated users to the dashboard.
