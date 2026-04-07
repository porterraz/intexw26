# Intex W26

Nova Path is a full-stack platform that supports survivor care operations with a public impact site and a secure admin dashboard.

## Live Azure App

- Website: https://intexw26-web-21573.azurewebsites.net
- API: https://intexw26-api-21573.azurewebsites.net

## Run Locally

Prereqs: .NET SDK and Node.js/npm.

1. Backend
   - `cd intex-backend`
   - `dotnet restore`
   - `dotnet run`
2. Frontend (new terminal)
   - `cd intex-frontend`
   - `npm install`
   - `npm run dev`

## Deployment Notes

Azure deployment is managed by GitHub Actions. See [AZURE_DEPLOY.md](AZURE_DEPLOY.md).
