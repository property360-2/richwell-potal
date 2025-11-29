# Testing Guide - Richwell Colleges Portal

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Database Migrations
```bash
python manage.py migrate
python manage.py migrate rest_framework
```

### 3. Create a Superuser (for Django Admin)
```bash
python manage.py createsuperuser
```

### 4. Run the Development Server
```bash
python manage.py runserver
```

Then visit:
- **Web Application:** http://localhost:8000/
- **API Documentation (Swagger):** http://localhost:8000/api/v1/docs/
- **API ReDoc:** http://localhost:8000/api/v1/redoc/
- **API Schema:** http://localhost:8000/api/v1/schema/

---

## Running Tests

### Run All Tests
```bash
pytest
```

### Run with Coverage Report
```bash
pytest --cov=sis --cov-report=html
```

### Run Specific Test Files
```bash
# API tests only
pytest sis/tests/test_api.py -v

# Payment service tests
pytest sis/tests/test_payment_service.py -v

# Enrollment service tests
pytest sis/tests/test_enrollment_service.py -v

# Grade service tests
pytest sis/tests/test_grade_service.py -v
```

### Run Specific Test Class
```bash
pytest sis/tests/test_api.py::TestStudentProfileAPI -v
```

### Run with Detailed Output
```bash
pytest -v -s  # -s shows print statements
```

---

## Testing Celery Background Jobs

### 1. Start Redis Server
```bash
redis-server
```

### 2. Start Celery Worker (Terminal 2)
```bash
celery -A richwell_config worker -l info
```

### 3. Start Celery Beat (Terminal 3)
```bash
celery -A richwell_config beat -l info
```

### 4. Monitor Celery Tasks (Terminal 4)
```bash
python manage.py celery_monitor
```

### 5. Test a Task Manually
```bash
python manage.py shell
```

Then in the shell:
```python
from sis.tasks import check_inc_expiry, recalculate_student_gpa
from celery import current_app

# Queue a task
result = check_inc_expiry.delay()
print(result.id)  # Print task ID
print(result.status)  # Check status
print(result.result)  # Get result
```

---

## Testing the REST API

### Using cURL
```bash
# Get API token
curl -X POST http://localhost:8000/api-token-auth/ \
  -H "Content-Type: application/json" \
  -d '{"username": "student_username", "password": "password"}'

# Use token in requests
curl -H "Authorization: Token YOUR_TOKEN_HERE" \
  http://localhost:8000/api/v1/student/profile/me/
```

### Using Python Requests
```python
import requests

# Get token
response = requests.post('http://localhost:8000/api-token-auth/', {
    'username': 'student_username',
    'password': 'password'
})
token = response.json()['token']

# Use token
headers = {'Authorization': f'Token {token}'}
response = requests.get('http://localhost:8000/api/v1/student/profile/me/', headers=headers)
print(response.json())
```

### Using Swagger UI
1. Visit http://localhost:8000/api/v1/docs/
2. Click "Authorize" button
3. Enter Token: `Token YOUR_TOKEN_HERE`
4. Try endpoints from the UI

---

## Test Data Setup

### Create Test User with API Token
```bash
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

User = get_user_model()

# Create student user
user = User.objects.create_user(
    username='teststudent',
    email='test@example.com',
    password='testpass123',
    role='STUDENT',
    first_name='Test',
    last_name='Student'
)

# Create API token
token = Token.objects.create(user=user)
print(f'Token: {token.key}')
```

### Load Seed Data
```bash
python manage.py seed_advising_data
```

This creates test students with various scenarios:
- `seed_freshman` - New freshman student
- `seed_passing` - Student with passing grades
- `seed_inc` - Student with incomplete grades
- `seed_old_inc` - Student with old incomplete (expiry scenarios)
- `seed_failed` - Student with failed grades
- `seed_prerequisite` - Student for prerequisite testing
- `seed_transfer` - Transferee student
- `seed_low_gpa` - Student with low GPA

---

## Current Test Coverage

### Passing Tests (100%)
- **Payment Service Tests:** 19/19 ✅
  - Sequential payment allocation
  - Overpayment handling
  - Exam permit unlocking
  - Payment balance queries

### Tests Needing Attention
- **Enrollment Service Tests:** 77% passing (~23/30)
  - Some race condition tests may fail
  - Schedule conflict override edge cases

- **Grade Service Tests:** 79% passing (~19/24)
  - INC expiry with LOA edge cases
  - Grade override scenarios

- **API Tests:** New (sis/tests/test_api.py)
  - Student profile endpoints
  - Enrollment workflows
  - Cashier payment recording
  - Public API (new student enrollment)
  - Authentication & permissions

---

## Debugging Failed Tests

### 1. Run Single Failing Test
```bash
pytest sis/tests/test_enrollment_service.py::TestEnrollmentService::test_name -v -s
```

### 2. Enable Detailed Output
```bash
pytest --tb=long -v
```

### 3. Use Python Debugger
```python
# In your test code
import pdb
pdb.set_trace()
```

Then use:
- `n` - Next line
- `s` - Step into
- `c` - Continue
- `p variable` - Print variable
- `l` - List code

### 4. Check Database State
```bash
python manage.py shell
```

```python
from sis.models import *

# Check enrollments
enrollments = Enrollment.objects.all()
for e in enrollments:
    print(f"Enrollment: {e}, Status: {e.status}")

# Check payments
payments = PaymentMonth.objects.all()
for p in payments:
    print(f"Month {p.month_number}: Paid={p.is_paid}, Amount={p.amount_paid}")
```

---

## Performance Testing

### Load Test Payment Allocation
```bash
# Install locust
pip install locust

# Create locustfile.py with payment scenarios
# Then run:
locust -f locustfile.py --host=http://localhost:8000
```

### Check Slow Queries
```bash
# In settings.py, enable query logging:
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG',
        }
    }
}
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Run Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.13'
      - run: pip install -r requirements.txt
      - run: python manage.py migrate
      - run: pytest --cov=sis
```

---

## Troubleshooting

### Redis Connection Error
```
Error: Could not connect to Redis at localhost:6379
Solution: Start Redis server: redis-server
```

### Migration Errors
```bash
# Reset database (development only)
python manage.py migrate sis zero
python manage.py migrate
```

### Import Errors in Tests
```bash
# Install in editable mode
pip install -e .

# Or add project root to PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### Celery Not Picking Up Tasks
```bash
# Make sure __init__.py exists in sis/
# Make sure celery.py is imported in richwell_config/__init__.py

# Check celery config
python manage.py shell
>>> from richwell_config.celery import app
>>> app.conf.CELERY_BROKER_URL
'redis://localhost:6379/0'
```

---

## Next Steps

1. **Run API tests:**
   ```bash
   pytest sis/tests/test_api.py -v
   ```

2. **Fix failing enrollment tests:**
   ```bash
   pytest sis/tests/test_enrollment_service.py -v
   ```

3. **Fix failing grade tests:**
   ```bash
   pytest sis/tests/test_grade_service.py -v
   ```

4. **Achieve 100% test passing:**
   ```bash
   pytest --cov=sis
   ```

5. **Set up Docker for deployment:**
   - Create Dockerfile
   - Create docker-compose.yml
   - Test Docker build
