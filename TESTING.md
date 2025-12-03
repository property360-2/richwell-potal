# Testing Guide - Richwell Colleges Portal

## Testing Strategy

This project uses **manual iterative testing** during full-stack feature development. Each feature is built end-to-end and tested before moving to the next feature.

**Approach:**
- Build feature completely (models → forms → views → templates)
- Test manually using browser and Django shell
- Verify database state after operations
- Move to next feature when stable

---

## Setup & Prerequisites

### 1. Virtual Environment Setup

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with local values (keep defaults for SQLite development)
```

### 3. Database Setup

```bash
# Create migrations (after models are finalized)
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser (admin account)
python manage.py createsuperuser
# Username: admin
# Email: admin@test.local
# Password: admin123

# Load seed data (optional - for testing)
python manage.py seed_data
```

### 4. Start Development Server

```bash
python manage.py runserver
# Access at http://localhost:8000
# Admin at http://localhost:8000/admin
```

---

## Manual Testing Workflow

### For Each Feature:

1. **Setup**
   - [ ] Feature models created and migrated
   - [ ] Django admin configured
   - [ ] Seed data loaded (if available)
   - [ ] Dev server running

2. **Functional Testing**
   - [ ] Forms render correctly
   - [ ] Form submission works
   - [ ] Data saved to database
   - [ ] Success/error messages display
   - [ ] Redirects work as expected

3. **Database Verification**
   - [ ] Records created in correct tables
   - [ ] Relationships (ForeignKey, ManyToMany) correct
   - [ ] Timestamps accurate
   - [ ] IDs/UUIDs generated

4. **Edge Cases**
   - [ ] Duplicate data handling
   - [ ] Missing required fields
   - [ ] Invalid data rejection
   - [ ] Boundary conditions

---

## Test Checklists by Feature

### Priority 2: Enrollment Feature

**Setup:**
- [ ] Run `python manage.py seed_data` to create test programs
- [ ] Access http://localhost:8000/enroll (or enrollment page)
- [ ] Ensure enrollment link is enabled via admin

**Happy Path: New Student Enrollment**
- [ ] Navigate to enrollment form
- [ ] Fill all required fields:
  - [ ] First name
  - [ ] Last name
  - [ ] Email (unique)
  - [ ] Program selection
  - [ ] Monthly commitment amount
- [ ] Submit form
- [ ] Verify:
  - [ ] Success message shown
  - [ ] Redirected to confirmation page
  - [ ] Student number displayed

**Database Verification:**
```bash
python manage.py shell
>>> from sis.models import User, Student, Enrollment, MonthlyPaymentBucket
>>> User.objects.filter(email='test@example.com').count()  # Should be 1
>>> student = Student.objects.get(user__email='test@example.com')
>>> student.student_number  # Should exist and be unique
>>> enrollment = Enrollment.objects.get(student=student)
>>> enrollment.first_month_paid  # Should be False
>>> enrollment.monthly_payment_buckets.count()  # Should be 6
>>> list(enrollment.monthly_payment_buckets.values_list('month_number', 'required_amount'))
```

**Edge Cases:**
- [ ] Try enrolling with existing email
  - [ ] Should show error: "Email already exists"
  - [ ] No new account created
- [ ] Try submitting without required fields
  - [ ] Form validation shows errors
  - [ ] No account created
- [ ] Try with invalid email format
  - [ ] Form validation shows error
- [ ] Try with negative monthly commitment
  - [ ] Form validation rejects
- [ ] Submit twice quickly
  - [ ] No duplicate enrollment

**Admin Verification:**
- [ ] Log in to http://localhost:8000/admin
- [ ] Check Users list for new user
- [ ] Check Students list for new student
- [ ] Check Enrollments → see monthly buckets

---

### Priority 3: Payment Feature

**Prerequisites:**
- [ ] Enrollment feature working
- [ ] At least one student enrolled

**Setup:**
- [ ] Access cashier payment entry page
- [ ] Or use admin to record payment

**Happy Path: Record Payment**
- [ ] Search for student by number or name
- [ ] Display shows:
  - [ ] Current payment status
  - [ ] Month 1 balance
  - [ ] 6 months breakdown
- [ ] Enter payment amount
- [ ] Select payment mode (Cash/Online)
- [ ] Click "Record Payment"
- [ ] Verify:
  - [ ] Success message
  - [ ] Receipt generated
  - [ ] Receipt PDF accessible

**Sequential Allocation Test (Critical!):**
```bash
python manage.py shell
>>> from sis.models import Enrollment, MonthlyPaymentBucket
>>> enrollment = Enrollment.objects.last()
>>> month1 = MonthlyPaymentBucket.objects.get(enrollment=enrollment, month_number=1)
>>> month2 = MonthlyPaymentBucket.objects.get(enrollment=enrollment, month_number=2)

