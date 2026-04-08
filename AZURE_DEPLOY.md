# Deploy to Azure App Service (Current Repo Setup)

This repository deploys **both apps to Azure App Service** using GitHub Actions.

- Backend workflow: `.github/workflows/azure-backend-app-service.yml`
- Frontend workflow: `.github/workflows/azure-frontend-static-web-app.yml`

Both workflows support:
- `push` to `main` (with path filters)
- manual run via `workflow_dispatch`

## 1. Required GitHub Configuration

Set these exactly in **GitHub repo Settings → Secrets and variables → Actions**.

### Secrets

- `INTEX_AZURE_WEBAPP_BACKEND_PUBLISH_PROFILE`
  - Value: contents of backend App Service publish profile
- `INTEX_AZURE_WEBAPP_FRONTEND_PUBLISH_PROFILE`
  - Value: contents of frontend App Service publish profile

### Variables

- `INTEX_AZURE_WEBAPP_BACKEND_NAME`
  - Backend App Service name (example: `intexw26-api-21573`)
- `INTEX_AZURE_WEBAPP_FRONTEND_NAME`
  - Frontend App Service name (example: `intexw26-web-21573`)
- `VITE_API_BASE_URL`
  - Public backend base URL used at frontend build time
  - Example: `https://intexw26-api-21573.azurewebsites.net`
  - Use origin only (no trailing slash, no extra path)

## 2. Workflow Triggers

### Backend deploy workflow

Runs on push to `main` only when one of these paths changes:
- `intex-backend/**`
- `.github/workflows/azure-backend-app-service.yml`

### Frontend deploy workflow

Runs on push to `main` only when one of these paths changes:
- `intex-frontend/**`
- `.github/workflows/azure-frontend-static-web-app.yml`

If your merge to `main` does not touch those paths, deployment will not auto-run. Use **Actions → Run workflow** in that case.

## 3. Azure App Settings (Backend)

In backend App Service, configure:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__Secret`
- `Jwt__ExpiresMinutes` (optional)
- `Cors__AllowedOrigins__0` (frontend URL)
- `Cors__AllowedOrigins__1` (optional additional frontend URL)

After updating settings, restart the backend app.

## 4. Database Migrations

Apply EF migrations to Azure SQL (from a trusted machine/runner):

```bash
cd intex-backend
dotnet ef database update
```

Ensure `ConnectionStrings__DefaultConnection` targets your Azure SQL instance when running this.

## 5. Safe Deployment Flow

1. Work in feature branch (for example `isaac2`).
2. Open PR into `main`.
3. Merge PR.
4. Confirm GitHub Actions succeeded:
   - Deploy backend (Azure App Service)
   - Deploy frontend (Azure App Service)
5. Smoke test live frontend and API.

## 6. Local Frontend Production Build Check

```bash
cd intex-frontend
npm ci
VITE_API_BASE_URL=https://your-api-host.example.com npm run build
```

Use this to validate production build behavior before merging.
