# Accounts and Authentication API

## Auth Endpoints

### `POST /api/accounts/auth/login/`
Authenticates the user and sets the browser auth cookies.

Auth required: No

Request body:
```json
{
  "username": "admin",
  "password": "password123"
}
```

Success response:
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "first_name": "System",
    "last_name": "Admin",
    "role": "ADMIN",
    "is_active": true,
    "headed_programs": [],
    "is_superuser": false,
    "must_change_password": false
  }
}
```

Notes:
- `access` and `refresh` are intentionally not returned in the JSON body.
- The browser session is established through `Set-Cookie`.

### `POST /api/accounts/auth/refresh/`
Refreshes the access cookie using the refresh cookie.

Auth required: Refresh cookie present

Success response:
```json
{}
```

Notes:
- This endpoint is cookie-refresh only.
- It does not return a raw access token in the body.

### `POST /api/accounts/auth/logout/`
Clears the auth cookies.

Auth required: Yes

### `GET /api/accounts/auth/me/`
Returns the current authenticated user.

Auth required: Yes

### `POST /api/accounts/auth/change-password/`
Changes the current user's password.

Auth required: Yes

Request body:
```json
{
  "old_password": "old-secret",
  "new_password": "new-secret",
  "confirm_password": "new-secret"
}
```

## Staff Management

Base path: `/api/accounts/staff/`

Allowed roles:
- `ADMIN`: can manage all non-student staff accounts.
- `HEAD_REGISTRAR`: can manage registrar accounts only.

### `GET /api/accounts/staff/`
Lists staff users in scope for the caller.

### `POST /api/accounts/staff/`
Creates a new staff user.

Rules:
- Admin can create any supported staff role.
- Head Registrar can create `REGISTRAR` only.

### `PATCH /api/accounts/staff/{id}/`
Updates a staff user.

Rules:
- Head Registrar cannot update or promote non-registrar accounts.
- Role escalation through Head Registrar updates is blocked.

### `POST /api/accounts/staff/{id}/reset-password/`
Resets the target user's password to the system's current default formula.

Rules:
- Head Registrar can reset registrar accounts only.

## Role Reference
| Role | Purpose |
|------|---------|
| `ADMIN` | Full administrative access |
| `HEAD_REGISTRAR` | Registrar supervision and registrar-only staff management |
| `REGISTRAR` | Academic records and grade finalization |
| `ADMISSION` | Applicant processing and admissions workflows |
| `CASHIER` | Payments and permit checks |
| `DEAN` | Scheduling and faculty allocation |
| `PROGRAM_HEAD` | Program-scoped advising approvals and resolution review |
| `PROFESSOR` | Assigned-section grading only |
| `STUDENT` | Self-service only |
