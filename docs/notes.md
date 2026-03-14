python manage.py seed_applicants        # Admission pipeline

python manage.py seed_advising          # Enrolled students
  Generates:
    - 150 Students (ENROLLED status, advising APPROVED)
    - 8 Professors (assigned to Y1S1 subjects, varied availabilities)
    - 10 Rooms (various types, max 40 capacity)
    - 1 Term (Active, 2026-1)
    - Standard Staff Users (admin, registrar, cashier, etc.)
  Perfect for manual testing of Section Generation and Scheduling.

python manage.py seed_grade_submission  # Professors submit grades

python manage.py seed_grading           # Registrar finalize grades

python manage.py seed_resolution        # INC resolution workflow

python manage.py seed_full_cycle        # Everything (100 students)






Tests:
Frontend
npm run test:e2e - Runs all E2E tests in the background.
npm run test:e2e:ui - Opens the interactive Playwright UI for debugging.

Backend

