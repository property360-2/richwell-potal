# Audit Log Coverage — Richwell Portal

> **Last Updated:** April 2026  
> **Owner:** Backend / Security Team  
> **Related Files:** `apps/auditing/models.py`, `apps/auditing/mixins.py`, `apps/auditing/middleware.py`

---

## Overview

The Richwell Portal uses a two-layer audit strategy:

1. **`AuditMixin`** — Applied directly to Django models. Automatically logs `CREATE`, `UPDATE`, and `DELETE` events whenever a model instance is saved or deleted. Captures field-level diffs for `UPDATE` events.
2. **Manual `AuditLog.objects.create()`** — Used for actions that bypass model saves entirely (document generation via `GET`, authentication events, password changes).

Both layers capture the acting `user` (via `AuditMiddleware` thread-locals or explicit `request.user`) and the client `ip_address`.

---

## Action Types

| Code | Label | How Triggered |
|---|---|---|
| `CREATE` | Create | `AuditMixin.save()` on new instance |
| `UPDATE` | Update | `AuditMixin.save()` on existing instance |
| `DELETE` | Delete | `AuditMixin.delete()` |
| `LOGIN` | Login | `user_logged_in` signal in `LoginView` |
| `LOGOUT` | Logout | `user_logged_out` signal in `LogoutView` |
| `LOGIN_FAILED` | Login Failed | `user_login_failed` signal in `signals.py` |
| `BULK_IMPORT` | Bulk Import | Manual log in `SubjectViewSet.bulk_upload()` |
| `RELEASE` | Document Released | Manual log in `ReportViewSet.cor()` and `.masterlist()` |
| `PASSWORD_CHANGE` | Password Changed | Manual log in `ChangePasswordView.update()` |
| `PASSWORD_RESET` | Password Reset | Manual log in `StaffManagementViewSet.reset_password()` |

---

## Model-Level Coverage (`AuditMixin`)

All models below automatically generate `CREATE`, `UPDATE`, and `DELETE` audit logs.

### `academics` app
| Model | Audited | Notes |
|---|---|---|
| `Program` | ✅ | |
| `CurriculumVersion` | ✅ | |
| `Subject` | ✅ | Bulk uploads use `skip_audit=True` + a single `BULK_IMPORT` entry |
| `SubjectPrerequisite` | ✅ | |

### `students` app
| Model | Audited | Notes |
|---|---|---|
| `Student` | ✅ | |
| `StudentEnrollment` | ✅ | |

### `grades` app
| Model | Audited | Notes |
|---|---|---|
| `Grade` | ✅ | |
| `CreditingRequest` | ✅ | |
| `CreditingRequestItem` | ✅ | |

### `terms` app
| Model | Audited | Notes |
|---|---|---|
| `Term` | ✅ | `activate` and `close` view actions pass `audit_user` explicitly |

### `sections` app
| Model | Audited | Notes |
|---|---|---|
| `Section` | ✅ | |
| `SectionStudent` | ✅ | |

### `scheduling` app
| Model | Audited | Notes |
|---|---|---|
| `Schedule` | ✅ | |

### `faculty` app
| Model | Audited | Notes |
|---|---|---|
| `Professor` | ✅ | |
| `ProfessorSubject` | ✅ | |
| `ProfessorAvailability` | ✅ | |

### `facilities` app
| Model | Audited | Notes |
|---|---|---|
| `Room` | ✅ | |

### `finance` app
| Model | Audited | Notes |
|---|---|---|
| `Payment` | ✅ | Append-only; UPDATE/DELETE are blocked at the view level |

### `notifications` app
| Model | Audited | Notes |
|---|---|---|
| `Notification` | ✅ | Added April 2026; tracks when system notifications are dispatched |

---

## Manual Audit Events

These actions bypass model saves and require explicit `AuditLog.objects.create()` calls.

### Document Release — `RELEASE`

**File:** `apps/reports/views.py` → `ReportViewSet`

