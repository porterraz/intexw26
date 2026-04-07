# Intex W26

A full-stack web app for trafficking survivor support operations, with a public impact view and an authenticated admin dashboard.

## Capabilities

- Public pages for home, privacy, and impact metrics
- Secure authentication with protected admin routes
- Resident and supporter/donor management workflows
- Process recordings, home visitations, and social media analytics APIs
- Bilingual frontend support (English and Portuguese)

## Run Locally (Terminal)

Prereqs: Node.js + npm, and .NET SDK.

1. Start the backend:
   - `cd intex-backend`
   - `dotnet restore`
   - `dotnet run`
2. Start the frontend in a second terminal:
   - `cd intex-frontend`
   - `npm install`
   - `npm run dev`

## Stop the Project

- In each terminal where the app is running, press `Ctrl + C`.
- That stops `dotnet run` and the Vite dev server.

## Deploy to Azure (Option A)

- Frontend on **Azure Static Web Apps** (main URL). API on **Azure App Service** (separate URL). See [AZURE_DEPLOY.md](AZURE_DEPLOY.md).
