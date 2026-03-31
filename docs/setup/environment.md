# Environment Variables

This document lists all the `.env` configuration requirements for the Richwell Portal system. It's critical that these secrets are never checked into version control.

> [!WARNING]
> Keep your `.env` files safe. Do not commit them to Git.

## Backend `.env` (`/backend/.env`)

| Variable | Description | Example | Required |
|----------|-------------|---------|:--------:|
| `SECRET_KEY`| Django's cryptographic signing key. Must be a large random string. | `django-insecure-xxx...` | Yes |
| `DEBUG` | Set `True` for development, `False` for production. | `True` | Yes |
| `ALLOWED_HOSTS` | Comma-separated list of hostnames permitted to serve the backend. | `localhost,127.0.0.1` | Yes |
| `DATABASE_URL` | PostGIS / PostgreSQL connection string. | `postgis://user:pass@localhost:5432/richwell`| Yes |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins allowed to make API requests via CORS. | `http://localhost:5173` | Yes |
| `SMTP_HOST` | Email server hostname. | `smtp.gmail.com` | Yes |
| `SMTP_PORT` | Email server port (usually 587 or 465). | `587` | Yes |
| `SMTP_USER` | Email account username. | `admin@richwell.edu.ph` | Yes |
| `SMTP_PASS` | App password or email password. | `abcd efgh ijkl mnop` | Yes |
| `SMTP_USE_TLS` | Boolean flag to enable TLS for secure email transmission. | `True` | Yes |

## Frontend `.env` (`/frontend/.env`)

> [!NOTE]
> Variables in Vite must be prefixed with `VITE_` to be exposed to the client-side code.

| Variable | Description | Example | Required |
|----------|-------------|---------|:--------:|
| `VITE_API_URL` | The base URL of the Django backend API. | `http://localhost:8000/api` | Yes |
| `VITE_APP_NAME` | Display name of the application across the UI. | `Richwell Portal` | No |
