# Richwell Colleges Portal

A comprehensive Student Information System (SIS) for managing admissions, enrollment, payments, grades, and academic records.

## Features

- **Online Enrollment:** Multi-step enrollment form for new students and transferees
- **Payment Management:** Sequential payment allocation with automatic exam permit unlocking
- **Subject Enrollment:** Student subject selection with prerequisite validation and unit cap enforcement
- **Grade Management:** Professor grade entry, registrar finalization, INC expiry automation
- **Transferee Processing:** Registrar account creation and credit management
- **Audit Logging:** Immutable audit trail for all critical operations
- **Role-Based Access:** Student, Professor, Cashier, Registrar, Head-Registrar, Admin, Admission Staff
- **Exam Permits:** Automatic permit generation upon payment completion
- **Document Release:** TOR, certificates, and official document management

## Tech Stack

- **Backend:** Django 4.2+ with Django Templates
- **Frontend:** Tailwind CSS
- **Database:** SQLite (development) / PostgreSQL (production)
- **Task Queue:** Celery + Redis
- **API:** Django REST Framework (extensible)

## Quick Start

### Prerequisites

- Python 3.10+
- pip
- virtualenv (optional but recommended)
- Redis (for Celery tasks)
- PostgreSQL (for production)

### Installation

1. **Clone the repository:**
   ```bash
   cd richwell-potal
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Create a superuser (admin account):**
   ```bash
   python manage.py createsuperuser
   ```

7. **Load seed data (optional - for testing):**
   ```bash
   python manage.py seed_data
   ```

8. **Start the development server:**
   ```bash
   python manage.py runserver
   ```

   Access the application at: http://localhost:8000

## Project Structure

```
richwell-potal/
├── richwell_config/           # Django project configuration
│   ├── settings.py           # Project settings
│   ├── urls.py              # Root URL routing
│   ├── wsgi.py              # WSGI server entry point
│   ├── asgi.py              # ASGI server entry point
│   └── celery.py            # Celery configuration
│
├── sis/                       # Main application (Student Info System)
│   ├── models.py            # Database models
│   ├── views.py             # Django views
│   ├── forms.py             # Django forms
│   ├── urls.py              # App-level routing
│   ├── admin.py             # Django admin configuration
│   ├── tasks.py             # Celery background jobs
│   ├── validators.py        # Business logic validators
│   │
│   ├── services/            # Business logic services
│   │   ├── enrollment_service.py
│   │   ├── payment_service.py
│   │   ├── grade_service.py
│   │   ├── audit_service.py
│   │   └── notification_service.py
│   │
│   ├── api/                 # REST API layer
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── permissions.py
│   │
│   ├── management/          # Management commands
│   │   └── commands/
│   │       ├── seed_data.py
│   │       └── create_semester.py
│   │
│   ├── migrations/          # Database migrations
│   └── tests/              # Test suite
│
├── templates/               # Django HTML templates
│   ├── base.html
│   ├── enrollment/
│   ├── student/
│   ├── cashier/
│   ├── registrar/
│   ├── admin/
│   └── common/
│
├── static/                 # Static files (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── images/
│
├── manage.py              # Django CLI
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── TESTING.md            # Testing documentation
└── README.md             # This file
```

## Database Models

### Core Models
- **User** - Custom user model with roles (STUDENT, PROFESSOR, REGISTRAR, etc.)
- **Student** - Student profile with student number and program
- **Program** - Academic programs/courses
- **Semester** - Academic semester definition

### Academic Models
- **Subject** - Course/subject information
- **Section** - Class sections with capacity and professor assignment
- **SectionSubject** - Junction model linking sections to subjects
- **ScheduleSlot** - Schedule times and rooms for classes
- **SubjectEnrollment** - Student enrollment in subjects

### Payment Models
- **Enrollment** - Student enrollment in a semester
- **MonthlyPaymentBucket** - 6-month payment allocation
- **PaymentTransaction** - Individual payment records
- **ExamPermit** - Exam authorization tokens

### Academic Records
- **Grade** - Course grades and status
- **GradeHistory** - Grade change audit trail
- **Transcript** - Semester GPA records
- **CreditSource** - Transferee credit tracking

### Support Models
- **AuditLog** - Immutable operation audit trail
- **Notification** - In-app student notifications
- **DocumentRelease** - Official document tracking
- **SystemConfig** - Application configuration
- **ExamMonthMapping** - Exam schedule to payment month mapping

## Business Rules

### Payment System
- Sequential payment allocation: Month N must be paid before Month N+1
- Students must pay Month 1 before enrolling in subjects
- Exam permits auto-unlock when month is fully paid
- 6-month payment buckets per enrollment

### Subject Enrollment
- Maximum 30 units per semester per student
- Prerequisites enforced: INC, FAILED, RETAKE blocks enrollment
- Schedule conflicts detected and prevented
- One program per student

### Grades
- Only allowed grades: 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0, INC, DRP
- INC (Incomplete) expiry: 6 months for major subjects, 12 months for minor
- Automatic conversion: Expired INC → FAILED
- GPA calculated: SUM(grade × units) / SUM(units)

### Audit Logging
- All critical operations logged to immutable AuditLog
- Operations: payments, grades, enrollments, documents, configuration changes
- Admin and Head-Registrar can view audit trails

## API Endpoints

### Student Endpoints
- `GET /api/student/profile/` - Student dashboard
- `GET /api/student/enrollments/` - Current enrollments
- `POST /api/student/enroll-subject/` - Enroll in subject
- `GET /api/student/payments/` - Payment history
- `GET /api/student/grades/` - Student grades
- `GET /api/student/permits/` - Exam permits
- `GET /api/student/notifications/` - Notifications

### Cashier Endpoints
- `POST /api/cashier/record-payment/` - Record payment
- `GET /api/cashier/student-balance/` - Check balance

### Registrar Endpoints
- `POST /api/registrar/enroll-subject/` - Manual enrollment with overrides
- `POST /api/registrar/create-transferee/` - Create transferee account
- `POST /api/registrar/credit-subject/` - Add credit to transferee
- `POST /api/registrar/release-document/` - Release official document
- `POST /api/registrar/finalize-grades/` - Finalize grades

### Admin Endpoints
- `GET /api/admin/config/` - Get system configuration
- `PUT /api/admin/config/` - Update configuration
- `GET /api/admin/audit-logs/` - View audit logs

### Public Endpoints
- `POST /api/public/enroll/` - Online enrollment form
- `GET /api/public/programs/` - List programs

## Testing

See [TESTING.md](TESTING.md) for comprehensive testing documentation, including:
- Manual testing checklists for each feature
- Test data setup with `seed_data` command
- Database verification commands
- Edge case and error scenario testing

## Deployment

### Local Development
```bash
python manage.py runserver 0.0.0.0:8000
```

### Production with PostgreSQL
1. Update `.env` with PostgreSQL credentials
2. Run migrations: `python manage.py migrate`
3. Collect static files: `python manage.py collectstatic`
4. Use gunicorn or similar WSGI server
5. Configure Redis for Celery workers

### Celery Background Jobs
```bash
# Start Celery worker
celery -A richwell_config worker -l info

