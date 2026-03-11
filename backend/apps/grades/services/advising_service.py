from django.db import transaction
from django.db.models import Count, Q
from django.core.exceptions import ValidationError
from apps.grades.models import Grade
from apps.academics.models import Subject
from apps.students.models import StudentEnrollment


class AdvisingService:
    @staticmethod
    def check_student_regularity(student, term):
        """
        Determines if a student should be Regular or Irregular.
        Irregular if:
        1. Has unresolved INC.
        2. Failed a subject that is a prerequisite for another subject.
        3. Missing "Back Subjects" (prior units in the curriculum sequence).
        """
        # 0. New Transferees are Irregular by default (needs crediting/selection)
        if student.student_type == 'TRANSFEREE':
            has_history = Grade.objects.filter(student=student, grade_status=Grade.STATUS_PASSED).exists()
            if not has_history:
                return False

        # 1. Check for INC
        if Grade.objects.filter(student=student, grade_status=Grade.STATUS_INC).exists():
            return False

        # 2. Check for Failed Prerequisites
        from apps.academics.models import SubjectPrerequisite
        failed_subject_ids = Grade.objects.filter(
            student=student, 
            grade_status=Grade.STATUS_FAILED
        ).values_list('subject_id', flat=True)
        
        if SubjectPrerequisite.objects.filter(
            prerequisite_subject_id__in=failed_subject_ids,
            prerequisite_type='SPECIFIC'
        ).exists():
            return False

        # 3. Check for Back Subjects
        # Determine standing (Year/Sem)
        # If already enrolled for this term, use that year level. 
        # Otherwise, use the calculated year level.
        enrollment = StudentEnrollment.objects.filter(student=student, term=term).first()
        current_year = enrollment.year_level if enrollment else AdvisingService.get_year_level(student)
        current_sem = term.semester_type
        
        sem_weight = {'1': 1, '2': 2, 'S': 3}
        curr_weight = sem_weight.get(current_sem, 0)

        # Subjects from previous years OR previous semesters of current year
        back_subjects = Subject.objects.filter(curriculum=student.curriculum).filter(
            Q(year_level__lt=current_year) | 
            Q(year_level=current_year, semester__in=[k for k, v in sem_weight.items() if v < curr_weight])
        )

        # If any of these "should have been passed" subjects are missing PASSED grade
        passed_subjects = Grade.objects.filter(
            student=student, 
            grade_status=Grade.STATUS_PASSED
        ).values_list('subject_id', flat=True)

        if back_subjects.exclude(id__in=passed_subjects).exists():
            return False

        return True

    @staticmethod
    def get_year_level(student):
        """
        Calculates the year level of a student based on passed subjects.
        Returns the HIGHEST year level where the student has passed at least one subject.
        """
        passed_subjects = Grade.objects.filter(
            student=student, 
            grade_status=Grade.STATUS_PASSED
        ).values_list('subject_id', flat=True)

        if not passed_subjects:
            return 1

        # Find the highest year_level among passed subjects
        from django.db.models import Max
        highest_year = Subject.objects.filter(
            curriculum=student.curriculum,
            id__in=passed_subjects
        ).aggregate(max_year=Max('year_level'))['max_year']

        return highest_year or 1

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
            curriculum=student.curriculum,
            year_level=year_level,
            semester=semester
        ).exclude(semester='S') # Skip summer subjects

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
            
        # Update enrollment status to PENDING
        StudentEnrollment.objects.filter(student=student, term=term).update(advising_status='PENDING')
            
        return grades

    @staticmethod
    @transaction.atomic
    def manual_advise_irregular(student, term, subject_ids):
        """
        Validates and creates grades for irregular student selections.
        """
        subjects = Subject.objects.filter(id__in=subject_ids)
        # Calculate total units including existing ones in THIS term
        existing_units = sum(g.subject.total_units for g in Grade.objects.filter(student=student, term=term))
        new_units = sum(s.total_units for s in subjects)
        total_term_units = existing_units + new_units

        if total_term_units > 30:
            raise ValidationError(f"Total units ({total_term_units}) exceed maximum limit of 30.")

        # Prerequisite check
        from apps.students.models import StudentEnrollment
        current_enrollment = StudentEnrollment.objects.filter(student=student, term=term).first()
        
        for subject in subjects:
            for prereq in subject.prerequisites.all():
                if prereq.prerequisite_type == 'SPECIFIC':
                    is_passed = Grade.objects.filter(
                        student=student, 
                        subject=prereq.prerequisite_subject,
                        grade_status=Grade.STATUS_PASSED
                    ).exists()
                    if not is_passed:
                        raise ValidationError(f"Missing prerequisite for {subject.code}: {prereq.prerequisite_subject.code}")
                
                elif prereq.prerequisite_type == 'YEAR_STANDING':
                    if current_enrollment and current_enrollment.year_level < prereq.standing_year:
                        raise ValidationError(f"{subject.code} requires Year {prereq.standing_year} standing.")

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
            
        # Update enrollment status to PENDING
        if current_enrollment:
            current_enrollment.advising_status = 'PENDING'
            current_enrollment.save()
            
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
            term=student_enrollment.term
        ).exclude(
            grade_status__in=[Grade.STATUS_PASSED, Grade.STATUS_FAILED, Grade.STATUS_DROPPED]
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
    def credit_subject(student, subject, term, credited_by, final_grade=None):
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
                'advising_status': Grade.ADVISING_APPROVED,
                'final_grade': final_grade
            }
        )
        
        # Re-check regularity and Year Level
        enrollment = StudentEnrollment.objects.filter(student=student, term=term).first()
        if enrollment:
            enrollment.is_regular = AdvisingService.check_student_regularity(student, term)
            enrollment.year_level = AdvisingService.get_year_level(student)
            enrollment.save()
            
        return grade

    @staticmethod
    @transaction.atomic
    def uncredit_subject(student, subject, term):
        """
        Removes credit (deletes Grade record) for a subject.
        Only allows deleting if it was a credited record.
        """
        Grade.objects.filter(
            student=student,
            subject=subject,
            term=term,
            is_credited=True
        ).delete()

        # Re-check regularity and Year Level
        enrollment = StudentEnrollment.objects.filter(student=student, term=term).first()
        if enrollment:
            enrollment.is_regular = AdvisingService.check_student_regularity(student, term)
            enrollment.year_level = AdvisingService.get_year_level(student)
            enrollment.save()
