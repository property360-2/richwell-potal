# API Overview

## Base URL
```
Development:  http://localhost:8000/api/
Production:   https://yourapp.com/api/
```

## Authentication
## Authentication
The system uses **JWT stored in HttpOnly cookies** for security.

1. **Login**: `POST /api/accounts/auth/login/` with `username` and `password`.
2. **Persistence**: The server sends a `Set-Cookie` header with the token.
3. **Automatic Handling**: Browser automatically includes the cookie in all subsequent requests to the same domain. 
   - **No manual Authorization header is required** from the frontend.
   - **CSRF Protection**: Non-GET requests require an `X-CSRFToken` header, obtained via `GET /api/accounts/auth/csrf/`.

> [!NOTE]
> If you are using a tool like Postman, ensure "Cookie jar" or "Follow Set-Cookie" is enabled.

## Response format
All responses return JSON. Successful responses follow this shape:
```json
{
  "data": { ... },
  "message": "optional human-readable string"
}
```

## Error format
```json
{
  "error": "short_error_code",
  "message": "Human-readable description",
  "details": { "field": ["error detail"] }
}
```

## HTTP status codes used
| Code | Meaning |
|------|---------|
| 200  | OK — request succeeded |
| 201  | Created — resource was created |
| 400  | Bad Request — validation failed |
| 401  | Unauthorized — missing or invalid token |
| 403  | Forbidden — authenticated but not allowed |
| 404  | Not Found |
| 500  | Server Error |
