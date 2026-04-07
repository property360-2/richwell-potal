# Graduation Eligibility Flow — Richwell Portal

## Overview

The graduation eligibility check determines whether a student has met every subject
requirement in their assigned `CurriculumVersion`. It is accessed via the
**Registrar Dashboard → Graduation Audit** page.

The status transition to `GRADUATED` is **intentionally manual** — the Registrar must
confirm all non-academic clearances (finance obligations, document submissions) before
finalizing the status.

---

## Eligibility Algorithm

**Source:** `apps/reports/services/report_service.py` → `ReportService.graduation_check()`

### Steps:

1. **Requirement Gathering** — Pull all subjects linked to the student's `CurriculumVersion`.
2. **Achievement Audit** — Pull all `Grade` records with `grade_status = PASSED`.  
   Includes:
   - Regular subjects (passed in Richwell terms)
   - Credited subjects (`is_credited = True`) — transferee external credits
   - Historical encoding (`is_historical = True`) — TOR entries by Registrar
3. **Gap Analysis** — Any curriculum subject without a `PASSED` grade is flagged as `missing`.
4. **Final Verdict**:
   - `is_eligible: true` — missing list is empty
   - `is_eligible: false` — one or more subjects remain

---

## API

### Run Graduation Check

```
GET /api/reports/graduation-check/?student_id={id}
```

**Permissions:** Registrar, Head Registrar, Admin

**Response `200 OK`:**
```json
{
  "is_eligible": false,
  "earned": 108,
  "required": 126,
  "missing": [
    { "code": "CC104", "name": "Systems Analysis and Design" },
    { "code": "IS201", "name": "Information Management" }
  ]
}
```

> ⚠️ **Response Shape Note — Known Frontend Bug:**  
> The fields returned are `earned`, `required`, and `missing`.  
> The `GraduationAudit.jsx` component currently reads `total_units_earned`,
> `total_units_required`, and `missing_subjects` — **these keys do not exist in the
> response**, so the stats display will show `undefined`.  
> Additionally, the `missing` array only contains `{ code, name }` but the UI
> expects `year` and `semester` fields for the badges.  
> **This is a known bug that needs to be fixed.** See `known-issues.md`.

---

## Manual Graduation Workflow (Current Process)

```
Registrar                     System
    │                            │
    │── Search for student ──►   │
    │◄── Student list ──────────│
    │                            │
    │── Click "Run Audit" ──►   │
    │                    GET /api/reports/graduation-check/
    │◄── { is_eligible, earned, required, missing } ──│
    │                            │
    │  [If is_eligible = true]   │
    │                            │
    │── "Confirm Graduation" ─►  │
    │                        [⚠️ NOT YET IMPLEMENTED]
    │                        Currently: No backend endpoint
    │                        Workaround: Set status=GRADUATED
    │                        manually via Student Management
```

> ⚠️ **Known Gap — "Confirm Graduation" Button:**  
> The button exists in `GraduationAudit.jsx` line 132 but has **no `onClick` handler**
> and there is **no backend endpoint** to transition a student to `GRADUATED`.  
> The current workaround is for the Registrar to navigate to Student Management and
> manually set the student's status to `GRADUATED` from the student detail view.  
> See `known-issues.md` for the full implementation plan.

---

## Data Integration

| Component | Role in Graduation |
|---|---|
| `CurriculumVersion` | Defines the required subject list and total units |
| `Subject Crediting` | Allows transferees to satisfy requirements via external credits |
| `Grade Finalization` | Transitions subjects to `PASSED`, updating eligibility in real-time |
| `Max Units Override` | Allows graduating students to take up to 36 units for remaining subjects |

---

## Troubleshooting

If a student appears ineligible but believes they have completed all requirements:

1. **Check grade status** — Grade must be `PASSED`, not `FOR_FINALIZATION` or `ADVISING APPROVED`.
2. **Check subject code match** — Subject code in `Grade` must exactly match the code in `CurriculumVersion`.
3. **Check crediting** — For transferees, verify external subjects are correctly mapped and their `CreditingRequest` was approved.
4. **Check curriculum version** — If the student changed programs or curriculum midway, they may be assigned to the wrong `CurriculumVersion`.

---

## Files Involved

| File | Role |
|---|---|
| `apps/reports/services/report_service.py` | `graduation_check()` — core eligibility logic |
| `apps/reports/views.py` → `ReportViewSet` | API endpoint, audit logging of document generation |
| `frontend/src/pages/registrar/reports/GraduationAudit.jsx` | Registrar-facing UI |
| `frontend/src/api/reports.js` | `reportsApi.checkGraduation(studentId)` |

---

*Last Updated: April 2026*
