# Prototype Review — 4 Sep 2026

## Requirements basis
The supplied requirements define 20 deliverables and four decision-support features. The four new features are attendance-based resource forecasting, live bottleneck detection, room utilization optimization, and reviewer workload balancing.

## Problems found in the uploaded repository
1. `backend/main.py` imported `routers` instead of `backend.routers`, which breaks package execution.
2. `dashboard_router.py` imported `Review` and `Submission`, but those models were not present because Swapna's work is still pending.
3. `auth.py` expected `User.name`, `User.hashed_password`, and `User.is_active`, while `models.py` only defined `username`, `password`, and no `is_active`.
4. `requirements.txt` contained unresolved Git merge-conflict markers.
5. Registration, payment and attendance routers were only dummy endpoints.
6. Bottleneck detection was only a placeholder.
7. Reviewer workload was not safely integrated when review tables were absent.
8. The React frontend was still the default Vite starter and referenced missing starter assets.

## Prototype treatment
- Kept Swapna's module out of the implementation.
- Implemented real SQLite-backed registration, payment and attendance flows.
- Implemented conference/session management, sponsor/exhibitor management, feedback, dashboard statistics, resource forecasting, bottleneck detection and room utilization.
- Added a safe reviewer-workload placeholder that becomes active when the submissions/reviews module is merged.
- Added a seed script and automated smoke test.
- Added CORS for the local React frontend.

## Verification
`python -m backend.seed_demo` followed by `python -m backend.demo_test` passes end-to-end.
