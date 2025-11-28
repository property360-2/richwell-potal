# FULL COMPREHENSIVE BUSINESS FUNCTIONS — RICHWELL COLLEGES PORTAL

## General notes

* Actors: Student, Professor, Cashier, Registrar (normal), Head-Registrar, Admission staff, Admin.
* Semester model: semester + academic year.
* Payment model: semester divided into 6 month-buckets (configurable).
* Key constraints: 30-unit cap per semester; one program per student.
* All critical ops logged to Audit.

---

## 1) Admissions / Online Enrollment

**Purpose:** capture applicant data for freshers & transferees and create student accounts.

**Primary actors:** Applicant (Student), Admission staff, Admin.

**Inputs:** personal data, program applied, previous school (for transferee), uploaded documents (IDs, transcript), monthly commitment amount.

**Outputs:** Applicant record, User account (created automatically on successful enrollment), Enrollment record (status: ACTIVE / PENDING_PAYMENT / HOLD), notification to Admission/Registrar.

**Business rules & validations**

* Enrollment link toggled by Admin; only accessible when ON.
* Freshmen & transferees use same form; transferee field required for previous school/course info.
* Monthly commitment captured at enrollment; used to create payment plan (6 months).
* New account created on successful submission.
* No manual approval needed — enrollment auto-accepted (except business holds via registrar if required).

**UI touchpoints**

* Public enrollment form (responsive), file uploader, confirmation screen with generated student number (or temporary reference).
* Admission dashboard: list of recent applicants and uploaded docs.

**Exceptions / edge cases**

* Duplicate email/student number: prompt user; admission can resolve duplicates.
* Missing docs: admission can mark “incomplete” and contact applicant.

**KPIs**

* # of applications submitted, conversion to active accounts, avg time to first payment.

---

## 2) Student Profile & Lifecycle Management

**Purpose:** maintain student identity, program assignment, academic status across semesters.

**Primary actors:** Student, Registrar, Admin.

**Inputs:** personal info, program, student number, enrollment history, credited subjects (for transferees).

**Outputs:** Student profile record, enrollment history, academic status (Active, On-hold, Graduated).

**Business rules & validations**

* One program per student (change only via registrar/manual transfer workflow).
* Profile persists across semesters.
* Registrar can edit profile fields; edits audited.

**UI touchpoints**

* Profile page (student-facing), registrar edit page, admin impersonation.

**Exceptions**

* Name changes/documented changes require registrar proof and audited update.

**KPIs**

* Profile completeness %, number of profile edits by registrar.

---

## 3) Curriculum & Course Management

**Purpose:** define programs, subjects, prerequisites, major/minor flags, credits (units).

**Primary actors:** Admin (create programs), Registrar (CRUD subjects/curriculum), Head (view/approve curriculum changes if needed).

**Inputs:** program definitions, subject codes, units, is_major flag, prerequisite links.

**Outputs:** Curriculum versions per program, recommended subject lists per semester.

**Business rules & validations**

* Subjects belong to Programs; prerequisites enforced via M2M.
* Registrar sets subject as major/minor.
* Prerequisite chain prevents enrollment if unsatisfied or INC/FAILED exists.
* Curriculum versions tracked for audit (semester-specific).

**UI touchpoints**

* Curriculum editor with subject listing, prereq linking, versioning.
* Student grade advising based on curriculum version.

**Exceptions**

* Circular prerequisites: system prevents cyclical links.
* Subject unit must be positive integer.

**KPIs**

* Curriculum completion rate, number of prereq violations attempted.

---

## 4) Sections & Scheduling Management

**Purpose:** create sections for each subject offering, assign professors, define schedule slots and rooms.

**Primary actors:** Registrar, Professor, Admin.

**Inputs:** section code, capacity, semester, assigned subjects, professor per subject, schedule slots (day/time/room), TBA flags.

**Outputs:** SectionSubject assignments, schedule grid, conflict warnings.

**Business rules & validations**

* Section created first; SectionSubject links subject + professor + schedule.
* One professor per SectionSubject (per your rule).
* System prevents schedule conflicts for:

  * Professors (cannot have overlapping classes).
  * Students (enrollment triggers conflict check).
* TBA allowed initially; schedule editable later.
* Registrar can override conflicts but must log reason (audit).

**UI touchpoints**

* Section creation UI, schedule grid editor (drag/drop), conflict modal showing conflicting slots.

