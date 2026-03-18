# API Overview

## Base URL
```
Development:  http://localhost:8000/api/
Production:   https://yourapp.com/api/
```

## Authentication
All protected endpoints require a token in the `Authorization` header:
```
Authorization: Bearer <your_token>
```
Tokens are obtained via `POST /api/accounts/login/`.

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
