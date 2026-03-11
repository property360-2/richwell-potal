import random
from datetime import date
from django.core.management.base import BaseCommand
from apps.accounts.models import User
from apps.students.models import Student, StudentEnrollment
from apps.academics.models import Program, Subject
from apps.terms.models import Term

class Command(BaseCommand):
    help = 'Add 20 more approved students to an existing program for testing capacity logic'

    def handle(self, *args, **options):
        # 1. Get requirements
        try:
            program = Program.objects.get(code='BS_Information_Systems')
            term = Term.objects.get(code='2026-1')
        except Program.DoesNotExist:
            self.stdout.write(self.style.ERROR('BSIS Program not found. Run seed_test_sectioning first.'))
            return
        except Term.DoesNotExist:
            self.stdout.write(self.style.ERROR('Term 2026-1 not found. Run seed_test_sectioning first.'))
            return

        # 2. Get the curriculum and a staff member for approval
        try:
            from apps.academics.models import CurriculumVersion
            curriculum = CurriculumVersion.objects.get(program=program, is_active=True)
            approver = User.objects.filter(role__in=['ADMIN', 'PROGRAM_HEAD']).first()
        except CurriculumVersion.DoesNotExist:
            self.stdout.write(self.style.ERROR('Active curriculum not found.'))
            return

        # 3. Get the current last student index
        current_count = Student.objects.count()
        start_idx = current_count + 1
        # Use starting ID from 28000+ to avoid overlap if needed, or just follow sequence
        end_idx = start_idx + 20

        self.stdout.write(f'  Adding 20 more students to {program.code}...')

        created_count = 0
        for idx in range(start_idx, end_idx):
            idn = f'28{str(idx).zfill(4)}'
            username = f'extra_student{idx}'
            
            # Create User
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@example.com',
                    'role': 'STUDENT',
                    'first_name': f'Extra',
                    'last_name': f'{idx}'
                }
            )
            if created:
                user.set_password('password123')
                user.save()

            # Create Student
            student, s_created = Student.objects.get_or_create(
                idn=idn,
                defaults={
                    'user': user,
                    'program': program,
                    'curriculum': curriculum,
                    'student_type': 'FRESHMAN',
                    'status': 'APPROVED',
                    'date_of_birth': date(2005, 1, 1),
                    'gender': 'MALE',
                    'address_full': 'Test Address',
                    'contact_number': '09123456789',
                    'is_advising_unlocked': True
                }
            )

            # Create Enrollment (APPROVED)
            if s_created:
                StudentEnrollment.objects.get_or_create(
                    student=student,
                    term=term,
                    defaults={
                        'year_level': 1,
                        'advising_status': 'APPROVED',
                        'advising_approved_by': approver,
                        'is_regular': True
                    }
                )
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f'  Successfully added {created_count} more APPROVED students.'))
        self.stdout.write(f'  Total Students now: {Student.objects.count()}')
        self.stdout.write(f'  Total Approved for BSIS Y1: {StudentEnrollment.objects.filter(term=term, student__program=program, year_level=1, advising_status="APPROVED").count()}')
