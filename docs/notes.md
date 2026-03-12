python manage.py seed_applicants        # Admission pipeline
python manage.py seed_advising          # Enrolled students
python manage.py seed_grade_submission  # Professors submit grades
python manage.py seed_grading           # Registrar finalize grades
python manage.py seed_resolution        # INC resolution workflow
python manage.py seed_full_cycle        # Everything (100 students)

npm run test:e2e - Runs all E2E tests in the background.
npm run test:e2e:ui - Opens the interactive Playwright UI for debugging.

seed_applicants


  Professor logins:
    prof1 / EMP0010101   (Prof One)
    prof2 / EMP0020515   (Prof Two)
    prof3 / EMP0031020   (Prof Three)