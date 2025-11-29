"""
Django management command to seed realistic test data for subject advising testing.
Idempotent: Safe to run multiple times without creating duplicates.
"""

from decimal import Decimal
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from sis.models import (
    User, Student, Program, Semester, Subject, SubjectEnrollment,
    Enrollment, Grade, Section, ScheduleSlot, PaymentMonth, Payment
)
from sis.services.grade_service import recalculate_gpa


class Command(BaseCommand):
    help = 'Seed realistic test data for subject advising testing'

    def handle(self, *args, **options):
        with transaction.atomic():
            self.stdout.write("Seeding advising test data...")

            # Phase 1: Create base data
            self.stdout.write("Phase 1: Creating base data...")
            self._create_program()
            self._create_subjects_simple()
            self._create_semesters()
            self._create_professors()
            self._create_sections_simple()
            self.stdout.write(self.style.SUCCESS("  Created program, subjects, semesters, professors, and sections"))

            # Phase 2: Create 8 student scenarios
            self.stdout.write("Phase 2: Creating 8 student scenarios...")
            self._create_freshman_student()
            self._create_passing_student()
            self._create_inc_student()
            self._create_old_inc_student()
            self._create_failed_student()
            self._create_prerequisite_issue_student()
            self._create_transfer_student()
            self._create_low_gpa_student()
            self.stdout.write(self.style.SUCCESS("  Created 8 student test scenarios"))

            # Phase 3: Create payment history for selected students
            self.stdout.write("Phase 3: Creating payment history...")
            self._create_payment_history_for_student('SEED_SCENARIO_2')
            self._create_payment_history_for_student('SEED_SCENARIO_3')
            self._create_payment_history_for_student('SEED_SCENARIO_8')
            self.stdout.write(self.style.SUCCESS("  Created payment history for 3 students"))

            self.stdout.write(self.style.SUCCESS("\nAdvising test data seeded successfully!"))

    def _create_program(self):
        """Create Computer Science program."""
        Program.objects.get_or_create(
            code='CS',
            defaults={
                'name': 'Bachelor of Science in Computer Science',
                'total_units_required': 120,
                'duration_years': 4
            }
        )

    def _create_subjects_simple(self):
        """Create simplified subject list for testing."""
        program = Program.objects.get(code='CS')

        subjects_data = [
            ('CS101', 'Programming Fundamentals', 3, 'MAJOR', []),
            ('CS102', 'Digital Logic', 3, 'MAJOR', []),
            ('CS103', 'Discrete Mathematics', 3, 'MAJOR', []),
            ('CS104', 'Web Basics', 3, 'MINOR', []),
            ('CS105', 'Data Structures Intro', 3, 'MAJOR', []),
            ('CS201', 'OOP', 3, 'MAJOR', ['CS101']),
            ('CS202', 'Architecture', 3, 'MAJOR', ['CS102']),
            ('CS203', 'Algorithms', 3, 'MAJOR', ['CS103']),
            ('CS204', 'Advanced Web Dev', 3, 'MINOR', []),
            ('CS205', 'Data Structures', 3, 'MAJOR', ['CS105']),
            ('CS301', 'AI Fundamentals', 3, 'MAJOR', ['CS203']),
            ('CS302', 'Advanced Databases', 3, 'MAJOR', ['CS205']),
            ('CS401', 'Machine Learning', 3, 'MAJOR', ['CS301']),
            ('ELEC101', 'Presentation Skills', 2, 'MINOR', []),
        ]

        # Pass 1: Create all subjects
        for code, name, units, subj_type, _ in subjects_data:
            Subject.objects.get_or_create(
                code=code,
                program=program,
                defaults={
                    'name': name,
                    'units': units,
                    'subject_type': subj_type,
                    'description': name
                }
            )

        # Pass 2: Set prerequisites
        for code, name, units, subj_type, prereq_codes in subjects_data:
            if prereq_codes:
                subject = Subject.objects.get(code=code, program=program)
                prereq_objects = Subject.objects.filter(code__in=prereq_codes, program=program)
                subject.prerequisites.set(prereq_objects)

    def _create_semesters(self):
        """Create 4 semesters for testing."""
        semesters_data = [
            (2023, 'FIRST', '2023-08-01', '2023-12-15', '2023-08-01', '2023-08-15'),
            (2024, 'FIRST', '2024-08-01', '2024-12-15', '2024-08-01', '2024-08-15'),
            (2024, 'SECOND', '2024-01-08', '2024-05-15', '2024-01-08', '2024-01-20'),
            (2025, 'FIRST', '2025-01-08', '2025-05-15', '2025-01-08', '2025-01-20'),
        ]

        for year, semester, start_str, end_str, enroll_start_str, enroll_end_str in semesters_data:
            is_active = (year == 2025 and semester == 'FIRST')
            Semester.objects.get_or_create(
                year=year,
                semester=semester,
                defaults={
                    'start_date': datetime.strptime(start_str, '%Y-%m-%d').date(),
                    'end_date': datetime.strptime(end_str, '%Y-%m-%d').date(),
                    'enrollment_start': datetime.strptime(enroll_start_str, '%Y-%m-%d').date(),
                    'enrollment_end': datetime.strptime(enroll_end_str, '%Y-%m-%d').date(),
                    'is_active': is_active
                }
            )

    def _create_professors(self):
        """Create 5 professors."""
        for i in range(1, 6):
            User.objects.get_or_create(
                username=f'professor{i}',
                defaults={
                    'email': f'prof{i}@richwell.edu',
                    'first_name': f'Prof',
                    'last_name': f'{chr(64+i)}',
                    'is_staff': True
                }
            )

    def _create_sections_simple(self):
        """Create 2 sections per subject per semester."""
        program = Program.objects.get(code='CS')
        semesters = Semester.objects.all()
        subjects = Subject.objects.filter(program=program)
        professors = list(User.objects.filter(username__startswith='professor'))

        prof_idx = 0
        for subject in subjects:
            for semester in semesters:
                for section_num in range(1, 3):
                    code = f'{subject.code}-{section_num}'
                    section, created = Section.objects.get_or_create(
                        code=code,
                        subject=subject,
                        semester=semester,
                        defaults={
                            'professor': professors[prof_idx % len(professors)],
                            'capacity': 40,
                            'schedule_notes': f'{subject.name} Section {section_num}'
                        }
                    )

                    if created:
                        days = ['MON', 'WED']
                        start_times = ['08:00', '10:00']
                        for day_idx, day in enumerate(days):
                            ScheduleSlot.objects.get_or_create(
                                section=section,
                                day=day,
                                defaults={
                                    'start_time': start_times[day_idx],
                                    'end_time': f'{int(start_times[day_idx][:2])+1}:00'
                                }
                            )
                    prof_idx += 1

    def _create_freshman_student(self):
        """Scenario 1: Freshman - new student, no history."""
        student, _ = Student.objects.get_or_create(
            student_id='SEED_SCENARIO_1',
            defaults={
                'user': self._get_or_create_user('seed_freshman', 'Freshman', 'Student'),
                'status': 'ACTIVE',
                'program': Program.objects.get(code='CS'),
                'enrollment_year': 2025,
                'gpa': Decimal('0.00')
            }
        )

        current_semester = Semester.objects.get(is_active=True)
        enrollment, _ = Enrollment.objects.get_or_create(
            student=student,
            semester=current_semester,
            defaults={'total_units': 0}
        )

        # Enroll in 3 Level 100 subjects
        subject_codes = ['CS101', 'CS102', 'CS104']
        for code in subject_codes:
            subject = Subject.objects.get(code=code)
            section = Section.objects.filter(subject=subject, semester=current_semester).first()
            if section:
                SubjectEnrollment.objects.get_or_create(
                    enrollment=enrollment,
                    subject=subject,
                    section=section,
                    defaults={
                        'enrollment_status': 'ENROLLED',
                        'subject_status': 'PASSED',
                        'grade_status': 'PENDING',
                        'enrolled_date': timezone.now()
                    }
                )
                enrollment.total_units += subject.units
        enrollment.save()

    def _create_passing_student(self):
        """Scenario 2: Passing student - multiple semesters with all PASSED grades."""
        student, _ = Student.objects.get_or_create(
            student_id='SEED_SCENARIO_2',
            defaults={
                'user': self._get_or_create_user('seed_passing', 'Passing', 'Student'),
                'status': 'ACTIVE',
                'program': Program.objects.get(code='CS'),
                'enrollment_year': 2023,
                'gpa': Decimal('3.60')
            }
        )

        semesters = Semester.objects.filter(year__in=[2023, 2024]).order_by('year', 'semester')[:2]
        semester_subjects = {
                        0: ['CS101', 'CS102', 'CS103'],
            1: ['CS201', 'CS202', 'CS203'],
        }

        for idx, semester in enumerate(semesters):
            enrollment, _ = Enrollment.objects.get_or_create(
                student=student,
                semester=semester,
                defaults={'total_units': 0}
            )

            for code in semester_subjects.get(idx, []):
                subject = Subject.objects.get(code=code)
                section = Section.objects.filter(subject=subject, semester=semester).first()
                if section:
                    se, created = SubjectEnrollment.objects.get_or_create(
                        enrollment=enrollment,
                        subject=subject,
                        section=section,
                        defaults={
                            'enrollment_status': 'ENROLLED',
                            'subject_status': 'PASSED',
                            'grade_status': 'FINALIZED',
                            'enrolled_date': timezone.now()
                        }
                    )
                    enrollment.total_units += subject.units

                    if created:
                        Grade.objects.get_or_create(
                            subject_enrollment=se,
                            defaults={
                                'grade_value': 'A',
                                'is_finalized': True,
                                'submitted_date': timezone.now(),
                                'finalized_date': timezone.now(),
                                'submitted_by': User.objects.first(),
                                'finalized_by': User.objects.first()
                            }
                        )
            enrollment.save()

        recalculate_gpa(student)

    def _create_inc_student(self):
        """Scenario 3: Student with recent INC subject."""
        student, _ = Student.objects.get_or_create(
            student_id='SEED_SCENARIO_3',
            defaults={
                'user': self._get_or_create_user('seed_inc', 'INC', 'Student'),
                'status': 'ACTIVE',
                'program': Program.objects.get(code='CS'),
                'enrollment_year': 2023,
                'gpa': Decimal('3.00')
            }
        )

        semester = Semester.objects.get(year=2023, semester='FIRST')
        enrollment, _ = Enrollment.objects.get_or_create(
            student=student,
            semester=semester,
            defaults={'total_units': 0}
        )

        for code in ['CS101', 'CS102', 'CS103']:
            subject = Subject.objects.get(code=code)
            section = Section.objects.filter(subject=subject, semester=semester).first()
            if section:
                se, created = SubjectEnrollment.objects.get_or_create(
                    enrollment=enrollment,
                    subject=subject,
                    section=section,
                    defaults={
                        'enrollment_status': 'ENROLLED',
                        'subject_status': 'PASSED' if code != 'CS103' else 'INC',
                        'grade_status': 'FINALIZED',
                        'enrolled_date': timezone.now(),
                        'inc_start_date': timezone.now().date() - timedelta(days=75) if code == 'CS103' else None
                    }
                )
                enrollment.total_units += subject.units

                if created:
                    grade_value = 'A' if code != 'CS103' else 'INC'
                    Grade.objects.get_or_create(
                        subject_enrollment=se,
                        defaults={
                            'grade_value': grade_value,
                            'is_finalized': True,
                            'submitted_date': timezone.now(),
                            'finalized_date': timezone.now(),
                            'submitted_by': User.objects.first(),
                            'finalized_by': User.objects.first()
                        }
                    )
        enrollment.save()
        recalculate_gpa(student)

    def _create_old_inc_student(self):
        """Scenario 4: Student with old INC subject (near expiry)."""
        student, _ = Student.objects.get_or_create(
            student_id='SEED_SCENARIO_4',
            defaults={
                'user': self._get_or_create_user('seed_old_inc', 'Old INC', 'Student'),
                'status': 'ACTIVE',
                'program': Program.objects.get(code='CS'),
                'enrollment_year': 2023,
                'gpa': Decimal('2.80')
            }
        )

        semester = Semester.objects.get(year=2023, semester='FIRST')
        enrollment, _ = Enrollment.objects.get_or_create(
            student=student,
            semester=semester,
            defaults={'total_units': 0}
        )

        # One INC subject from 5.5 months ago
        subject = Subject.objects.get(code='CS101')
        section = Section.objects.filter(subject=subject, semester=semester).first()
        if section:
            se, created = SubjectEnrollment.objects.get_or_create(
                enrollment=enrollment,
                subject=subject,
                section=section,
                defaults={
                    'enrollment_status': 'ENROLLED',
                    'subject_status': 'INC',
                    'grade_status': 'FINALIZED',
                    'enrolled_date': timezone.now(),
                    'inc_start_date': timezone.now().date() - timedelta(days=165)
                }
            )
            enrollment.total_units += subject.units

            if created:
                Grade.objects.get_or_create(
                    subject_enrollment=se,
                    defaults={
                        'grade_value': 'INC',
                        'is_finalized': True,
                        'submitted_date': timezone.now(),
                        'finalized_date': timezone.now(),
                        'submitted_by': User.objects.first(),
                        'finalized_by': User.objects.first()
                    }
                )
        enrollment.save()
        recalculate_gpa(student)

    def _create_failed_student(self):
        """Scenario 5: Student with FAILED subjects."""
        student, _ = Student.objects.get_or_create(
            student_id='SEED_SCENARIO_5',
            defaults={
                'user': self._get_or_create_user('seed_failed', 'Failed', 'Student'),
                'status': 'ACTIVE',
                'program': Program.objects.get(code='CS'),
                'enrollment_year': 2023,
                'gpa': Decimal('2.30')
            }
        )

        semester = Semester.objects.get(year=2023, semester='FIRST')
        enrollment, _ = Enrollment.objects.get_or_create(
            student=student,
            semester=semester,
            defaults={'total_units': 0}
        )

        for code in ['CS101', 'CS102', 'CS103']:
            subject = Subject.objects.get(code=code)
            section = Section.objects.filter(subject=subject, semester=semester).first()
            if section:
                se, created = SubjectEnrollment.objects.get_or_create(
                    enrollment=enrollment,
                    subject=subject,
                    section=section,
                    defaults={
                        'enrollment_status': 'ENROLLED',
                        'subject_status': 'FAILED' if code == 'CS101' else 'PASSED',
                        'grade_status': 'FINALIZED',
                        'enrolled_date': timezone.now()
                    }
                )
                enrollment.total_units += subject.units

                if created:
                    grade_value = 'F' if code == 'CS101' else 'C'
                    Grade.objects.get_or_create(
                        subject_enrollment=se,
                        defaults={
                            'grade_value': grade_value,
                            'is_finalized': True,
                            'submitted_date': timezone.now(),
                            'finalized_date': timezone.now(),
                            'submitted_by': User.objects.first(),
                            'finalized_by': User.objects.first()
                        }
                    )
        enrollment.save()
        recalculate_gpa(student)

    def _create_prerequisite_issue_student(self):
        """Scenario 6: Student with missing prerequisite."""
        student, _ = Student.objects.get_or_create(
            student_id='SEED_SCENARIO_6',
            defaults={
                'user': self._get_or_create_user('seed_prereq', 'Prerequisite', 'Issue'),
                'status': 'ACTIVE',
                'program': Program.objects.get(code='CS'),
                'enrollment_year': 2023,
                'gpa': Decimal('2.50')
            }
        )

        semester = Semester.objects.get(year=2023, semester='FIRST')
        enrollment, _ = Enrollment.objects.get_or_create(
            student=student,
            semester=semester,
            defaults={'total_units': 0}
        )

        # INC in prerequisite
        subject = Subject.objects.get(code='CS101')
        section = Section.objects.filter(subject=subject, semester=semester).first()
        if section:
            se, created = SubjectEnrollment.objects.get_or_create(
                enrollment=enrollment,
                subject=subject,
                section=section,
                defaults={
                    'enrollment_status': 'ENROLLED',
                    'subject_status': 'INC',
                    'grade_status': 'FINALIZED',
                    'enrolled_date': timezone.now(),
                    'inc_start_date': timezone.now().date() - timedelta(days=45)
                }
            )
            enrollment.total_units += subject.units

            if created:
                Grade.objects.get_or_create(
                    subject_enrollment=se,
                    defaults={
                        'grade_value': 'INC',
                        'is_finalized': True,
                        'submitted_date': timezone.now(),
                        'finalized_date': timezone.now(),
                        'submitted_by': User.objects.first(),
                        'finalized_by': User.objects.first()
                    }
                )
        enrollment.save()
        recalculate_gpa(student)

    def _create_transfer_student(self):
        """Scenario 7: Transfer student with CREDITED subjects."""
        student, _ = Student.objects.get_or_create(
            student_id='SEED_SCENARIO_7',
            defaults={
                'user': self._get_or_create_user('seed_transfer', 'Transfer', 'Student'),
                'status': 'ACTIVE',
                'program': Program.objects.get(code='CS'),
                'enrollment_year': 2024,
                'gpa': Decimal('3.40')
            }
        )

        semester = Semester.objects.get(year=2024, semester='FIRST')
        enrollment, _ = Enrollment.objects.get_or_create(
            student=student,
            semester=semester,
            defaults={'total_units': 0}
        )

        # CREDITED subjects (from transfer)
        for code in ['CS101', 'CS102']:
            subject = Subject.objects.get(code=code)
            se, created = SubjectEnrollment.objects.get_or_create(
                enrollment=enrollment,
                subject=subject,
                section=None,
                defaults={
                    'enrollment_status': 'ENROLLED',
                    'subject_status': 'CREDITED',
                    'grade_status': 'FINALIZED',
                    'enrolled_date': timezone.now()
                }
            )
            enrollment.total_units += subject.units

            if created:
                Grade.objects.get_or_create(
                    subject_enrollment=se,
                    defaults={
                        'grade_value': 'A',
                        'is_finalized': True,
                        'submitted_date': timezone.now(),
                        'finalized_date': timezone.now(),
                        'submitted_by': User.objects.first(),
                        'finalized_by': User.objects.first()
                    }
                )
        enrollment.save()
        recalculate_gpa(student)

    def _create_low_gpa_student(self):
        """Scenario 8: Low GPA student at risk."""
        student, _ = Student.objects.get_or_create(
            student_id='SEED_SCENARIO_8',
            defaults={
                'user': self._get_or_create_user('seed_low_gpa', 'Low GPA', 'Student'),
                'status': 'ACTIVE',
                'program': Program.objects.get(code='CS'),
                'enrollment_year': 2023,
                'gpa': Decimal('1.95')
            }
        )

        semester = Semester.objects.get(year=2023, semester='FIRST')
        enrollment, _ = Enrollment.objects.get_or_create(
            student=student,
            semester=semester,
            defaults={'total_units': 0}
        )

        for idx, code in enumerate(['CS101', 'CS102', 'CS103']):
            subject = Subject.objects.get(code=code)
            section = Section.objects.filter(subject=subject, semester=semester).first()
            if section:
                se, created = SubjectEnrollment.objects.get_or_create(
                    enrollment=enrollment,
                    subject=subject,
                    section=section,
                    defaults={
                        'enrollment_status': 'ENROLLED',
                        'subject_status': 'FAILED' if idx == 0 else 'PASSED',
                        'grade_status': 'FINALIZED',
                        'enrolled_date': timezone.now()
                    }
                )
                enrollment.total_units += subject.units

                if created:
                    grade_value = 'F' if idx == 0 else 'D'
                    Grade.objects.get_or_create(
                        subject_enrollment=se,
                        defaults={
                            'grade_value': grade_value,
                            'is_finalized': True,
                            'submitted_date': timezone.now(),
                            'finalized_date': timezone.now(),
                            'submitted_by': User.objects.first(),
                            'finalized_by': User.objects.first()
                        }
                    )
        enrollment.save()
        recalculate_gpa(student)

    def _create_payment_history_for_student(self, student_id):
        """Create payment history for a specific student."""
        try:
            student = Student.objects.get(student_id=student_id)
        except Student.DoesNotExist:
            return

        enrollments = list(student.enrollments.all())[:1]

        for enrollment in enrollments:
            # Create PaymentMonth records with due dates
            semester_start = enrollment.semester.start_date
            for month_num in range(1, 7):
                # Due date is approximately month_num * 30 days after semester start
                due_date = semester_start + timedelta(days=month_num * 30)
                PaymentMonth.objects.get_or_create(
                    enrollment=enrollment,
                    month_number=month_num,
                    defaults={
                        'amount_due': Decimal('2000.00'),
                        'due_date': due_date,
                        'is_paid': False
                    }
                )

    def _get_or_create_user(self, username, first_name, last_name):
        """Get or create a user."""
        user, _ = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f'{username}@richwell.edu',
                'first_name': first_name,
                'last_name': last_name,
                'is_staff': False
            }
        )
        return user
