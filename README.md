# Richwell Colleges Portal

A comprehensive Student Information System (SIS) for managing the complete student lifecycle from admissions through graduation. The system handles multi-actor workflows (Students, Professors, Registrars, Admins, Cashiers, etc.) with sophisticated business logic for enrollment, payments, scheduling, grading, and academic administration.

## Project Status

**Current Phase:** Phase 1 - Proxject Setup & Core Models (COMPLETE)

### Completed Tasks:
- [x] Django project structure initialized
- [x] All 15 business function models created
- [x] Database schema with migrations
- [x] Django admin interface with model registration
- [x] Base template structure with Bootstrap 5 and Richwell color theme
- [x] Authentication system (login/logout)
- [x] Error pages (404, 500)

### Next Steps:
- [ ] Create Django forms for core business functions
- [ ] Set up testing infrastructure (pytest)
- [ ] Implement Phase 2: Payment system (highest priority)
- [ ] Implement Phase 2: Subject enrollment with validations
- [ ] Implement Phase 2: Grades and GPA system

## Technology Stack

- **Backend:** Django 5.1.4
- **Database:** PostgreSQL
- **Cache/Jobs:** Redis + Celery
- **Frontend:** Django Templates + Bootstrap 5
- **Testing:** pytest + pytest-django
- **Python Version:** 3.10+

## Installation

### Option 1: Local Development Setup

#### Prerequisites
- Python 3.10 or higher
- PostgreSQL 12+
- Redis 6+ (optional, required for Celery tasks)

#### Steps

1. **Clone and navigate to project:**
   ```bash
   cd richwell-potal
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create .env file:**
   ```bash
   cp .env.example .env
   ```

5. **Configure database in .env:**
   ```
   DB_ENGINE=django.db.backends.postgresql
   DB_NAME=richwell_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   ```

6. **Create PostgreSQL database:**
   ```bash
   createdb richwell_db
   ```

7. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

8. **Create superuser:**
   ```bash
   python manage.py createsuperuser
   ```

9. **Run development server:**
   ```bash
   python manage.py runserver
   ```

10. **Access the application:**
    - Portal: http://localhost:8000
    - Admin: http://localhost:8000/admin/

### Option 2: Docker Setup (Recommended)

1. **Create docker-compose.yml:**
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:15
       environment:
         POSTGRES_DB: richwell_db
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data

     redis:
       image: redis:7
       ports:
         - "6379:6379"

     web:
       build: .
       command: python manage.py runserver 0.0.0.0:8000
       volumes:
         - .:/app
       ports:
         - "8000:8000"
       depends_on:
         - postgres
         - redis
       environment:
         - DEBUG=True
         - DB_ENGINE=django.db.backends.postgresql
         - DB_NAME=richwell_db
         - DB_USER=postgres
         - DB_PASSWORD=postgres
         - DB_HOST=postgres
         - DB_PORT=5432
         - CELERY_BROKER_URL=redis://redis:6379/0

   volumes:
     postgres_data:
   ```

2. **Create Dockerfile:**
   ```dockerfile
   FROM python:3.13
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   ```

3. **Start services:**
   ```bash
   docker-compose up
   ```

4. **Run migrations in Docker:**
   ```bash
   docker-compose exec web python manage.py migrate
   docker-compose exec web python manage.py createsuperuser
   ```

## Project Structure

