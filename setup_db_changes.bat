@echo off
echo Applying database changes for Richwell Colleges Portal...
python backend/manage.py makemigrations academics core
python backend/manage.py migrate
echo Done!
pause
