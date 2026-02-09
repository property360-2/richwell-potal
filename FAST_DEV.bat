@echo off
echo Starting Richwell Portal Development Environment...
start "Backend Request Checking" cmd /k "cd backend && python manage.py check"
start "Backend Server" cmd /k "cd backend && python manage.py runserver"
start "Frontend Server" cmd /k "cd frontend && npm run dev"
echo Development environment started!
