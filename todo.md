# Student Enrollment Flow Roadmap

Roadmap for implementing the features detailed in [enrollment_flow.md](file:///c:/Users/Administrator/Desktop/richwell-potal/enrollment_flow.md).

## Phase 1: Admission & Identity
- [x] **Frontend**: Implement Online Application Form for new students
- [x] **Frontend**: Applicant Management Dashboard for Admissions Staff
    - [x] List applicants with filtering
    - [x] Decision modal (Accept/Reject/Admit) with Student ID generation
- [x] **Backend**: OnlineEnrollmentView handles registration and documents

## Phase 2: Automated Sectioning & Grouping
- [x] **Backend**: SectioningEngine to auto-assign students upon Admission
- [/] **Frontend**: Registrar's Section Management UI
    - [x] Manual re-sectioning (Integrated in Section Detail)
    - [x] Capacity monitoring per section
    - [ ] Automated Queue Trigger button (Phase 2 UI Polish)

## Phase 3: Subject Selection & Academic Approval
- [x] **Frontend**: Student Subject Picker (Enrollment Portal)
    - [x] Display recommended subjects based on curriculum
    - [x] Real-time unit volume counter
    - [x] Section availability indicators
- [x] **Frontend**: Department Head Approval Dashboard
    - [x] Bulk approve/reject subject enrollments
    - [x] View student schedule preview for approval

## Phase 4: Financial Settlement
- [x] **Frontend**: Cashier's Payment Processing UI
    - [x] Record initial payment (Month 1 fully paid)
    - [x] Link payment to enrollment buckets
- [x] **Backend**: Trigger `payment_approved` flag on SubjectEnrollments upon Phase 4 completion

## Phase 5: Finalization & Activation
- [x] **Backend**: Automated worker to transition status to `ENROLLED` once Dual Approval (Head + Payment) is met
- [x] **Frontend**: Certificate of Registration (COR) Generation & Print
- [x] **Frontend**: Student Schedule View activation (Finalized View)
