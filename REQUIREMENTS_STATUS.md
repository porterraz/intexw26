# Requirements Status (IS 401 / 413 / 414 / 455)

Updated: 2026-04-08

## IS 401 (Web App UX/Feature Delivery)
- Dashboard cleanup: Admin dashboard layout simplified and whitespace reduced.
- Donation UX: Donor login now routes to `/donor/dashboard` (not `/impact`), donation form is prominent, and donor nav includes `Make Donation` shortcut.
- Public impact CTA: `Impact` page now includes direct donate action (`Log in to Donate` or `Make a Donation` for donor users).

## IS 413 (Data / Application Integration)
- Database connectivity verified locally and against deployed API.
- Local check: `GET http://localhost:5007/api/public/stats` returns `200` with live DB-backed values.
- Deployed check: `GET https://intexw26-api-21573.azurewebsites.net/api/public/stats` returns `200`.

## IS 414 (Security)
- Password reset flow implemented end-to-end:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
  - Frontend `/forgot-password` now requests token and resets password.
- Runtime verified via temporary account signup -> forgot-password -> reset-password -> login.
- Existing security controls kept intact: JWT auth, RBAC route/endpoint protection, CSP header, HSTS in non-development.
- Deployment checks:
  - HTTP to HTTPS redirect present for web app (`301`).
  - API responses include `content-security-policy` and `strict-transport-security` headers.

## IS 455 (ML Pipelines)
- Notebook execution verified (headless via `jupyter nbconvert --execute`) after dependency setup.
- Executed successfully:
  - `ML_Pipeline/donor-churn-classifier.ipynb`
  - `ML_Pipeline/resident-risk-predictor.ipynb`
  - `ML_Pipeline/social-media-donation-predictor.ipynb`
  - `ML_Pipeline/IS455_Master_Models.ipynb` (updated to current CSV schema)
- Social media and master notebooks were patched for current dataset schema and numeric feature handling so execution completes.

## Notes
- Frontend and backend both compile successfully:
  - `npm run build` (frontend)
  - `dotnet build` (backend)
- This file documents technical completion status; rubric scoring still depends on TA evaluation, demo quality, and required video/documentation evidence.