```
richwell-potal/
├── richwell_config/          # Main Django project settings
│   ├── settings.py          # Django configuration
│   ├── urls.py              # URL routing
│   └── wsgi.py              # WSGI entry point
├── sis/                      # Main SIS app
│   ├── models.py            # All 15 business function models
│   ├── admin.py             # Django admin configuration
│   ├── views.py             # Views for auth and home
│   ├── urls.py              # App-specific URL routing
│   ├── forms.py             # Django forms (to be created)
│   └── migrations/          # Database migrations
├── templates/               # Django templates
│   ├── base.html           # Base template with navigation
│   ├── home.html           # Home/dashboard page
│   ├── 404.html            # Error page
│   ├── 500.html            # Error page
│   └── registration/       # Authentication templates
│       └── login.html
├── static/                  # Static files (CSS, JS)
├── manage.py                # Django management script
├── requirements.txt         # Python dependencies
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore file
└── README.md               # This file

## Database Schema

### Core Models:
- **User** - Extended Django user with roles (Student, Professor, Registrar, Admin, etc.)
- **Program** - Degree programs
- **Semester** - Academic periods
- **Subject** - Courses/subjects
- **Student** - Student profiles with lifecycle status
- **Enrollment** - Semester-level enrollment (tracks unit cap)
- **SubjectEnrollment** - Individual course enrollments
- **Section** - Class sections with professor assignments
- **ScheduleSlot** - Time slots for class meetings

### Business Logic Models:
- **PaymentMonth** - Monthly payment buckets (6 per semester)
- **Payment** - Payment transaction records
- **Grade** - Grade records for subject enrollment
- **ExamPermit** - Exam permits (auto-unlock when Month 1 paid)
- **AuditLog** - Immutable audit logging for critical operations
- **Notification** - In-app system notifications
- **TransferCredit** - Credits transferred for transferee students

## Key Features (Implemented/Planned)

### Phase 1 (COMPLETED):
- User management with role-based access
- Student lifecycle management
- Program and subject management
- Enrollment and scheduling structures
- Admin interface for all models
- Authentication system
- Base template structure with responsive design

### Phase 2 (Planned - Weeks 3-5):
- **Payment System** (Highest Priority)
  - Sequential payment allocation (Month 1 → Month N)
  - Exam permit auto-unlock when Month 1 paid
  - Payment reconciliation

- **Subject Enrollment**
  - Prerequisite validation
  - Unit cap enforcement (30 units/semester)
  - Schedule conflict detection
  - Registrar overrides with audit trails

- **Grades & GPA**
  - Grade entry and finalization
  - GPA calculation
  - INC (Incomplete) expiry logic (6 months major, 1 year minor)
  - Auto-conversion to FAILED with notifications

### Phase 3 (Planned - Weeks 6-8):
- Admissions and online enrollment
- Transferee onboarding
- Document management
- Notifications system
- Reports and analytics
- Admin configuration panel
- Background jobs (Celery)

### Phase 4 (Planned - Week 9+):
- Deployment and production setup
- Performance optimization
- Security hardening

## Critical Business Rules

1. **Sequential Payment Allocation** - Payments allocate to months in order; Month N cannot receive payment until Month N-1 is fully paid.

2. **Unit Cap** - Maximum 30 units per semester, enforced with database-level concurrency control (select_for_update).

3. **Prerequisite Enforcement** - Prerequisites with status INC, FAILED, or RETAKE block dependent subject enrollment.

4. **INC Expiry** - 6 months for major subjects, 1 year for minor subjects. Clock pauses during LOA.

5. **First Month Payment Gate** - Students cannot enroll subjects or sit exams until Month 1 is fully paid.

6. **Registrar Overrides** - Can override schedule conflicts or capacity constraints, requires reason and creates audit log entry.

## Color Theme

The portal uses a professional purple and saffron color palette:
- **Saffron:** #E3B60F (accent, highlights)
- **Purple:** #75156C (primary dark)
- **Purple-2:** #6D116A (variant)
- **Royal Plum:** #77206C (variant)
- **Vivid Orchid:** #BB41CA (secondary bright)

## Admin Access

After creating a superuser, access the admin interface at:
```
http://localhost:8000/admin/
```

All 15 business function models are pre-registered with:
- Custom list displays showing relevant fields
- Filters for quick navigation
- Search functionality on key fields
- Read-only fields for audit logs
- Proper permissions (audit logs cannot be modified)

## Testing

### Running Tests:
```bash
python manage.py pytest
```

### Running Specific Tests:
```bash
python manage.py pytest sis/tests/ -v
python manage.py pytest sis/tests/test_models.py::TestUserModel -v
```

### Coverage Report:
```bash
python manage.py pytest --cov=sis --cov-report=html
```

## Development Workflow

1. Create a feature branch:
   ```bash
   git checkout -b feature/feature-name
   ```

2. Make changes and run tests:
   ```bash
   python manage.py test sis
   ```

3. Check code quality:
   ```bash
   python manage.py check
   ```

4. Commit and push:
   ```bash
   git add .
   git commit -m "Add feature description"
   git push origin feature/feature-name
   ```

5. Create a pull request for review

## Environment Variables

See `.env.example` for all available configuration options:
```
SECRET_KEY              # Django secret key
DEBUG                   # Debug mode (False in production)
ALLOWED_HOSTS          # Comma-separated list of allowed hosts
DB_ENGINE              # Database backend
DB_NAME                # Database name
DB_USER                # Database user
DB_PASSWORD            # Database password
DB_HOST                # Database host
DB_PORT                # Database port
CELERY_BROKER_URL      # Redis broker URL
CELERY_RESULT_BACKEND  # Celery result backend
```

## Troubleshooting

### PostgreSQL Connection Issues
- Ensure PostgreSQL is running
- Check DB credentials in .env file
- Verify database exists: `psql -l`

### Migration Issues
- Delete migrations (except __init__.py) and start fresh
- Run: `python manage.py makemigrations sis && python manage.py migrate`

### Admin Interface Not Working
- Ensure superuser exists: `python manage.py createsuperuser`
- Check INSTALLED_APPS in settings.py includes 'sis'

## Documentation

- **Planning Documents:** See `/plan/` directory for detailed business function specifications
- **Database Schema:** See models in `sis/models.py`
- **API Documentation:** To be added in Phase 2-3

## Contributing

1. Follow PEP 8 style guidelines
2. Write tests for new features
3. Update documentation
4. Ensure all tests pass before committing
5. Keep commits focused and descriptive

## License

(To be specified)

## Contact & Support

For questions or issues, please contact the development team.

---

**Last Updated:** 2025-11-29
**Project Status:** Phase 1 Complete - Ready for Phase 2 Implementation
