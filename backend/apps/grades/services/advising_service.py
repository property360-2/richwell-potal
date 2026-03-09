from django.db import transaction
from django.db.models import Count, Q
from django.core.exceptions import ValidationError
from apps.grades.models import Grade
from apps.academics.models import Subject
from apps.students.models import StudentEnrollment


class AdvisingService:
    @staticmethod
    def get_year_level(student):
        """
        Calculates the year level of a student based on passed subjects.
        Returns the year level with the highst number of passed subjects 
        relative to the curriculum.
        """
        passed_subjects = Grade.objects.filter(
            student=student, 
            grade_status=Grade.STATUS_PASSED
        ).values_list('subject_id', flat=True)

        if not passed_subjects:
            return 1

        # Count how many subjects from each year level the student has passed
        year_counts = Subject.objects.filter(
            id__in=passed_subjects,
            curriculum_version=student.curriculum_version
        ).values('year_level').annotate(count=Count('year_level')).order_by('-year_level')

        if not year_counts:
            return 1
            
        # Strategy: Find the highest year level where the student has completed 
        # a significant portion of subjects, or just return the max year found.
        # For now, we'll return the highest year level where they have passed at least one subject.
        return year_counts[0]['year_level']

    @staticmethod
    @transaction.atomic
    def auto_advise_regular(student, term):
        """
        Automatically selects subjects for a regular student.
        """
        year_level = AdvisingService.get_year_level(student)
        
        # Determine semester type from term (e.g., 1st, 2nd)
        semester = term.semester_type 
        
        # Get subjects for the calculated year level and semester
        subjects = Subject.objects.filter(
            curriculum_version=student.curriculum_version,
            year_level=year_level,
            semester=semester
        ).exclude(semester_type='S') # Skip summer subjects

        # Exclude subjects already passed or credited
        passed_or_credited = Grade.objects.filter(
            student=student,
            grade_status__in=[Grade.STATUS_PASSED, Grade.STATUS_INC]
        ).values_list('subject_id', flat=True)

        subjects_to_enroll = subjects.exclude(id__in=passed_or_credited)

        # Detect retakes (subjects with previous FAILED or RETAKE status)
        retake_subject_ids = Grade.objects.filter(
            student=student,
            grade_status__in=[Grade.STATUS_FAILED, Grade.STATUS_RETAKE, Grade.STATUS_DROPPED]
        ).values_list('subject_id', flat=True)

        grades = []
        for subject in subjects_to_enroll:
            is_retake = subject.id in retake_subject_ids
            grade, created = Grade.objects.get_or_create(
                student=student,
                subject=subject,
                term=term,
                defaults={
                    'advising_status': Grade.ADVISING_PENDING,
                    'grade_status': Grade.STATUS_ADVISING,
                    'is_retake': is_retake
                }
            )
            if not created and grade.is_retake != is_retake:
                grade.is_retake = is_retake
                grade.save()
            grades.append(grade)
            
        return grades

    @staticmethod
    @transaction.atomic
    def manual_advise_irregular(student, term, subject_ids):
        """
        Validates and creates grades for irregular student selections.
        """
        subjects = Subject.objects.filter(id__in=subject_ids)
        total_units = sum(s.units for s in subjects)

        if total_units > 40:
            raise ValidationError("Total units exceed maximum limit of 40.")

        # Prerequisite check
        for subject in subjects:
            missing_prereqs = subject.prerequisites.exclude(
                prerequisite__in=Grade.objects.filter(
                    student=student, 
                    grade_status=Grade.STATUS_PASSED
                ).values_list('subject_id', flat=True)
            )
            if missing_prereqs.exists():
                codes = ", ".join([p.prerequisite.code for p in missing_prereqs])
                raise ValidationError(f"Missing prerequisites for {subject.code}: {codes}")

        grades = []
        for subject in subjects:
            grade, created = Grade.objects.get_or_create(
                student=student,
                subject=subject,
                term=term,
                defaults={
                    'advising_status': Grade.ADVISING_PENDING,
                    'grade_status': Grade.STATUS_ADVISING
                }
            )
            grades.append(grade)
            
        return grades

    @staticmethod
    @transaction.atomic
    def approve_advising(student_enrollment, user):
        """
        Approves the advising and updates grades to ENROLLED.
        """
        from django.utils import timezone
        
        grades = Grade.objects.filter(
            student=student_enrollment.student,
            term=student_enrollment.term,
            advising_status=Grade.ADVISING_PENDING
        )
        
        grades.update(
            advising_status=Grade.ADVISING_APPROVED,
            grade_status=Grade.STATUS_ENROLLED
        )

        # Cache the year level
        year_level = AdvisingService.get_year_level(student_enrollment.student)
        student_enrollment.year_level = year_level
        student_enrollment.advising_status = 'APPROVED'
        student_enrollment.advising_approved_by = user
        student_enrollment.advising_approved_at = timezone.now()
        student_enrollment.save()

    @staticmethod
    @transaction.atomic
    def reject_advising(student_enrollment, reason):
        """
        Rejects the advising.
        """
        grades = Grade.objects.filter(
            student=student_enrollment.student,
            term=student_enrollment.term,
            advising_status=Grade.ADVISING_PENDING
        )
        
        grades.update(
            advising_status=Grade.ADVISING_REJECTED,
            rejection_reason=reason
        )

        student_enrollment.advising_status = 'REJECTED'
        student_enrollment.save()

    @staticmethod
    @transaction.atomic
    def credit_subject(student, subject, term, credited_by):
        """
        Credits a subject for a transferee.
        """
        grade, created = Grade.objects.update_or_create(
            student=student,
            subject=subject,
            term=term,
            defaults={
                'grade_status': Grade.STATUS_PASSED,
                'is_credited': True,
                'advising_status': Grade.ADVISING_APPROVED
            }
        )
        return grade
