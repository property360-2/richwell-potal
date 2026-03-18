# Role Permission Matrix

## High-Impact Boundaries

| Capability | STUDENT | PROFESSOR | PROGRAM_HEAD | REGISTRAR | HEAD_REGISTRAR | DEAN | CASHIER | ADMIN |
|------------|:-------:|:---------:|:------------:|:---------:|:--------------:|:----:|:-------:|:-----:|
| View own auth profile | Y | Y | Y | Y | Y | Y | Y | Y |
| Manage staff accounts | N | N | N | N | Registrar only | N | N | Y |
| Read student profiles | Self only | N | N | Y | Y | N | N | Y |
| Read student enrollments | Self only | N | Own programs only | Y | Y | N | N | Y |
| Submit advising | Y | N | N | N | N | N | N | N |
| Approve advising | N | N | Own programs only | Y | Y | N | N | Y |
| Publish schedules | N | N | N | N | N | Y | N | Y |
| Pick schedules | Self only | N | N | N | N | N | N | N |
| Submit grades | N | Assigned loads only | N | Y | Y | N | N | Y |
| Approve INC resolution | N | N | Own programs only | Y | Y | N | N | Y |
| Read payments | Self only | N | N | N | N | N | Y | Y |
| Check arbitrary permit status | N | N | N | N | N | N | Y | Y |
| Activate or close terms | N | N | N | N | N | N | N | Y |

## Notes
- Program Head scope is object-level, not global. A program head cannot approve or review students outside owned programs.
- Professor grade mutation scope is enforced at the service layer against assigned section-subject-term loads.
- Head Registrar staff management is intentionally narrower than Admin. The role can manage registrar accounts only.
- Student self-service serializers are intentionally narrower than staff serializers and omit sensitive identity fields not needed in the portal.
