# Setup: Background Jobs

## Overview

The Richwell Portal uses Django management commands as background jobs. These must be scheduled
externally (e.g., via Windows Task Scheduler on a production server, or a cron job on Linux).
There is currently **no Celery or Django-Q configuration** in the project — all async work is
manual command execution.

---

## Commands

### `check_inc_expiry`

**File:** `apps/grades/management/commands/check_inc_expiry.py`

**Purpose:**  
Scans all `Grade` records with `grade_status = INC` or `NO_GRADE` and transitions them to
`RETAKE` if their deadline has passed. Prevents students from sitting on unresolved INC
indefinitely without consequence.

**What it does:**

1. **INC Expiry** — Finds `Grade` records where `grade_status = INC` and `inc_deadline < today`.
   Transitions each to `RETAKE`.

2. **NO_GRADE Expiry** — Finds `Grade` records where `grade_status = NO_GRADE` and
   `term.final_grade_end < today`. Transitions each to `RETAKE`.

**How to run manually:**

```bash
cd backend
python manage.py check_inc_expiry
```

**Output:**
```
Successfully expired 3 INC grades to RETAKE.
Successfully expired 1 NO_GRADE records to RETAKE.
```

**Scheduling (Windows Task Scheduler):**

Configure this to run daily at midnight or early morning:

```powershell
# Run every day at 2:00 AM
schtasks /create /tn "Richwell - Check INC Expiry" `
  /tr "python C:\path\to\backend\manage.py check_inc_expiry" `
  /sc DAILY /st 02:00
```

**Scheduling (Linux/macOS cron):**

```cron
# Run at 2 AM every day
0 2 * * * cd /path/to/backend && python manage.py check_inc_expiry >> /var/log/richwell_inc.log 2>&1
```

---

### ⚠️ Known Gaps in This Command

| Gap | Description | Location |
|---|---|---|
| No student notification | Students are not notified when their INC expires to RETAKE | `check_inc_expiry.py` line 22 |
| No professor notification | Assigned professor is not notified | `check_inc_expiry.py` line 37 |

**To implement:** Add `NotificationService.notify()` calls inside the loop after each grade is
set to `RETAKE`. The service is already imported in the grading and resolution services — use
`Notification.NotificationType.GRADE` with a message like:

```python
# TODO: Add after grade.save() in each loop
from apps.notifications.services.notification_service import NotificationService
from apps.notifications.models import Notification

NotificationService.notify(
    recipient=grade.student.user,
    notification_type=Notification.NotificationType.GRADE,
    title="INC Grade Expired",
    message=f"Your INC grade for {grade.subject.code} has expired and been converted to RETAKE.",
    link_url="/student/grades"
)
```

---

## Command Summary Table

| Command | Frequency | Purpose | Notifications |
|---|---|---|---|
| `check_inc_expiry` | Daily (recommended: 2 AM) | Expire overdue INC/NO_GRADE to RETAKE | ❌ Not yet implemented |

---

## Future Considerations

- If the system grows to require real-time background processing (e.g., email digests,
  scheduled enrollment reminders), consider integrating **Celery + Redis** or **Django-Q**.
- At the current scale, cron-based management commands are sufficient.
