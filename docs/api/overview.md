# API Overview

## Base URL
```text
Development: http://localhost:8000/api/
Production:  https://yourapp.com/api/
```

## Authentication
Browser authentication is cookie-based.

1. `POST /api/accounts/auth/login/` validates the credentials and sets the access and refresh cookies.
2. The frontend does not read raw JWTs from the JSON body.
3. The browser sends the auth cookies automatically on same-origin API calls.
4. Non-GET requests must include `X-CSRFToken`. Fetch it first with `GET /api/accounts/auth/csrf/`.

For browser clients, treat the cookies as the session contract. Do not build new frontend logic that depends on `access` or `refresh` appearing in the JSON response body.

## Success Responses
Successful responses are serializer payloads or action payloads. Common shapes include:

```json
{
  "id": 123,
  "name": "Example"
}
```

```json
{
  "message": "Operation completed."
}
```

## Error Responses
API errors are normalized by the DRF exception handler:

```json
{
  "error": true,
  "message": "Human-readable explanation",
  "details": {
    "field_name": ["Validation message"]
  }
}
```

Notes:
- `details` is present for field-level validation errors.
- Authorization failures return `403`.
- Conflict-style business rule failures return `409`.

## Status Codes
| Code | Meaning |
|------|---------|
| 200 | Request succeeded |
| 201 | Resource created |
| 400 | Validation or malformed request |
| 401 | Missing or invalid authentication |
| 403 | Authenticated, but not allowed |
| 404 | Resource not found |
| 409 | Business rule conflict |
| 500 | Unhandled server error |
