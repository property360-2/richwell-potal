# Getting Started - Richwell Colleges Portal

## Current Status: Phase 1 Complete ✓

All foundational setup is complete and the application is ready to run!

## Quick Start

### 1. Start the Development Server
```bash
python manage.py runserver
```
The application will be available at: `http://localhost:8000`

### 2. Access Admin Interface
- URL: `http://localhost:8000/admin/`
- Username: `admin`
- Password: `admin123`

### 3. Login to Portal
- URL: `http://localhost:8000/login/`
- Username: `admin`
- Password: `admin123`

## Database Information

**Type:** SQLite (development)
**Location:** `db.sqlite3` (in project root)
**Status:** ✓ Initialized with all 19 models

### Superuser Account Created
- Username: `admin`
- Email: `admin@richwell.local`
- Password: `admin123`

## What's Implemented (Phase 1)

### Models (19 total)
✓ User, Program, Semester, Subject, Student
✓ Enrollment, SubjectEnrollment, Section, ScheduleSlot
✓ PaymentMonth, Payment, Grade, ExamPermit
✓ AuditLog, Notification, TransferCredit

### Features
✓ Admin interface with all models registered
✓ Authentication system (login/logout)
✓ Responsive templates with Bootstrap 5
✓ Richwell color theme (saffron, purple, orchid)
✓ Error pages (404, 500)
✓ Database schema with proper indexes

### Ready to Use
✓ Django admin at `/admin/`
✓ Home/dashboard at `/`
✓ Login at `/login/`
✓ Logout at `/logout/`

## Next: Phase 2 Implementation

### Priority 1: Payment System
Implement sequential payment allocation algorithm:
- Month 1 must be paid before Month 2
- Auto-unlock exam permits when Month 1 is paid
- Payment reconciliation logic

**Key File:** `plan/business-functions.md` (Section 6)

### Priority 2: Subject Enrollment
Add validation and constraint checks:
- Prerequisite validation (block INC/FAILED/RETAKE)
- Unit cap enforcement (max 30 units/semester)
- Schedule conflict detection
- Registrar override capability

**Key File:** `plan/business-functions.md` (Section 5)

### Priority 3: Grades & GPA
Implement grading system:
- Grade entry and finalization
- GPA calculation
- INC expiry logic (6 months major, 1 year minor)
- Auto-conversion and notifications

**Key File:** `plan/business-functions.md` (Section 8)

## Test Data Creation

To test the system, create some test data in the admin interface:

1. **Create a Program**
   - Admin > Programs > Add
   - Name: "Bachelor of Science"
   - Code: "BS"
   - Duration: 4 years

2. **Create a Semester**
   - Admin > Semesters > Add
   - Year: 2025, Semester: First Semester
   - Set dates and mark as active

3. **Create Subjects**
   - Admin > Subjects > Add
   - Code: "CS101", Name: "Introduction to Programming"
   - Units: 3, Program: BS

4. **Create a Student**
   - Admin > Users > Add (create with role="STUDENT")
   - Admin > Students > Add (link to user)
   - Student ID: "2025-0001"

## Troubleshooting

### Server won't start
```bash
python manage.py check
```
This will show any configuration issues.

### Admin won't load
Ensure you have a superuser:
```bash
python manage.py createsuperuser
```

### Port already in use
Use a different port:
```bash
python manage.py runserver 8001
```

## Important Files

- `richwell_config/settings.py` - Main configuration
- `sis/models.py` - All 19 data models
- `sis/admin.py` - Admin interface setup
- `sis/views.py` - Authentication views
- `templates/base.html` - Base template with styling
- `plan/business-functions.md` - Detailed business specs

## Next Commands

```bash
# After making model changes
python manage.py makemigrations sis
python manage.py migrate

# Run tests (when ready)
python manage.py pytest

# Create additional superusers
python manage.py createsuperuser
```

## Design System

### Color Palette
- **Saffron:** #E3B60F (highlights, accents)
- **Purple:** #75156C (primary)
- **Orchid:** #BB41CA (secondary)

All colors are defined in `templates/base.html` and ready to use.

## Next Steps

1. ✓ Start the server
2. ✓ Access admin and explore the 19 models
3. Create test data (programs, semesters, subjects, students)
4. Implement Phase 2 payment system
5. Add Phase 2 enrollment validations
6. Implement Phase 2 grading system

---

**Phase 1 Completed:** 2025-11-29
**Ready for Phase 2 Development**

For detailed implementation specifications, see `plan/business-functions.md`