**Exceptions**

* Room double-bookings flagged; capacity exceeded prevented at enrollment.

**KPIs**

* % sections with TBA schedules, number of schedule conflicts resolved.

---

## 5) Subject Enrollment (Student & Registrar flows)

**Purpose:** let students enroll in subjects (or registrar enrolls them), enforcing units cap, prereqs, payment holds.

**Primary actors:** Student, Registrar, Admin.

**Inputs:** Enrollment record (semester), subject selection, section selection, units counter.

**Outputs:** SubjectEnrollment records (status: ENROLLED, PENDING_PAYMENT, RETAKE, INC, FAILED, CREDITED), student schedule.

**Business rules & validations**

* Students can only enroll after first month paid (first_month_paid flag) — system blocks subject enrollment until paid.
* Unit cap: total enrolled units (including irregulars/credits) ≤ 30 — enforced.
* Prereq enforcement: if prereq subject status is INC/FAILED/RETAKE, block enrollment.
* Recommended subjects auto-populated; students pick section (one slot) unless irregular — irregular allows multiple sections if permitted.
* Registrar can manually enroll students (for transferees or overrides) — actions audited.

**UI touchpoints**

* Student subject picker with unit tally, prereq messages, section selector.
* Registrar enrollment UI with override & notes.

**Exceptions**

* Concurrent enrollments race: DB locking/transaction to enforce unit cap.
* When payment pending: subject selection saved but marked `PENDING_PAYMENT` or blocked per business rule (you chose blocking until 1st month paid).

**KPIs**

* Avg time from enrollment → subject enrollment, % students hitting unit cap.

---

## 6) Payments, Payment Plans & Exam Permits

**Purpose:** manage semester payment plans (6 months), record transactions, generate receipts, enforce exam permissions.

**Primary actors:** Student, Cashier, Registrar, Admin.

**Inputs:** monthly_commitment (amount), PaymentTransaction entries (amount, date, allocated_month), payment mode (cash/online), receipt_no.

**Outputs:** Payment ledger, student balance, printable receipt, unlocked exam permits.

**Business rules & validations**

* Payment plan split into 6 month-buckets (configurable).
* Student must pay **Month 1** before enrolling subjects / taking exams.
* Admin/Registrar can map Exams → Months (flexible mapping).
* Partial payments allowed; system auto-allocates funds to earliest unpaid month by default, or cashier can allocate to a specific month.
* When a month-bucket is fully paid, system unlocks exam permit for mapped exam(s) automatically (task triggered).
* If mapped exam-month unpaid → block exam permit (student cannot get exam permit).
* Cashier can make adjustments, but adjustments require a justification field and are audited.
* Receipts generated (printable PDF) — generated asynchronously and attached to PaymentTransaction; student UI shows printable receipts.

**UI touchpoints**

* Student payments page (balance, month breakdown, history, receipts).
* Cashier payment entry form (student search, allocate month, print receipt).
* Admin mapping UI: exam→month configuration.
* Student dashboard: blocked/unblocked exam indicators + permit print.

**Exceptions**

* Overpayment: excess allocated to next month or kept as credit (business-configurable).
* Payment disputes: admin/cashier can create adjustments logged.

**KPIs**

* % students paid month1 before subject enrollment, avg days to first payment, number of adjustments.

---

## 7) Exam Permits & Exam Access

**Purpose:** issue exam permits when corresponding month paid; system acts as gatekeeper though exams are physical.

**Primary actors:** Student, Cashier, Admin.

**Inputs:** PaymentTransaction allocations completing the month requirement.

**Outputs:** ExamPermit object (printable token), student UI shows permit availability, audit log.

**Business rules & validations**

* Permit unlocked automatically when bucket fully funded.
* Permit is not an exam delivery — only a printed authorization for physical exams.
* Permit printing available via student UI and cashier/registar if needed.
* Students blocked from taking exam if permit not present.

**UI touchpoints**

* Student permit print button, cashier verify permit generation.

**Exceptions**

* If mapping changes mid-semester, previous allocations still govern existing permits (policy to decide — default: keep existing).

**KPIs**

* # permits generated, # students blocked from exams due to payment.

---

## 8) Grades, GPA, INC & Retake Logic

**Purpose:** manage grade entry, finalization, INC handling, GPA computation, retake tracking.

**Primary actors:** Professor, Registrar, Student, Admin.