# Pay 8000 when month1 requires 5000
# Should allocate: 5000 to month 1, 3000 to month 2
>>> month1.paid_amount  # Should be 5000
>>> month1.is_fully_paid  # Should be True
>>> month2.paid_amount  # Should be 3000
>>> month2.is_fully_paid  # Should be False
```

**Sequential Enforcement Test:**
- [ ] Try to manually allocate payment to Month 3 when Month 2 unpaid
- [ ] System should prevent or show error
- [ ] Cannot skip months

**Exam Permit Auto-Unlock:**
```bash
>>> from sis.models import ExamPermit
>>> enrollment.exam_permits.count()
# Should have PRELIM permit after month 1 paid
>>> permit = enrollment.exam_permits.get(exam_type='PRELIM')
>>> permit.permit_code  # Should exist
>>> permit.unlocked_at  # Should be set
```

**Receipt Generation:**
- [ ] Receipt PDF created successfully
- [ ] Receipt URL accessible
- [ ] Contains student info, amount, date
- [ ] Receipt number unique

**Edge Cases:**
- [ ] Pay 0 amount → rejected
- [ ] Pay negative amount → rejected
- [ ] Payment for non-existent student → handled
- [ ] Try to adjust without reason → rejected (if required)
- [ ] Overpayment → allocated to next month

---

### Priority 4: Subject Enrollment Feature

**Prerequisites:**
- [ ] Enrollment feature working
- [ ] Payment feature working
- [ ] Student with Month 1 paid

**Setup:**
- [ ] Subject and Section data in database
- [ ] Schedule slots assigned
- [ ] Access student subject enrollment page

**Happy Path: Enroll in Subject**
- [ ] Display shows unit counter: "0 / 30 units"
- [ ] Click "Add Subject"
- [ ] Subject picker shows:
  - [ ] Recommended subjects for year/semester
  - [ ] Prerequisites satisfied (green check)
- [ ] Select subject
- [ ] Section picker shows:
  - [ ] Available sections
  - [ ] Schedule/room info
  - [ ] Available slots
- [ ] Select section
- [ ] Schedule conflict check (if any)
- [ ] Confirm enrollment
- [ ] Unit counter updates: "3 / 30 units"
- [ ] Subject appears in enrollment list

**Database Verification:**
```bash
>>> from sis.models import SubjectEnrollment
>>> enrollment = Enrollment.objects.last()
>>> subj_enrollments = enrollment.subject_enrollments.all()
>>> subj_enrollments.count()  # Should be > 0
>>> subj_enrollments.filter(status='ENROLLED').count()
>>> sum(e.units for e in subj_enrollments.filter(status='ENROLLED'))  # Total units
```

**Unit Cap Enforcement (Critical!):**
- [ ] Enroll in subjects totaling 25 units
- [ ] Try to add 6-unit subject
- [ ] System shows error: "Would exceed 30 unit cap"
- [ ] Enrollment blocked
- [ ] Can enroll 5-unit subject instead

**Prerequisite Blocking:**
- [ ] Create course with prerequisite
- [ ] Student without prerequisite tries to enroll
- [ ] System shows error: "Missing prerequisite: XYZ"
- [ ] Enrollment blocked
- [ ] Student with INC prerequisite also blocked

**Schedule Conflict Detection:**
- [ ] Student enrolled in: Mon 08:00-09:30
- [ ] Try to enroll in: Mon 09:00-10:30
- [ ] System detects overlap
- [ ] Shows error message with conflicting class
- [ ] Enrollment blocked

**Section Capacity:**
- [ ] Section with capacity 2
- [ ] Enroll 2 students
- [ ] 3rd student tries to enroll
- [ ] System blocks: "Section full"

**Registrar Override:**
- [ ] Registrar can override conflicts
- [ ] Must provide reason
- [ ] Override logged to audit

**Edge Cases:**
- [ ] Student not paid Month 1 → blocked
- [ ] Enroll while already enrolled in subject → prevented
- [ ] Drop and re-enroll → different behavior?
- [ ] Irregular subject enrollment

---

### Priority 5: Grade Feature

**Prerequisites:**
- [ ] Subject enrollment feature working
- [ ] Students enrolled in subjects

**Setup:**
- [ ] Access professor grade entry page
- [ ] Select section

**Happy Path: Professor Enters Grades**
- [ ] Class roster displays with grade input dropdowns
- [ ] Dropdowns show only allowed grades:
  - [ ] 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0
  - [ ] INC, DRP options available
- [ ] Professor selects grades for each student
- [ ] Click "Submit for Finalization"
- [ ] Message: "Grades submitted. Awaiting registrar finalization."

**Registrar Finalization:**
- [ ] Registrar sees pending grades
- [ ] Review grades
- [ ] Click "Finalize"
- [ ] Message: "Grades finalized"
- [ ] GPA recalculation triggered

**GPA Calculation:**
```bash
>>> from sis.models import Grade, SubjectEnrollment
>>> student = Student.objects.first()
>>> enrollment = student.enrollments.first()
>>> subj_enrollments = enrollment.subject_enrollments.filter(status__in=['PASSED', 'FAILED'])
>>> for se in subj_enrollments:
>>>     grade_points = se.grade.value * se.units if se.grade.value else 0
>>>     print(f"{se.subject.code}: {grade_points} points")

