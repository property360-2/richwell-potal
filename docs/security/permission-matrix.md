# Role-Permission Matrix

## Overview
This matrix summarizes which roles can perform specific actions across the system.

| Endpoint Group | STUDENT | PROFESSOR | REGISTRAR | HEAD_REGISTRAR | DEAN | CASHIER |
|----------------|:-------:|:---------:|:---------:|:--------------:|:----:|:-------:|
| Auth (Me, Profile) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Staff Management | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Audit Logs | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Academic Specs (CRUD)| ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Student Profiles (CRUD)| ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Admissions (Approve) | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Enrollment (Manual) | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Advising (Submit) | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Advising (Approve) | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Section Gen / Publish | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Schedule Assign | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Grade Entry | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Grade Finalization | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| INC Resolve (Req) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| INC Resolve (Audit) | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Payment Record | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Adjustment Record | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Key Conditions
- **STUDENT**: Can only see their own grades, schedule, and profile.
- **PROFESSOR**: Can only enter grades for subjects assigned to them in the current term.
- **HEAD_REGISTRAR**: Specialized version of Registrar with access to Audit Logs and Staff account management.
- **CASHIER**: Limited strictly to financial transactions and permit status checks.