**Inputs:** Grade submission (subject_enrollment, professor, numeric grade), finalization flag, INC markers.

**Outputs:** Grade records, semester GPA, academic standing flags, INC->FAILED transitions.

**Business rules & validations**

* Grade scale: allowed numeric increments (1.0, 1.25, 1.5, 1.75, 2.0, etc) — system restricts to allowed set.
* Professors can submit/edit grades until registrar finalizes (or until a configured deadline).
* Finalization triggers GPA recalculation (async).
* INC statuses: if instructor marks INC, student has a remediation period:

  * Major INC becomes FAILED after 6 months if not resolved.
  * Minor INC becomes FAILED after 1 year if not resolved.
* If INC present for a prereq, student is blocked from enrolling in dependent subjects.
* When INC converts to FAILED, system creates notification & audit entry (message indicates system action to remove dispute from professor).
* Retake subjects: student must enroll as retake; these count towards the 30-unit cap when enrolled.

**UI touchpoints**

* Professor grade submission UI (per section), grade edit history, registrar finalization UI.
* Student grade dashboard with GPA, INC statuses, retake recommendations.
* Automated grade advising (recommended next subjects based on pass/fail/retake).

**Exceptions**

* Grade disputes: registrar-level override path with audit & justification.
* Late grade entry: allowed with registrar permission; logged.

**KPIs**

* % grades finalized on time, # INCs resolved before expiry, avg GPA by program.

---

## 9) Transferee Onboarding & Credit Management

**Purpose:** allow registrar to create transferee accounts, credit prior learning, map credits to curriculum.

**Primary actors:** Registrar, Student, Admin.

**Inputs:** transferee documents (TOR, certs), credited subjects listing (subject code, units, grade if carried).

**Outputs:** Student account, credited SubjectEnrollment records (status=CREDITED), updated prerequisites & GPA (configurable whether carried grades counted).

**Business rules & validations**

* Registrar creates account manually for transferee; no admission auto-approval step required.
* Registrar adds credits to the system (manual CRUD) — credits reflect in student history and block/unblock dependent subjects accordingly.
* Student still subject to first-month payment rule before enrolling in new subjects for current semester.
* Credits can be marked as COUNTED_IN_GPA or NOT (configurable per school policy).

**UI touchpoints**

* Registrar transferee creation form + credit entry UI.
* Student history shows credited subjects with source.

**Exceptions**

* Disputed credits require head-registrar review; update logged.

**KPIs**

* # transferees onboarded, avg time to credit assignment.

---

## 10) Document Release (TOR, Certificates, etc.)

**Purpose:** registrar issues official documents; head-registrar can view logs.

**Primary actors:** Registrar, Head-Registrar, Student, Admin.

**Inputs:** DocumentRelease requests (created by registrar), doc_type, student info, notes.

**Outputs:** DocumentRelease record, printable document (protected URL), audit log.

**Business rules & validations**

* Students cannot request documents via the portal (physical process); registrar initiates the digital release record.
* Document release records are viewable/printable and logged.
* Head-registrar sees logs of all releases; normal registrars can release but cannot view aggregate logs (only their own actions).
* Sensitive documents access restricted by role & audit trail required on view/download.

**UI touchpoints**

* Registrar document release form, printable document preview, head-registrar release log viewer.

**Exceptions**

* Document errors: registrar can revoke and reissue (logged).

**KPIs**

* # documents released, audits per registrar.

---

## 11) Notifications (System-only)

**Purpose:** in-app notifications primarily for students (payments & INC/fail updates); no SMS/email required initially.

**Primary actors:** System tasks (Celery), Student, Registrar, Cashier.

**Inputs:** events: first-month payment, permit unlock, INC->FAILED conversion, payment adjustments.

**Outputs:** Notification records shown in NotificationBell / student dashboard.

**Business rules & validations**

* Notifications are in-app only (no email/SMS initially).
* Students receive notifications for payment receipts availability, permit unlock, INC expiry → FAILED.
* Notifications stored and auditable; can be marked read.

**UI touchpoints**

* Notification bell component in header; detailed notification center.

**Exceptions**

* High-volume events batched to avoid flooding.

**KPIs**

* Notification open rate, pending/unread notifications.

---

## 12) Audit & Security

**Purpose:** record critical operations for accountability & compliance.

**Primary actors:** All roles, System.

**Inputs:** actions: payments, grade edits, registrar overrides, admin impersonation, schedule overrides, document releases.

