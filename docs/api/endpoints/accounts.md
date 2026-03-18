# Accounts & Authentication API

## Overview
The authentication system uses JWT (JSON Web Tokens) stored in HttpOnly cookies for security.

## Endpoints

### `POST /api/accounts/auth/login/`
Authenticate a user and set access/refresh tokens in cookies.

**Auth required:** No

#### Request body
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

#### Success response `200 OK`
```json
{
  "access": "string",
  "refresh": "string",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "ADMIN",
    "first_name": "System",
    "last_name": "Admin",
    "must_change_password": false
  }
}
```

---

### `POST /api/accounts/auth/logout/`
Clear authentication cookies.

**Auth required:** Yes

---

### `GET /api/accounts/auth/me/`
Return the current authenticated user's profile.

**Auth required:** Yes

---

### `POST /api/accounts/auth/change-password/`
Change the current user's password.

**Auth required:** Yes

#### Request body
```json
{
  "old_password": "string (required)",
  "new_password": "string (required)"
}
```

---

### Staff Management (`/api/accounts/staff/`)
Endpoints for Admins and Head Registrars to manage staff accounts.

#### `GET /api/accounts/staff/`
List staff members. 
- Admins see all staff.
- Head Registrars see only Registrars.

#### `POST /api/accounts/staff/`
Create a new staff member.

#### `POST /api/accounts/staff/{id}/reset-password/`
Reset a staff member's password to the default format.

## Roles
| Role | Description |
|------|-------------|
| ADMIN | Full system access |
| HEAD_REGISTRAR | Manages registrars and academic records |
| REGISTRAR | Manages student records and scheduling |
| ADMISSION | Handles applicant processing |
| CASHIER | Manages payments and finance |
| DEAN | Oversees specific colleges |
| PROGRAM_HEAD | Oversees specific academic programs |
| PROFESSOR | Manages grades and class schedules |
| STUDENT | Self-service portal access |