```python
# Triggered after: GET /api/reports/cor/
# Triggered after: GET /api/reports/masterlist/

AuditLog.objects.create(
    user=request.user,
    action='RELEASE',
    model_name='COR',          # or 'Masterlist'
    object_id=str(sid),        # student_id for COR, term_id for Masterlist
    object_repr=f"COR | Student: {sid} | Term: {tid}",
    changes={...},
    ip_address=get_current_ip()
)
```

**Why manual?** Document generation is a `GET` request. No model instance is created or modified, so `AuditMixin` has nothing to hook into.

---

### Password Change — `PASSWORD_CHANGE`

**File:** `apps/accounts/views.py` → `ChangePasswordView`

```python
# Triggered after: PUT/PATCH /api/accounts/change-password/

AuditLog.objects.create(
    user=request.user,
    action='PASSWORD_CHANGE',
    model_name='User',
    object_id=str(user.id),
    object_repr=user.username,
    changes={'changed_by': 'self'},
    ip_address=get_current_ip()
)
```

**Why manual?** `user.save()` inside `set_password()` generates a generic `UPDATE` audit log, but that diff is meaningless (the hashed password field is not tracked). A dedicated `PASSWORD_CHANGE` entry is clearer and more secure.

---

### Password Reset — `PASSWORD_RESET`

**File:** `apps/accounts/views.py` → `StaffManagementViewSet.reset_password()`

```python
# Triggered after: POST /api/accounts/staff/{id}/reset-password/

AuditLog.objects.create(
    user=request.user,          # admin who triggered the reset
    action='PASSWORD_RESET',
    model_name='User',
    object_id=str(user.id),     # target user
    object_repr=user.username,
    changes={'reset_by': request.user.username, 'target_role': user.role},
    ip_address=get_current_ip()
)
```

---

### Authentication Events

**File:** `apps/auditing/signals.py`

| Signal | Action Code | Triggered By |
|---|---|---|
| `user_logged_in` | `LOGIN` | `LoginView.post()` manual signal dispatch |
| `user_logged_out` | `LOGOUT` | `LogoutView.post()` manual signal dispatch |
| `user_login_failed` | `LOGIN_FAILED` | Django auth signal (auto) |

---

## API Endpoints

| Endpoint | Role | Description |
|---|---|---|
| `GET /api/auditing/` | Admin only | Full system audit log with filters |
| `GET /api/auditing/export_csv/` | Admin only | CSV export of filtered logs |
| `GET /api/auditing/registrar-history/` | Admin + Registrar | Registrar-scoped audit history |
| `GET /api/auditing/registrar-history/export_csv/` | Admin + Registrar | CSV export of registrar history |

### Supported Query Filters

| Parameter | Type | Example |
|---|---|---|
| `action` | Multi-choice | `?action=RELEASE&action=PASSWORD_RESET` |
| `model_name` | Partial string | `?model_name=Student` |
| `user` | Integer (user ID) | `?user=5` |
| `object_id` | Exact string | `?object_id=42` |
| `start_date` | ISO datetime | `?start_date=2025-01-01T00:00:00Z` |
| `end_date` | ISO datetime | `?end_date=2025-12-31T23:59:59Z` |
| `search` | Keyword | `?search=juan+dela+cruz` |
| `ordering` | Field | `?ordering=-created_at` |

---

## Architecture Notes

### `AuditMiddleware` — Thread-Local Context

`apps/auditing/middleware.py` captures the full `request` object into thread-local storage at the start of every request. `AuditMixin` reads from this to get `user` and `ip_address` automatically.

```
Request → AuditMiddleware (stores request in thread-local)
             ↓
Model.save() → AuditMixin.save() → reads thread-local → creates AuditLog
```

### `skip_audit=True`

Any model save can bypass `AuditMixin` to suppress individual log entries. Used during bulk imports to avoid thousands of per-record logs.

```python
instance.save(skip_audit=True)
```

### `audit_user` / `audit_ip` Override

Pass explicit user/IP context when the thread-local may not have the right value (e.g., background tasks, cascading saves):

```python
term.save(audit_user=request.user, audit_ip=get_current_ip())
```