**Outputs:** AuditLog records (actor, action, payload, timestamp), admin audit UI.

**Business rules & validations**

* All critical ops must create an AuditLog (write-once).
* Head-registrar & admin can view filtered logs; normal registrar can view own actions.
* Admin can impersonate users — impersonation action logged.

**UI touchpoints**

* Admin audit viewer, head-registrar logs viewer; per-action “view audit trail” button on relevant entities.

**Exceptions**

* Logs retention policy configurable; retention must comply with school policy.

**KPIs**

* Audit coverage %, number of overrides, avg time to resolve flagged audits.

---

## 13) Reports & Analytics (minimal MVP)

**Purpose:** provide role-based analytics and exportable reports (CSV/PDF).

**Primary actors:** Head, Admin, Registrar, Professor.

**Inputs:** aggregate data (enrollment counts, payments, grade distributions, document releases).

**Outputs:** downloadable CSV/PDF reports, dashboard cards for each role.

**Business rules & validations**

* Start with minimal reports:

  * Admin: audit exports.
  * Head: enrollment per program, grade averages.
  * Registrar: section rosters, pending payments, document release logs.
  * Professor: student roster & grade distribution.
* Exports respect role permissions and data visibility.

**UI touchpoints**

* Reports page per role with filters (semester, program, date range), export buttons.

**Exceptions**

* Large export jobs handled async.

**KPIs**

* Report usage, time to generate exports.

---

## 14) Admin & System Configuration

**Purpose:** control site-level settings, behavior mapping, and system toggles.

**Primary actors:** Admin.

**Configurable items**

* Enrollment link ON/OFF
* Exam → month mapping
* Allowed grade values / grade scale
* Max units per semester (default 30)
* INC expiry durations (major/minor)
* Receipt template & document templates
* Payment allocation rules (auto-allocate or cashier-mandated)
* Impersonation enabled/disabled

**UI touchpoints**

* Admin settings page with clear save/rollback; change audit logged.

**Exceptions**

* Changing rules mid-semester should be versioned and apply only to future enrollments unless admin chooses to apply retroactively (explicit confirmation).

**KPIs**

* Number of config changes, settings change audit.

---

## 15) Background Jobs & Automation (mapping to business functions)

**Jobs to run via Celery**

* `apply_payment_allocation(payment_id)` — allocate incoming payments to month buckets (auto or manual allocation).
* `unlock_exam_permit(enrollment_id, month)` — run after allocation completes.
* `generate_receipt_pdf(payment_id)` — async PDF creation & storage.
* `recalculate_gpa(student_id)` — triggered after grade finalization.
* `inc_expiry_check()` — periodic job to turn INC → FAILED by rules.
* `bulk_schedule_conflict_check()` — nightly integrity check.
* `send_system_notification(user_id, message)` — create in-app notifications.

**Business automation rules**

* Auto-unlock & notify when month-paid.
* Auto-convert INC after thresholds, with notification & audit.

---

## 16) Exceptions, overrides & escalation

**Overrides allowed but logged**

* Registrar override schedule conflicts (explicit reason required).
* Admin override payment holds (rare; justification required).
* Cashier adjustments to payments (justification required).
* Grade edits after finalization require registrar/admin approval & logged.

**Escalation paths**

* Disputed credits/grade cases escalate to Head-Registrar.
* Payment disputes escalate to Admin for audit.

---

## 17) Acceptance Criteria (sample for dev/QA)

* New applicant completes enrollment, gets a user, and enrollment record exists with monthly commitment.
* Student cannot enroll subjects until first-month payment recorded.
* Cashier can record payment, allocate to month, and receipt is generated and visible to the student.
* System auto-unlocks permit when month fully paid.
* System prevents enrollment beyond 30 units; blocks enrolling in a subject when prerequisites unsatisfied or INC exists.
* INC auto-converts to FAILED after configured thresholds and student is notified.
* Registrar can create transferee and credit subjects; credits visible in student history.
* Schedule conflicts prevented; registrar override logs reason.
* All critical actions produce audit logs viewable by admin/head-registrar.

---

## 18) Operational KPIs (dashboards)

* Enrollment conversion rate (applicant → enrolled & paid month1).
* % students with first-month paid by X days from enrollment.
* # students blocked from exams due to unpaid month.
* Average GPA per program.
* # INC → FAILED events per semester.
* Number of registrar overrides (quality control metric).

---
