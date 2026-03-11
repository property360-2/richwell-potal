# Richwell Portal - Test Suite

## Setup

```bash
pip install -r requirements-test.txt
```

## Running Tests

```bash
# Run all tests
pytest

# With coverage
pytest --cov=apps --cov=core --cov-report=html --cov-fail-under=50

# Stop on first failure
pytest -x

# Verbose output
pytest -vv

# Specific file
pytest tests/test_api.py

# Specific test
pytest tests/test_security.py::TestSecurity::test_student_cannot_access_other_student_detail -v
```

## Test Structure

- `test_models.py` - Model validation, constraints, defaults
- `test_serializers.py` - Serializer validation and output
- `test_authentication.py` - Login, JWT, protected endpoints
- `test_permissions.py` - Role-based access control
- `test_api.py` - API endpoint integration tests
- `test_services.py` - Service layer business logic
- `test_edge_cases.py` - Empty payloads, invalid data
- `test_security.py` - Auth bypass, BOLA, permission escalation
- `test_bugs.py` - Bug-reproducing tests

## Configuration

Tests use `config.settings.test` (SQLite in-memory, `--no-migrations`) for fast execution.
