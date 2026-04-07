# API Documentation: Notifications

## Overview

The Notification system provides **in-app alerts** for all users. Notifications are created
exclusively by internal service layer triggers — they cannot be created or modified directly
via the API. Users can only read, mark as read, and query the count of their own notifications.

All notification records belong strictly to one recipient and are invisible to other users,
including administrators through this API (admins can view them via the Django Admin interface).

---

## Base URL

```
/api/notifications/
```

---

## Notification Model

| Field | Type | Description |
|---|---|---|
| `id` | integer | Unique notification ID |
| `type` | string | Category — see types below |
| `title` | string | Short notification heading (max 255 chars) |
| `message` | string | Full notification body |
| `link_url` | string \| null | Optional deep-link to the relevant portal page |
| `is_read` | boolean | Whether the user has read this notification |
| `created_at` | datetime | ISO 8601 timestamp of when it was created |

### Notification Types (`type`)

| Value | Description | Common Triggers |
|---|---|---|
| `ADVISING` | Subject advising events | Approval, rejection, pending status changes |
| `GRADE` | Grade-related events | Grade submission, INC assignment, grade finalization |
| `FINANCE` | Payment and permit events | Payment recorded, finance adjustment |
| `ENROLLMENT` | Enrollment-level events | Section assignment, enrollment confirmation |
| `SCHEDULE` | Schedule events | Session picking open, schedule published |
| `GENERAL` | Uncategorized system messages | Miscellaneous admin notices |

---

## Endpoints

### List Own Notifications

```
GET /api/notifications/
```

Returns all notifications for the currently authenticated user, ordered by newest first.

**Permissions:** Any authenticated user.

**Response `200 OK`:**
```json
[
  {
    "id": 42,
    "type": "ADVISING",
    "title": "Advising Approved",
    "message": "Your advising for 2026-1 has been approved. You are now officially enrolled.",
    "link_url": "/student/grades",
    "is_read": false,
    "created_at": "2026-04-07T05:32:00Z"
  }
]
```

---

### Get Unread Count

```
GET /api/notifications/unread-count/
```

Returns the number of unread notifications for the current user. Useful for badge indicators in the UI.

**Permissions:** Any authenticated user.

**Response `200 OK`:**
```json
{
  "unread_count": 3
}
```

---

### Mark One as Read

```
POST /api/notifications/{id}/mark-read/
```

Marks a specific notification (by `id`) as read. The notification must belong to the requesting user.

**Permissions:** Any authenticated user.

**Response `200 OK`:**
```json
{ "status": "marked as read" }
```

**Response `404 Not Found`** — if the notification does not exist or belongs to a different user:
```json
{ "detail": "Notification not found or access denied" }
```

---

### Mark All as Read

```
POST /api/notifications/mark-all-read/
```

Marks **all** of the current user's unread notifications as read in a single call.

**Permissions:** Any authenticated user.

**Response `200 OK`:**
```json
{ "status": "all marked as read" }
```

---

## Blocked Operations

Direct creation and modification are intentionally disabled on this endpoint.

```
POST   /api/notifications/       → 405 Method Not Allowed
PATCH  /api/notifications/{id}/  → 405 Method Not Allowed
PUT    /api/notifications/{id}/  → 405 Method Not Allowed
```

Notifications are **only created by the system** when specific service layer events occur.
If you need a new notification trigger, add it via `NotificationService.notify()` in the
appropriate service method.

---

## System-Level Trigger Map

The following table documents every event that currently triggers a notification and which
service method creates it.

| Event | Type | Recipient | Trigger Location |
|---|---|---|---|
| Advising approved | `ADVISING` | Student | `advising_service.approve_advising()` |
| Advising rejected | `ADVISING` | Student | `advising_service.reject_advising()` |
| Grade submitted (midterm) | `GRADE` | Student | `grading_service.submit_midterm_grades()` |
| Grade submitted (final) | `GRADE` | Student | `grading_service.submit_final_grades()` |
| INC assigned | `GRADE` | Student | `grading_service` (INC record creation) |
| INC resolution submitted | `GRADE` | Student/Professor | `resolution_service` |
| Payment recorded | `FINANCE` | Student | `payment_service.record_payment()` |
| Finance adjustment | `FINANCE` | Student | `payment_service.record_adjustment()` |

### ⚠️ Known Missing Triggers (TODOs)

| Event | Status | Location |
|---|---|---|
| INC/NO_GRADE expires → RETAKE | ❌ Not implemented | `check_inc_expiry.py` lines 22, 37 |
| Student redirected to alternate session | ❌ Not implemented | `picking_service.py` line 125 |
| Crediting request approved/rejected | ❌ Not implemented | `advising_service.approve_crediting_request()` / `reject_crediting_request()` |

---

## NotificationService API (Internal Use)

Located at `apps/notifications/services/notification_service.py`.

```python
NotificationService.notify(
    recipient=user_instance,          # User model instance (not student)
    notification_type=Notification.NotificationType.ADVISING,
    title="Short title",
    message="Full message text.",
    link_url="/student/advising"      # Optional: portal path to deep-link
)

NotificationService.mark_as_read(notification_id, requesting_user)
NotificationService.mark_all_as_read(user_instance)
```
