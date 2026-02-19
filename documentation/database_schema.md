# Database Schema Documentation

This document outlines the database schema for the Richwell Portal, generated from the Django models.

## **App: Accounts** (`apps.accounts`)

### **User** (`accounts_user`)
Extends `AbstractUser`. Central identity model.

| Field | Type | Description |
|---|---|---|
| `id` | UUIDField | Primary Key |
| `email` | EmailField | Unique identifier (Username) |
| `role` | CharField | STUDENT, PROFESSOR, CASHIER, REGISTRAR, HEAD_REGISTRAR, ADMISSION_STAFF, DEPARTMENT_HEAD, ADMIN |
| `student_number` | CharField | Unique student ID (format: YYYY-XXXXX) |
| `first_name` | CharField | User's first name |
| `last_name` | CharField | User's last name |

### **StudentProfile** (`accounts_studentprofile`)
Extended profile for students. Linked One-to-One with `User`.

| Field | Type | Description |
|---|---|---|
| `user` | OneToOneField | Link to `User` |
| `program` | ForeignKey | Enrolled Program |
| `curriculum` | ForeignKey | Active Curriculum |
| `year_level` | PositiveIntegerField | Current year level (1-5) |
| `status` | CharField | ACTIVE, LOA, WITHDRAWN, GRADUATED, INACTIVE |
| `middle_name` | CharField | Student's middle name |
| `suffix` | CharField | Name suffix (e.g., Jr., III) |
| `birthdate` | DateField | Date of birth |
| `is_transferee` | BooleanField | Flag for transferee students |
| `previous_course` | CharField | Previous course (if transferee) |

### **ProfessorProfile** (`accounts_professorprofile`)
Extended profile for professors. Linked One-to-One with `User`.

| Field | Type | Description |
|---|---|---|
| `department` | CharField | Department name |
| `max_teaching_hours` | PositiveIntegerField | Overload threshold (Default: 24) |
| `specialization` | CharField | area of expertise |
| `office_location` | CharField | Faculty room/office location |

---

## **App: Academics** (`apps.academics`)

### **Program** (`academics_program`)
Academic programs (e.g., BSIT).

| Field | Type | Description |
|---|---|---|
| `code` | CharField | Unique code (e.g., "BSIT") |
| `name` | CharField | Full name of the program |
| `duration_years` | PositiveIntegerField | Standard duration (e.g., 4) |
| `is_active` | BooleanField | Whether program is offered |

### **Subject** (`academics_subject`)
Course catalog.

| Field | Type | Description |
|---|---|---|
| `code` | CharField | Subject code (e.g., "CS101") |
| `title` | CharField | Descriptive title |
| `units` | PositiveIntegerField | Credit units |
| `prerequisites` | ManyToManyField | Required subjects to take before this |
| `is_major` | BooleanField | Affects INC expiry (Major=6mo, Minor=1yr) |

### **Curriculum** (`academics_curriculum`)
Specific program revision.

| Field | Type | Description |
|---|---|---|
| `program` | ForeignKey | Link to Program |
| `code` | CharField | Revision code (e.g., "2023", "REV3") |
| `effective_year` | PositiveIntegerField | Year implementation started |
| `is_active` | BooleanField | Open for new students |

### **CurriculumSubject** (`academics_curriculumsubject`)
Mapping of Subjects to Curriculum Year/Semester.

| Field | Type | Description |
|---|---|---|
| `curriculum` | ForeignKey | Parent Curriculum |
| `subject` | ForeignKey | Subject to take |
| `year_level` | Integer | Year level (1-5) |
| `semester_number` | Integer | Semester (1=1st, 2=2nd, 3=Summer) |

### **Section** (`academics_section`)
Class section grouping.

| Field | Type | Description |
|---|---|---|
| `name` | CharField | Section name (e.g., "BSIT-1A") |
| `program` | ForeignKey | Parent program |
| `semester` | ForeignKey | Active semester |
| `capacity` | PositiveIntegerField | Max students allowed |

### **SectionSubject** (`academics_sectionsubject`)
Subject offering for a specific section.

| Field | Type | Description |
|---|---|---|
| `section` | ForeignKey | Parent Section |
| `subject` | ForeignKey | Subject being taught |
| `professor` | ForeignKey | Assigned professor |
| `capacity` | PositiveIntegerField | Specific capacity for this subject |

---

## **App: Enrollment** (`apps.enrollment`)

### **Semester** (`enrollment_semester`)
Academic term management.

| Field | Type | Description |
|---|---|---|
| `name` | CharField | e.g., "1st Semester" |
| `academic_year` | CharField | e.g., "2024-2025" |
| `start_date` | DateField | Term start |
| `end_date` | DateField | Term end |
| `status` | CharField | SETUP, ENROLLMENT_OPEN, GRADING_OPEN, CLOSED |
| `is_current` | BooleanField | Active term flag |

### **Enrollment** (`enrollment_enrollment`)
Student's enrollment record for a specific term.

| Field | Type | Description |
|---|---|---|
| `student` | ForeignKey | Student User |
| `semester` | ForeignKey | Active Semester |
| `status` | CharField | PENDING, ACTIVE, PENDING_PAYMENT, COMPLETED |
| `created_via` | CharField | ONLINE, MANUAL, TRANSFEREE |
| `monthly_commitment` | DecimalField | Calculated monthly fee |

### **SubjectEnrollment** (`enrollment_subjectenrollment`)
Specific subject taken by a student.

| Field | Type | Description |
|---|---|---|
| `enrollment` | ForeignKey | Parent Enrollment |
| `subject` | ForeignKey | Subject taken |
| `section` | ForeignKey | Assigned Section |
| `grade` | CharField | 1.00-5.00, INC, DROPPED |
| `status` | CharField | ENROLLED, PASSED, FAILED, INC, CREDITED |

### **MonthlyPaymentBucket** (`enrollment_monthlypaymentbucket`)
Payment tracking per month.

| Field | Type | Description |
|---|---|---|
| `enrollment` | ForeignKey | Parent Enrollment |
| `month_number` | Integer | Month 1 to 6 |
| `required_amount` | DecimalField | Amount due |
| `paid_amount` | DecimalField | Amount paid |

---

## **App: Audit** (`apps.audit`)

### **AuditLog** (`audit_auditlog`)
Immutable history of system actions.

| Field | Type | Description |
|---|---|---|
| `actor` | ForeignKey | User who performed action |
| `action` | CharField | ENROLLMENT_CREATED, GRADE_SUBMITTED, etc. |
| `target_model` | CharField | Model name affected |
| `target_id` | UUIDField | ID of affected record |
| `payload` | JSONField | Snapshot/Metadata of change |
| `timestamp` | DateTimeField | When it happened |

---

## **App: Core** (`apps.core`)

### **SystemConfig** (`core_systemconfig`)
Dynamic application settings.

| Field | Type | Description |
|---|---|---|
| `key` | CharField | Setting key (e.g., ENROLLMENT_ENABLED) |
| `value` | JSONField | Setting value |

### **Notification** (`core_notification`)
User alerts.

| Field | Type | Description |
|---|---|---|
| `user` | ForeignKey | Recipient |
| `type` | CharField | PAYMENT, GRADE, ANNOUNCEMENT |
| `message` | TextField | Notification content |
| `is_read` | BooleanField | Read status |
