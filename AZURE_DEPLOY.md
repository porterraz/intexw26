# Deploy to Azure (Option A)

**Option A:** Users use the **frontend** URL (main link). The **API** is deployed separately on its **own HTTPS origin** (for example `https://app.example.com` and `https://api.example.com`). The React app calls the API using `VITE_API_BASE_URL` (see [`intex-frontend/src/lib/api.ts`](intex-frontend/src/lib/api.ts)).

Recommended layout:

| Component | Azure service |
|-----------|----------------|
| Frontend | [Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/overview) |
| Backend | [Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/overview) (Linux, .NET) |
| Database | [Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/sql-database-paas-overview) |

## 1. Azure SQL Database

1. Create a logical server and a single database.
2. Allow connectivity from your App Service (firewall rule for Azure services and/or your App Service outbound IPs).
3. Build a **SQL connection string** for Entity Framework (same shape as local `ConnectionStrings:DefaultConnection`).

## 2. Backend — Azure App Service

1. Create a **Linux** Web App and choose **.NET 10** runtime.
2. Under **Configuration → Application settings**, add:

   - `ConnectionStrings__DefaultConnection` — Azure SQL connection string (use **Connection strings** tab if you prefer; either works with ASP.NET Core).
   - **JWT** (required for auth; use long random secrets in production):
     - `Jwt__Issuer` — e.g. `https://api.example.com`
     - `Jwt__Audience` — e.g. `https://app.example.com` or the same as Issuer if you prefer
     - `Jwt__Secret` — long random string (e.g. 32+ bytes base64)
     - `Jwt__ExpiresMinutes` — optional (defaults from code if omitted)
   - **CORS** — must list your **Static Web Apps** URL(s) only (no trailing slash):
     - `Cors__AllowedOrigins__0` — e.g. `https://app.example.com`
     - Add `Cors__AllowedOrigins__1` for a staging frontend URL if needed.

3. Save and restart the app.
4. **Database schema:** from your machine (or a CI job), run EF migrations against Azure SQL, for example:

   ```bash
   cd intex-backend
   dotnet ef database update
   ```

   Point `ConnectionStrings__DefaultConnection` at Azure SQL for that command (user secrets, env var, or temporary `appsettings` — your team’s usual practice).

5. **Custom domain:** bind `api.example.com` (or your chosen API host) to the App Service and enable HTTPS.

## 3. Frontend — Azure Static Web Apps

1. In the Azure Portal, create a **Static Web App** and link your **GitHub** repository (or use the workflow only and connect the resource manually — follow the wizard you prefer).
2. **GitHub secrets / variables** (for the workflow [`.github/workflows/azure-frontend-static-web-app.yml`](.github/workflows/azure-frontend-static-web-app.yml)):
   - Secret: `AZURE_STATIC_WEB_APPS_API_TOKEN` — from Static Web App → **Manage deployment token**.
   - Variable: `VITE_API_BASE_URL` — your **public API origin**, e.g. `https://api.example.com` (no path, no trailing slash).
3. **GitHub secrets / variables** (for [`.github/workflows/azure-backend-app-service.yml`](.github/workflows/azure-backend-app-service.yml)):
   - Secret: `AZURE_WEBAPP_PUBLISH_PROFILE` — App Service → **Download publish profile** (file contents).
   - Variable: `AZURE_WEBAPP_NAME` — the App Service **name** (not the full URL).

4. Push to `main` or run the workflows manually (**Actions → workflow_dispatch**).
5. **Custom domain:** bind `app.example.com` (or apex/`www`) to the Static Web App.

## 4. Local production build check

Copy [`intex-frontend/.env.production.example`](intex-frontend/.env.production.example) to `intex-frontend/.env.production`, set `VITE_API_BASE_URL`, then:

```bash
cd intex-frontend
npm ci
npm run build
```

## 5. SPA routing

[`intex-frontend/public/staticwebapp.config.json`](intex-frontend/public/staticwebapp.config.json) configures client-side route fallback so React Router deep links work on Static Web Apps.

If something still 404s after deploy, confirm the file appears at the **root of `dist/`** after build (Vite copies `public/` into `dist/`).
