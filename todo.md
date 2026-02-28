# System Architecture Analysis — Richwell Portal

## Critical Bottlenecks

| File | Lines | Items | Risk |
|---|---|---|---|
| `enrollment/views.py` | **~200** ✅ | 95 views (split) | 🟢 Split into 5 domain modules |
| `academics/views.py` | **~50** ✅ | 97 views (split) | 🟢 Split into 5 domain modules |
| `enrollment/models.py` | 929 | 65 items | 🟡 Partially split |
| `academics/models.py` | 684 | 51 items | 🟡 Moderate |
| `frontend/api.jsx` | **~14** ✅ | 107 endpoints (split) | 🟢 Split into api/client + api/endpoints |

## Cross-App Coupling

- 🔴 **enrollment ↔ academics**: 98+ bidirectional imports — #1 risk
- 🟡 enrollment → accounts: ~15 imports
- 🟢 enrollment → core/audit: Clean dependency

## Completed Splits ✅

- `enrollment/models.py` → `models_grading.py`, `models_payments.py`
- `enrollment/serializers.py` → `serializers_payments.py`, `serializers_grading.py`
- `academics/services.py` → `services_scheduling.py`, `services_professor.py`
- Enrollment views already split by prior work (6 files)
- `enrollment/views.py` → `views_public.py`, `views_applicants.py`, `views_enrollment.py`, `views_payments.py`, `views_reports.py`
- `academics/views.py` → `views_programs.py`, `views_sections.py`, `views_scheduling.py`, `views_curriculum.py`, `views_professors.py`
- `frontend/api.jsx` → `api/client.js`, `api/endpoints.js`, `api/index.js`
- `academics/serializers.py` → `serializers_programs.py`, `serializers_sections.py`, `serializers_curriculum.py`, `serializers_professors.py`
- `accounts/views.py` → `views_auth.py`, `views_users.py`, `views_permissions.py`

## Priority TODO

### 🔴 P0 — Split Monolith Views (~12–16 iterations)

- [x] Split `enrollment/views.py` (2,747L → ~200L + 5 modules) ✅
  - `views_public.py` (enrollment status, program list)
  - `views_applicants.py` (online enrollment, applicant mgmt)
  - `views_enrollment.py` (enrollment CRUD, subject enrollment)
  - `views_payments.py` (payment recording, exam permits)
  - `views_reports.py` (head reports, registrar reports)
- [x] Split `academics/views.py` (2,102L → ~50L + 5 modules) ✅
  - `views_programs.py` (programs, subjects, rooms)
  - `views_sections.py` (sections, section subjects)
  - `views_scheduling.py` (schedule slots, conflicts, availability)
  - `views_curriculum.py` (curriculum versions, curriculum CRUD)
  - `views_professors.py` (professor management, archives)

### 🟡 P1 — Frontend & Testing (~8–12 iterations)

- [x] Split `frontend/api.jsx` (490L → ~14L + 3 modules) ✅
  - `api/client.js` (TokenManager, HTTP client, downloadFile)
  - `api/endpoints.js` (all 107 endpoint paths, domain-grouped)
  - `api/index.js` (barrel re-export)
- [ ] Add basic integration tests for critical flows

### 🟢 P2 — Lower Priority ✅

- [x] Split `academics/serializers.py` (936L → ~50L + 4 modules) ✅
- [x] Split `accounts/views.py` (572L → ~35L + 3 modules) ✅

### ⚪ P3 — Deferred

- [ ] Move Semester-related logic to academics (high risk, defer)

## Rewrite Verdict: ❌ NOT Justified

Incremental refactoring: **25–35 iterations** | Full rewrite: **80–120 iterations**
Zero migration risk with re-export pattern. Django architecture is sound — problems are file size, not design.