# Calculate: SUM(grade × units) / SUM(units)
```

**INC Expiry - Major Subject (6 months):**
- [ ] Professor marks grade as INC for major subject
- [ ] Grade status shows "INC"
- [ ] System records inc_marked_at timestamp
- [ ] Student receives notification: "INC expiring in 30 days"
- [ ] After 6 months (in production):
  - [ ] Celery job runs `check_inc_expiry_task`
  - [ ] INC auto-converts to FAILED (5.0)
  - [ ] Student notified: "INC expired, now FAILED"

**INC Expiry - Minor Subject (12 months):**
- [ ] Similar to above but 12-month expiry

**INC Resolution (Before Expiry):**
- [ ] Professor changes INC to passing grade
- [ ] Grade updated
- [ ] inc_marked_at cleared
- [ ] Expiry clock stops
- [ ] No auto-conversion happens

**Edge Cases:**
- [ ] Grade outside allowed values → rejected
- [ ] Try to edit after finalization:
  - [ ] System should require approval
  - [ ] Change logged
- [ ] Finalize twice → idempotent
- [ ] Missing grades → flagged as incomplete

---

### Priority 6: Transferee Feature

**Setup:**
- [ ] Registrar logged in

**Happy Path: Create Transferee & Credit Subjects**
- [ ] Registrar access transferee creation form
- [ ] Fill student info (name, email, program)
- [ ] Create account
- [ ] Student account created (status might be manual)
- [ ] Registrar adds credits:
  - [ ] Select subject to credit
  - [ ] Enter original school name
  - [ ] Enter original subject code
  - [ ] Upload or link TOR
- [ ] Add multiple credits
- [ ] Student history shows "CREDITED" status

**Database Verification:**
```bash
>>> from sis.models import SubjectEnrollment, CreditSource
>>> enrollment = Enrollment.objects.filter(created_via='TRANSFEREE').first()
>>> credits = enrollment.subject_enrollments.filter(status='CREDITED')
>>> credits.count()  # Number of credits
>>> for ce in credits:
>>>     source = ce.credit_source
>>>     print(f"{source.original_school}: {source.original_subject_code}")
```

**Prerequisite Satisfaction:**
- [ ] Subject B requires Subject A
- [ ] Credit Subject A to student
- [ ] Student now can enroll in Subject B
- [ ] No prerequisite block

**Payment Requirement:**
- [ ] Transferee must still pay Month 1
- [ ] Cannot enroll new subjects until Month 1 paid
- [ ] Credited subjects don't require payment gate

---

### Priority 7: Document Release Feature

**Setup:**
- [ ] Registrar logged in

**Happy Path: Release Document**
- [ ] Registrar searches for student
- [ ] Select document type: TOR, COE, CGM, etc.
- [ ] Click "Release"
- [ ] DocumentRelease record created
- [ ] Protected URL generated
- [ ] Student can view released document

**Audit Verification:**
```bash
>>> from sis.models import DocumentRelease, AuditLog
>>> doc = DocumentRelease.objects.last()
>>> doc.released_by  # Registrar who released
>>> doc.protected_url  # Should be signed/time-limited
>>> logs = AuditLog.objects.filter(action='DOCUMENT_RELEASED')
>>> logs.count()  # Should have entry
```

**Head-Registrar Audit Log:**
- [ ] Head-Registrar logs in
- [ ] Can see all document releases
- [ ] Filtered by date, registrar, type

---

### Priority 8: Admin Configuration & Reports

**Admin Settings:**
- [ ] Admin can toggle enrollment link ON/OFF
- [ ] Update max units per semester
- [ ] Set INC expiry durations (major/minor)
- [ ] Configure exam-month mapping
- [ ] All changes logged to audit

**Changes Persistence:**
```bash
>>> from sis.models import SystemConfig
>>> config = SystemConfig.objects.get(key='max_units_per_semester')
>>> config.value  # Should be updated value
```

---

## Database Verification Commands

### Quick Status Check

```bash
python manage.py shell

