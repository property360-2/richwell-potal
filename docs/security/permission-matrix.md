# Role Permission Matrix

## High-Impact Boundaries

| Capability | STUDENT | PROFESSOR | PROGRAM_HEAD | REGISTRAR | HEAD_REGISTRAR | DEAN | CASHIER | ADMIN |
|------------|:-------:|:---------:|:------------:|:---------:|:--------------:|:----:|:-------:|:-----:|
| View own auth profile | Y | Y | Y | Y | Y | Y | Y | Y |
| Manage staff accounts | N | N | N | N | Registrar only | N | N | Y |
| Read student profiles | Self only | N | Own programs | Y | Y | N | N | Y |
| Read student enrollments | Self only | N | Own programs | Y | Y | N | N | Y |
| Submit advising | Y | N | N | N | N | N | N | N |
| Approve advising | N | N | Own programs | Y | Y | N | N | Y |
| Submit crediting request (bulk) | N | N | N | Y | Y | N | N | Y |
| Approve/Reject crediting request | N | N | Own programs | N | N | N | N | Y |
| Generate sections | N | N | N | N | N | Y | N | Y |
| Publish schedules | N | N | N | N | N | Y | N | Y |
| Pick schedules | Self only | N | N | N | N | N | N | N |
| Submit grades | N | Assigned loads | N | Y | Y | N | N | Y |
| Approve INC resolution | N | N | Own programs | Y | Y | N | N | Y |
| Read payments | Self only | N | N | N | N | N | Y | Y |
| Record payments / promissory notes | N | N | N | N | N | N | Y | Y |
| Check arbitrary permit status | N | N | N | N | N | N | Y | Y |
| Activate or close terms | N | N | N | N | N | N | N | Y |
| View audit logs (full) | N | N | N | N | N | N | N | Y |
| View audit logs (registrar-scope) | N | N | N | Y | Y | N | N | Y |

## Notes

- **Program Head scope** is object-level, not global. A program head cannot approve,
  review, or access data outside their owned programs.
- **Professor grade mutation scope** is enforced at the service layer against assigned
  section–subject–term loads retrieved from the `Schedule` model.
- **Head Registrar staff management** is intentionally narrower than Admin.
  The role can manage registrar accounts only.
- **Student self-service serializers** omit sensitive identity fields not needed in the portal.
- **Dean role** has exclusive authority to generate and publish section schedules,
  which opens the student schedule picking window. The Dean dashboard includes a full
  `SchedulingPage.jsx` for section generation and publication management.
- **Crediting Request Permissions (known issue):** The base `CreditingRequestViewSet`
  has `[IsRegistrar | IsProgramHead | IsAdmin, IsProgramHeadOfStudent]` as its class-level
  permission. Because DRF requires all listed permissions to pass, this inadvertently
  blocks Registrars from default CRUD operations. The `submit_bulk`, `approve`, and
  `reject` actions each override with their own permission classes and are unaffected.
  See `known-issues.md → DESIGN-02` for the recommended fix.
- **Advising unlock for Transferees** is automatic once all submitted documents are verified
  by the Registrar. The document checklist is the effective gate — see `known-issues.md → DESIGN-01`.