# Start Celery beat (scheduler)
celery -A richwell_config beat -l info
```

## Documentation

- [Business Functions](documentation/busines-function.md) - Detailed business requirements and workflows
- [Technical Plan](documentation/plan.md) - Technical specifications with algorithms
- [Testing Guide](TESTING.md) - Manual testing procedures and checklists

## Development Workflow

### Full-Stack Iterative Development
Each feature is built end-to-end:
1. Create models and database migrations
2. Implement business services
3. Create forms and views
4. Build templates with Tailwind CSS
5. Test manually before moving to next feature

### Priorities
1. **Foundation** - Project setup and models
2. **Enrollment** - Online enrollment and account creation
3. **Payments** - Payment recording and allocation
4. **Subject Enrollment** - Student subject selection
5. **Grades** - Grade management and GPA calculation
6. **Transferees** - Registrar credit management
7. **Documents** - Official document release
8. **Admin Config** - System settings and reports
9. **Celery** - Background job automation
10. **Polish** - Security, performance, and deployment

## Common Management Commands

```bash
# Create a new semester
python manage.py create_semester --year 2024 --number 1 --start-date 2024-01-15

# Load seed data
python manage.py seed_data

# Check INC expiry
python manage.py check_inc_expiry

# Django shell for manual testing
python manage.py shell
```

## Troubleshooting

### Database Issues
```bash
# Reset migrations (development only)
python manage.py flush
python manage.py migrate
python manage.py seed_data
```

### Celery Not Running
```bash
# Verify Redis is running
redis-cli ping

# Check Celery worker
celery -A richwell_config inspect active
```

### Static Files Not Loading
```bash
python manage.py collectstatic --noinput
```

## Support & Feedback

For issues, questions, or feedback:
1. Check the documentation files
2. Review testing documentation for common scenarios
3. Use Django shell to verify data: `python manage.py shell`

## License

This project is developed for Richwell Colleges.

## Version

**Current Version:** 1.0.0 (Foundation Phase)
**Status:** In Active Development
**Last Updated:** December 2024
