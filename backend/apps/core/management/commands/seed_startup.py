import csv
import re
import uuid
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from apps.accounts.models import User, Permission, PermissionCategory
from apps.academics.models import Program, Subject, Curriculum, CurriculumSubject
from apps.enrollment.models import Semester

class Command(BaseCommand):
    help = 'Initial system setup: Permissions, Admin, Semester, and Curriculum'

    def add_arguments(self, parser):
        parser.add_argument(
            '--wipe',
            action='store_true',
            help='Wipe existing core records before seeding',
        )

    PERMISSION_STRUCTURE = {
        'program_management': {
            'name': 'Program Management',
            'icon': 'graduation-cap',
            'order': 1,
            'permissions': [
                {'code': 'program.view', 'name': 'View Programs', 'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']},
                {'code': 'program.create', 'name': 'Create Programs', 'default_roles': ['ADMIN', 'HEAD_REGISTRAR']},
                {'code': 'program.edit', 'name': 'Edit Programs', 'default_roles': ['ADMIN', 'HEAD_REGISTRAR']},
                {'code': 'program.delete', 'name': 'Delete Programs', 'default_roles': ['ADMIN']},
            ]
        },
        'subject_management': {
            'name': 'Subject Management',
            'icon': 'book-open',
            'order': 2,
            'permissions': [
                {'code': 'subject.view', 'name': 'View Subjects', 'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'PROFESSOR']},
                {'code': 'subject.create', 'name': 'Create Subjects', 'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']},
                {'code': 'subject.edit', 'name': 'Edit Subjects', 'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']},
                {'code': 'subject.delete', 'name': 'Delete Subjects', 'default_roles': ['ADMIN', 'HEAD_REGISTRAR']},
            ]
        },
        'enrollment_management': {
            'name': 'Enrollment Management',
            'icon': 'user-plus',
            'order': 3,
            'permissions': [
                {'code': 'enrollment.view', 'name': 'View Enrollments', 'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']},
                {'code': 'enrollment.approve', 'name': 'Approve Enrollments', 'default_roles': ['ADMIN', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD']},
            ]
        }
        # Simplified for brevity, common permissions added
    }

    def parse_year_semester(self, text):
        year_map = {'1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5}
        sem_map = {'1st': 1, '2nd': 2, 'Summer': 3}
        year_match = re.search(r'(\d\w+)\s+Year', text)
        sem_match = re.search(r'(\d\w+|Summer)\s+Semester', text)
        year = year_map.get(year_match.group(1)) if year_match else 1
        semester = sem_map.get(sem_match.group(1)) if sem_match else 1
        if "Summer" in text: semester = 3
        return year, semester

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("🚀 Starting Startup Seeder..."))

        if options['wipe']:
            self.stdout.write(self.style.WARNING("⚠️ Wiping ALL database records (excluding superusers)..."))
            from django.db import connection
            from django.apps import apps
            with connection.cursor() as cursor:
                # PostgreSQL disable triggers
                cursor.execute("SET session_replication_role = 'replica';")
                apps_to_wipe = ['enrollment', 'academics', 'accounts']
                for app_label in apps_to_wipe:
                    app_config = apps.get_app_config(app_label)
                    for model in app_config.get_models():
                        if model._meta.model_name == 'user':
                            cursor.execute(f'DELETE FROM "{model._meta.db_table}" WHERE is_superuser = False;')
                        else:
                            cursor.execute(f'DELETE FROM "{model._meta.db_table}";')
                cursor.execute("SET session_replication_role = 'origin';")
            self.stdout.write(self.style.SUCCESS("✅ Wipe complete. Proceeding to seed..."))

        with transaction.atomic():
            # 1. Seed Permissions
            self.stdout.write("🔑 Seeding Permissions...")
            for cat_code, cat_data in self.PERMISSION_STRUCTURE.items():
                cat, _ = PermissionCategory.objects.update_or_create(
                    code=cat_code,
                    defaults={
                        'name': cat_data['name'],
                        'icon': cat_data['icon'],
                        'order': cat_data['order']
                    }
                )
                for p_data in cat_data['permissions']:
                    Permission.objects.update_or_create(
                        code=p_data['code'],
                        defaults={
                            'category': cat,
                            'name': p_data['name'],
                            'default_for_roles': p_data['default_roles']
                        }
                    )

            # 2. Seed Semester
            self.stdout.write("📅 Seeding Current Semester...")
            today = date.today()
            sem, _ = Semester.objects.get_or_create(
                academic_year="2024-2025",
                name="2nd Semester",
                defaults={
                    'start_date': today - timedelta(days=30),
                    'end_date': today + timedelta(days=120),
                    'enrollment_start_date': today - timedelta(days=60),
                    'enrollment_end_date': today + timedelta(days=30),
                    'status': Semester.TermStatus.ENROLLMENT_OPEN,
                    'is_current': True
                }
            )

            # 3. Seed Admin User
            self.stdout.write("👤 Creating Admin User...")
            admin_email = "admin@richwell.edu"
            if not User.objects.filter(email=admin_email).exists():
                User.objects.create_superuser(
                    email=admin_email,
                    password="password123",
                    first_name="System",
                    last_name="Administrator"
                )
                self.stdout.write(self.style.SUCCESS(f"  Created Admin: {admin_email}"))

            # 4. Import Curriculum from CSV
            csv_path = "C:/Users/Administrator/Desktop/richwell-potal/documentation/curriculum.csv"
            self.stdout.write(f"📚 Importing Curriculum from {csv_path}...")
            
            try:
                with open(csv_path, mode='r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)

                program_codes = set(row['Program'] for row in rows)
                programs = {}
                curricula = {}

                for code in program_codes:
                    p, _ = Program.objects.get_or_create(
                        code=code,
                        defaults={'name': code.replace('_', ' ')}
                    )
                    programs[code] = p
                    c, _ = Curriculum.objects.get_or_create(
                        program=p,
                        code='2024-STD',
                        defaults={
                            'name': f'{code} Standard Curriculum 2024',
                            'effective_year': 2024
                        }
                    )
                    curricula[code] = c

                subjects_map = {}
                for row in rows:
                    code = row['Program_Code'].strip()
                    title = row['Subject_Description'].strip()
                    units = int(float(row['Total_Units'].strip() or '3'))
                    
                    year, semester = self.parse_year_semester(row['Year_Semester'])
                    
                    s, _ = Subject.objects.update_or_create(
                        code=code,
                        defaults={
                            'program': programs[row['Program']],
                            'title': title,
                            'units': units if units > 0 else 3,
                            'year_level': year,
                            'semester_number': semester
                        }
                    )
                    subjects_map[code] = s
                    CurriculumSubject.objects.update_or_create(
                        curriculum=curricula[row['Program']],
                        subject=s,
                        defaults={
                            'year_level': year,
                            'semester_number': semester
                        }
                    )
                self.stdout.write(self.style.SUCCESS(f"  Imported {len(rows)} curriculum lines."))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Failed to import CSV: {str(e)}"))

        self.stdout.write(self.style.SUCCESS("✅ Startup Seeding Complete!"))
