"""
Management command to set up test data for EPIC 1.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal

from apps.accounts.models import User
from apps.academics.models import Program, Subject
from apps.enrollment.models import Semester


class Command(BaseCommand):
    help = 'Sets up test data for EPIC 1 (Programs, Subjects, Semester)'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('Setting up test data for EPIC 1...\n')
        
        # Create Programs
        programs_data = [
            {'code': 'BSIT', 'name': 'Bachelor of Science in Information Technology', 'duration_years': 4},
            {'code': 'BSCS', 'name': 'Bachelor of Science in Computer Science', 'duration_years': 4},
            {'code': 'BSBA', 'name': 'Bachelor of Science in Business Administration', 'duration_years': 4},
        ]
        
        programs = {}
        for data in programs_data:
            program, created = Program.objects.get_or_create(
                code=data['code'],
                defaults=data
            )
            programs[data['code']] = program
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f'  Program {data["code"]}: {status}')
        
        # Create Subjects for BSIT
        bsit = programs['BSIT']
        subjects_data = [
            # Year 1, Sem 1
            {'code': 'GE-ERNS', 'title': 'Mga Babasahin Tungkol sa Kasaysayan ng Pilipinas', 'units': 3, 'is_major': False, 'year_level': 1, 'semester_number': 1},
            {'code': 'GE-MMW', 'title': 'Mathematics in the Modern World', 'units': 3, 'is_major': False, 'year_level': 1, 'semester_number': 1},
            {'code': 'IT101', 'title': 'Introduction to Computing', 'units': 3, 'is_major': True, 'year_level': 1, 'semester_number': 1},
            {'code': 'IT102', 'title': 'Computer Programming 1', 'units': 3, 'is_major': True, 'year_level': 1, 'semester_number': 1},
            {'code': 'PE1', 'title': 'Physical Education 1', 'units': 2, 'is_major': False, 'year_level': 1, 'semester_number': 1},
            
            # Year 1, Sem 2
            {'code': 'IT103', 'title': 'Computer Programming 2', 'units': 3, 'is_major': True, 'year_level': 1, 'semester_number': 2},
            {'code': 'IT104', 'title': 'Data Structures and Algorithms', 'units': 3, 'is_major': True, 'year_level': 1, 'semester_number': 2},
            {'code': 'GE-UTS', 'title': 'Understanding the Self', 'units': 3, 'is_major': False, 'year_level': 1, 'semester_number': 2},
            {'code': 'PE2', 'title': 'Physical Education 2', 'units': 2, 'is_major': False, 'year_level': 1, 'semester_number': 2},
            
            # Year 2, Sem 1
            {'code': 'IT201', 'title': 'Object-Oriented Programming', 'units': 3, 'is_major': True, 'year_level': 2, 'semester_number': 1},
            {'code': 'IT202', 'title': 'Database Management Systems', 'units': 3, 'is_major': True, 'year_level': 2, 'semester_number': 1},
            {'code': 'IT203', 'title': 'Web Development 1', 'units': 3, 'is_major': True, 'year_level': 2, 'semester_number': 1},
        ]
        
        created_subjects = {}
        for data in subjects_data:
            subject, created = Subject.objects.get_or_create(
                program=bsit,
                code=data['code'],
                defaults=data
            )
            created_subjects[data['code']] = subject
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f'  Subject {data["code"]}: {status}')
        
        # Set up prerequisites
        prerequisites = {
            'IT103': ['IT102'],  # Programming 2 requires Programming 1
            'IT104': ['IT102'],  # Data Structures requires Programming 1
            'IT201': ['IT103', 'IT104'],  # OOP requires Programming 2 and Data Structures
            'IT202': ['IT102'],  # Database requires Programming 1
            'IT203': ['IT102'],  # Web Dev requires Programming 1
        }
        
        for subject_code, prereq_codes in prerequisites.items():
            if subject_code in created_subjects:
                subject = created_subjects[subject_code]
                for prereq_code in prereq_codes:
                    if prereq_code in created_subjects:
                        subject.prerequisites.add(created_subjects[prereq_code])
                self.stdout.write(f'  Prerequisites for {subject_code}: {prereq_codes}')
        
        # Create current semester
        from datetime import date
        today = date.today()
        semester, created = Semester.objects.get_or_create(
            name="1st Semester",
            academic_year=f"{today.year}-{today.year + 1}",
            defaults={
                'start_date': date(today.year, 8, 1),
                'end_date': date(today.year, 12, 31),
                'is_current': True
            }
        )
        if created:
            self.stdout.write(f'  Semester created: {semester}')
        else:
            self.stdout.write(f'  Semester already exists: {semester}')
        
        # Create a registrar user for testing
        registrar, created = User.objects.get_or_create(
            email='registrar@richwell.edu.ph',
            defaults={
                'first_name': 'Registrar',
                'last_name': 'Staff',
                'role': User.Role.REGISTRAR,
                'username': 'registrar@richwell.edu.ph',
                'is_staff': True
            }
        )
        if created:
            registrar.set_password('registrar123')
            registrar.save()
            self.stdout.write('  Registrar user created: registrar@richwell.edu.ph / registrar123')
        else:
            self.stdout.write('  Registrar user already exists')
        
        # Set admin password
        admin = User.objects.filter(email='admin@richwell.edu.ph').first()
        if admin:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write('  Admin password set to: admin123')
        
        self.stdout.write(self.style.SUCCESS('\n✓ Test data setup complete!'))
        self.stdout.write('\nYou can now:')
        self.stdout.write('  1. Login to admin: http://127.0.0.1:8000/admin/')
        self.stdout.write('     - Admin: admin@richwell.edu.ph / admin123')
        self.stdout.write('     - Registrar: registrar@richwell.edu.ph / registrar123')
        self.stdout.write('  2. View API docs: http://127.0.0.1:8000/api/docs/')
        self.stdout.write('  3. Test enrollment: POST to /api/v1/admissions/enroll/')
