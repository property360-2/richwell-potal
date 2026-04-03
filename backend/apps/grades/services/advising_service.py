from django.db import transaction
from django.db.models import Count, Q
from django.core.exceptions import ValidationError
from apps.grades.models import Grade
from apps.academics.models import Subject
from apps.students.models import StudentEnrollment
from apps.notifications.services.notification_service import NotificationService
from apps.notifications.models import Notification


class AdvisingService:
    @staticmethod
    def check_student_regularity(student, term):
        """
        Determines if a student is regular for a given term.
        Returns a dict: {"is_regular": bool, "reason": str|None}
        """
        # 0. Irregular if:
        # - Has unresolved INC.
        # - Failed a subject that is a prerequisite for another subject.
        # - Missing "Back Subjects" (prior units in the curriculum sequence).

        # 1. Check for INC
        inc_grades = Grade.objects.filter(student=student, grade_status=Grade.STATUS_INC)
        if inc_grades.exists():
            codes = ", ".join(inc_grades.values_list('subject__code', flat=True))
            return {"is_regular": False, "reason": f"Unresolved INC grades: {codes}"}

        # 1.1 New transferee without any credits yet is Irregular
        if student.student_type == 'TRANSFEREE' and not Grade.objects.filter(student=student).exists():
            return {"is_regular": False, "reason": "New transferee student (Manual Advising required)"}

        # 2. Check for Failed Prerequisites
        from apps.academics.models import SubjectPrerequisite
        failed_subject_ids = Grade.objects.filter(
            student=student, 
            grade_status=Grade.STATUS_FAILED
        ).values_list('subject_id', flat=True)
        
        prq_failures = SubjectPrerequisite.objects.filter(
            prerequisite_subject_id__in=failed_subject_ids,
            prerequisite_type='SPECIFIC'
        )
        if prq_failures.exists():
            failed_codes = ", ".join(Grade.objects.filter(subject_id__in=failed_subject_ids).values_list('subject__code', flat=True))
            return {"is_regular": False, "reason": f"Failed prerequisite(s): {failed_codes}"}

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

        missing_back = back_subjects.exclude(id__in=passed_subjects)
        if missing_back.exists():
            missing_codes = ", ".join(missing_back.values_list('code', flat=True))
            return {"is_regular": False, "reason": f"Missing back subjects: {missing_codes}"}

        return {"is_regular": True, "reason": None}

    @staticmethod
    def get_year_level(student):
        """
        Calculates the year level of a student based on subject density (Majority Rule).
        Returns the year level where the student has the highest count of subjects (Passed/Enrolled).
        """
        from django.db.models import Count
        
        # Consider both passed and currently enrolled subjects
        tracked_subject_ids = Grade.objects.filter(
            student=student, 
            grade_status__in=[Grade.STATUS_PASSED, Grade.STATUS_ENROLLED, Grade.STATUS_ADVISING]
        ).values_list('subject_id', flat=True)

        if not tracked_subject_ids:
            return 1

        # Count subjects per year level defined in the curriculum
        year_counts = Subject.objects.filter(
            curriculum=student.curriculum,
            id__in=tracked_subject_ids
        ).values('year_level').annotate(subject_count=Count('id')).order_by('-subject_count', '-year_level')

        if year_counts:
            # Return the year_level with the most subjects. 
            # In case of tie, the higher year level is prioritized (order_by '-year_level')
            return year_counts[0]['year_level']

        return 1

    @staticmethod
    @transaction.atomic
    def auto_advise_regular(student, term):
        """
        Automatically selects subjects for a regular student.
        """
        reg_data = AdvisingService.check_student_regularity(student, term)
        if not reg_data['is_regular']:
            raise ValidationError(
                message=reg_data['reason'] or "Student is irregular and requires manual advising.",
                code='IRREGULAR_STUDENT'
            )
        # Guard: Check if already pending or approved
        enrollment = StudentEnrollment.objects.filter(student=student, term=term).first()
        if enrollment and enrollment.advising_status in ['PENDING', 'APPROVED']:
            raise ValidationError(f"Advising already submitted ({enrollment.advising_status}).")

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
        
        if not subjects_to_enroll.exists():
            raise ValidationError("No subjects available for advising in this term. You may have already passed or credited all required subjects for this level.")

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
        # Guard: Check if already pending or approved
        current_enrollment = StudentEnrollment.objects.filter(student=student, term=term).first()
        if not current_enrollment:
            raise ValidationError("Student is not enrolled for this term.")
            
        if current_enrollment.advising_status in ['PENDING', 'APPROVED']:
            raise ValidationError(f"Advising already submitted ({current_enrollment.advising_status}).")

        subjects = Subject.objects.filter(id__in=subject_ids)
        
        # 1. Offering check: Ensure subjects are scheduled for this term
        from apps.scheduling.models import Schedule
        offered_subject_ids = Schedule.objects.filter(term=term).values_list('subject_id', flat=True).distinct()
        for subject in subjects:
            if subject.id not in offered_subject_ids:
                raise ValidationError(f"Subject {subject.code} is not offered this term.")

        # 2. Max Units Override check
        max_units = current_enrollment.max_units_override
        existing_units = sum(g.subject.total_units for g in Grade.objects.filter(student=student, term=term))
        new_units = sum(s.total_units for s in subjects)
        total_term_units = existing_units + new_units

        if total_term_units > max_units:
            raise ValidationError(f"Total units ({total_term_units}) exceed allowed limit of {max_units} for this term.")

        # Prerequisite check
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
                
                elif prereq.prerequisite_type == 'GROUP':
                    # Check if student has passed X subjects in a specific group (labeled in description)
                    # For now, we use a simple set of subject codes or tags if available, 
                    # but here we'll assume the description contains the required group name
                    passed_count = Grade.objects.filter(
                        student=student,
                        grade_status=Grade.STATUS_PASSED,
                        subject__description__icontains=prereq.description # Mock group check
                    ).count()
                    if passed_count < (prereq.min_subjects or 0):
                        raise ValidationError(f"Missing group prerequisite for {subject.code}: Needs {prereq.min_subjects} subjects from '{prereq.description}'.")

                elif prereq.prerequisite_type == 'PERCENTAGE':
                    # Check if student has passed X% of total units in their curriculum
                    from django.db.models import Sum
                    total_curriculum_units = Subject.objects.filter(curriculum=student.curriculum).aggregate(total=Sum('total_units'))['total'] or 0
                    passed_units = Grade.objects.filter(
                        student=student,
                        grade_status=Grade.STATUS_PASSED
                    ).aggregate(total=Sum('subject__total_units'))['total'] or 0
                    
                    if total_curriculum_units > 0:
                        percent_passed = (passed_units / total_curriculum_units) * 100
                        if percent_passed < (prereq.min_units or 0): # min_units used as percentage threshold
                            raise ValidationError(f"Missing units prerequisite for {subject.code}: Needs {prereq.min_units}% completion (Current: {percent_passed:.1f}%).")

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

        # Update official student status
        student_enrollment.student.status = 'ENROLLED'
        student_enrollment.student.save()

        # Notify Student
        NotificationService.notify(
            recipient=student_enrollment.student.user,
            notification_type=Notification.NotificationType.ADVISING,
            title="Advising Approved",
            message=f"Your advising for {student_enrollment.term.code} has been approved. You are now officially enrolled in your subjects.",
            link_url="/student/grades"
        )

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

        # Notify Student
        NotificationService.notify(
            recipient=student_enrollment.student.user,
            notification_type=Notification.NotificationType.ADVISING,
            title="Advising Rejected",
            message=f"Your advising for {student_enrollment.term.code} was rejected. Reason: {reason}",
            link_url="/student/advising" # Link to advising page to retry
        )

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
            reg_data = AdvisingService.check_student_regularity(student, term)
            enrollment.is_regular = reg_data['is_regular']
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
            reg_data = AdvisingService.check_student_regularity(student, term)
            enrollment.is_regular = reg_data['is_regular']
            enrollment.year_level = AdvisingService.get_year_level(student)
            enrollment.save()

    @classmethod
    @transaction.atomic
    def bulk_historical_encoding(cls, student, term, credit_data, user, source=None):
        """
        Registrar encodes TOR for legacy students.
        Bypasses Program Head approval and transitions.
        Sets historical_source for audit tracking.
        """
        from apps.grades.models import Grade
        from django.utils import timezone
        results = []
        
        for item in credit_data:
            subject_id = item.get('subject_id')
            final_grade = item.get('final_grade')
            
            if not subject_id or not final_grade:
                continue
                
            grade, _ = Grade.objects.update_or_create(
                student=student,
                subject_id=subject_id,
                term=term,
                defaults={
                    'final_grade': final_grade,
                    'grade_status': Grade.STATUS_PASSED if float(final_grade) <= 3.0 else Grade.STATUS_FAILED,
                    'advising_status': 'APPROVED',
                    'is_historical': True,
                    'is_credited': True,
                    'historical_source': source,
                    'submitted_by': user,
                    'finalized_by': user,
                    'finalized_at': timezone.now()
                }
            )
            grade.save(audit_user=user)
            results.append(grade)
            
        # Trigger recalculation of year level and regularity
        cls.recalculate_student_standing(student, term)
        return results

    @classmethod
    def recalculate_student_standing(cls, student, term):
        """
        Recalculates and updates a student's regularity and year level for a given term.
        """
        enrollment = StudentEnrollment.objects.filter(student=student, term=term).first()
        if enrollment:
            reg_data = cls.check_student_regularity(student, term)
            enrollment.is_regular = reg_data['is_regular']
            enrollment.regularity_reason = reg_data['reason']
            enrollment.year_level = cls.get_year_level(student)
            enrollment.save()

    @classmethod
    @transaction.atomic
    def submit_bulk_crediting_request(cls, student, term, user, items_data):
        """
        Registrar submits a bulk crediting request.
        """
        from apps.grades.models import CreditingRequest, CreditingRequestItem
        
        # Guard: Check if a pending request already exists for this term
        if CreditingRequest.objects.filter(student=student, term=term, status=CreditingRequest.STATUS_PENDING).exists():
            raise ValidationError("A pending crediting request already exists for this student and term.")

        request = CreditingRequest(
            student=student,
            term=term,
            requested_by=user,
            status=CreditingRequest.STATUS_PENDING
        )
        request.save(audit_user=user)

        for item in items_data:
            subject_id = item.get('subject_id')
            final_grade = item.get('final_grade')
            item = CreditingRequestItem(
                request=request,
                subject_id=subject_id,
                final_grade=final_grade
            )
            item.save(audit_user=user)

        return request

    @classmethod
    @transaction.atomic
    def approve_crediting_request(cls, request_id, user, comment=""):
        """
        Program Head approves a crediting request.
        Automatically credits subjects and updates student advising status.
        """
        from apps.grades.models import CreditingRequest, Grade
        
        request = CreditingRequest.objects.get(id=request_id)
        if request.status != CreditingRequest.STATUS_PENDING:
            raise ValidationError(f"Cannot approve a request with status {request.status}.")

        request.status = CreditingRequest.STATUS_APPROVED
        request.reviewed_by = user
        request.comment = comment
        request.save(audit_user=user)

        # Credit the subjects
        for item in request.items.all():
            cls.credit_subject(
                student=request.student,
                subject=item.subject,
                term=request.term,
                credited_by=user,
                final_grade=item.final_grade
            )
            
        return request

    @classmethod
    @transaction.atomic
    def reject_crediting_request(cls, request_id, user, reason):
        """
        Program Head rejects a crediting request.
        """
        from apps.grades.models import CreditingRequest
        
        request = CreditingRequest.objects.get(id=request_id)
        if request.status != CreditingRequest.STATUS_PENDING:
            raise ValidationError(f"Cannot reject a request with status {request.status}.")

        request.status = CreditingRequest.STATUS_REJECTED
        request.reviewed_by = user
        request.rejection_reason = reason
        request.save(audit_user=user)

        return request
