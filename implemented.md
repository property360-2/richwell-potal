```markdown
feat: implement subject enrollment override system

- Add `is_overridden`, `override_reason`, and `overridden_by` fields to SubjectEnrollment model
- Refactor SubjectEnrollmentService into a modular package and implement override bypass logic
- Implement RegistrarOverrideEnrollmentView and update SubjectEnrollmentSerializer
- Add searchable override modal and connect student context in Detail.jsx
- Enhance backend SectionSubject search logic and verify with APITests
```