# User & Student Count
>>> from sis.models import User, Student
>>> User.objects.count()
>>> Student.objects.count()

# Enrollment Status
>>> from sis.models import Enrollment
>>> for e in Enrollment.objects.all()[:5]:
>>>     print(f"{e.student.student_number} - {e.semester} - {e.status} - Month1Paid: {e.first_month_paid}")

# Payment Status
>>> from sis.models import MonthlyPaymentBucket
>>> for bucket in MonthlyPaymentBucket.objects.filter(enrollment__student__student_number='2024-001')[:6]:
>>>     print(f"Month {bucket.month_number}: {bucket.paid_amount}/{bucket.required_amount} - Fully Paid: {bucket.is_fully_paid}")

# Grades
>>> from sis.models import Grade
>>> Grade.objects.filter(is_finalized=True).count()

# Audit Log
>>> from sis.models import AuditLog
>>> AuditLog.objects.order_by('-created_at')[:5]
```

---

## Common Issues & Troubleshooting

### Issue: "No such table: sis_user"
**Solution:** Run migrations
```bash
python manage.py migrate
```

### Issue: "Timezone-related error"
**Solution:** Ensure `USE_TZ = True` in settings and use `timezone.now()` instead of `datetime.now()`

### Issue: "Duplicate student number"
**Solution:** Check database for duplicates, clear if seed_data was run multiple times
```bash
python manage.py flush  # Clears all data - use in dev only!
python manage.py migrate
python manage.py seed_data
```

### Issue: Signals not triggering (monthly buckets not created)
**Solution:** Ensure signals are imported in `sis/apps.py`

### Issue: Form validation passes but database save fails
**Solution:** Check model constraints and validator rules

---

## Performance Testing

### Load Testing Checklist:
- [ ] Create 100+ students
- [ ] Enroll 100+ students in subjects
- [ ] Test unit cap check with 100+ enrollments
- [ ] Record 100+ payments
- [ ] Run GPA calculation on 100 students
- [ ] Check query performance (look for N+1 queries)

---

## Test Data Seed Script

`seed_data.py` (to be created in Management Commands) should create:
- [ ] 1 Academic Year (2024-2025)
- [ ] 2 Semesters
- [ ] 3 Programs (BSIT, BSCS, BSECE)
- [ ] 20+ Subjects per program
- [ ] 5+ Sections per semester
- [ ] 10+ Test students
- [ ] Some students with enrollments
- [ ] Some students with payments
- [ ] Some students with grades

---

## Regression Testing

After each new feature, verify:
- [ ] Previous features still work
- [ ] No new database errors
- [ ] No new validation errors
- [ ] Admin still functional
- [ ] Django shell accessible

---

## Final Acceptance Checklist

Before considering feature complete:
- [ ] All happy path scenarios tested
- [ ] All edge cases tested
- [ ] Database integrity verified
- [ ] Audit logging working
- [ ] Admin interface updated
- [ ] No errors in console/logs
- [ ] Responsive design (basic)
- [ ] README updated with feature info

