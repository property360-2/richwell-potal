from django.db import transaction, models
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.sections.models import Section, SectionStudent
from apps.grades.models import Grade
from apps.students.models import StudentEnrollment
from apps.scheduling.models import Schedule
from apps.notifications.services.notification_service import NotificationService
from core.exceptions import ConflictError

class PickingService:
    @staticmethod
    def validate_picking_period(term):
        """
        Validates that schedule picking is allowed for this term.
        Checks that sections are generated and published.
        """
        if not Section.objects.filter(term=term).exists():
            raise ValidationError({'detail': 'Sections have not been generated yet for this term.'})
        
        if not term.schedule_published:
            raise PermissionDenied("Schedule picking is not yet open for this term.")

    @staticmethod
    def _ensure_student_can_pick(student, term):
        enrollment = StudentEnrollment.objects.select_for_update().filter(student=student, term=term).first()
        if not enrollment:
            raise ValidationError({'detail': 'Student enrollment not found for this term.'})
        if enrollment.advising_status != 'APPROVED':
            raise PermissionDenied("Approved advising is required before schedule picking.")
        return enrollment

    @staticmethod
    def _schedule_to_ranges(schedule):
        if not schedule.start_time or not schedule.end_time:
            return []
        start = schedule.start_time.hour * 60 + schedule.start_time.minute
        end = schedule.end_time.hour * 60 + schedule.end_time.minute
        return [(day, start, end) for day in schedule.days]

    @classmethod
    def _has_conflict(cls, candidate_schedules, existing_ranges):
        for schedule in candidate_schedules:
            for day, start, end in cls._schedule_to_ranges(schedule):
                for existing_day, existing_start, existing_end in existing_ranges:
                    if day == existing_day and start < existing_end and existing_start < end:
                        return True
        return False


    @transaction.atomic
    def pick_schedule_regular(self, student, term, preferred_session, bypass_period_validation=False):
        """
        Assigns a regular student to a section matching their preferred session (AM/PM).
        If preferred session is full, assigns to an alternative session and notifies the student.
        """
        # 0. Validate picking period
        if not bypass_period_validation:
            self.validate_picking_period(term)

        # 1. Get student's enrollment info
        enrollment = self._ensure_student_can_pick(student, term)
            
        # Check if already picked for this term (direct term field — no join needed)
        if SectionStudent.objects.select_for_update().filter(student=student, term=term).exists():
            raise ConflictError("Your schedule for this term has already been picked and locked.")

        if not enrollment.is_regular:
            raise ValidationError({'detail': 'Student is classified as Irregular. Please use the individual schedule picker.'})

        # 2. Find available sections for the preferred session
        sections = Section.objects.select_for_update().filter(
            term=term, 
            program=student.program, 
            year_level=enrollment.year_level,
            session=preferred_session
        ).annotate(
            current_students=models.Count('student_assignments')
        ).filter(current_students__lt=models.F('max_students')).order_by('current_students', 'id')

        target_section = sections.first()
        redirected = False

        # 3. If preferred session is full, try the alternative
        if not target_section:
            alt_session = 'PM' if preferred_session == 'AM' else 'AM'
            target_section = Section.objects.select_for_update().filter(
                term=term, 
                program=student.program, 
                year_level=enrollment.year_level,
                session=alt_session
            ).annotate(
                current_students=models.Count('student_assignments')
            ).filter(current_students__lt=models.F('max_students')).order_by('current_students', 'id').first()
            redirected = True

        if not target_section:
            raise ConflictError("All available sections for your program and year level are currently full. Please contact the Registrar.")

        # 4. Assign student to this section for ALL their subjects in this term
        Grade.objects.filter(
            student=student,
            term=term,
            advising_status=Grade.ADVISING_APPROVED
        ).update(section=target_section)
        
        # 5. Set Home Section assignment (term field is stored directly for clean isolation)
        existing = SectionStudent.objects.select_for_update().filter(
            student=student,
            term=term
        ).first()
        if existing:
            existing.section = target_section
            existing.save()
        else:
            SectionStudent.objects.create(
                student=student,
                section=target_section,
                term=term,
                is_home_section=True
            )

        # 6. NOTIF-02: Notify the student if their preferred session was not available
        if redirected:
            NotificationService.notify_session_redirection(
                student, preferred_session, target_section.session
            )

        return target_section, redirected

    @transaction.atomic
    def pick_schedule_irregular(self, student, term, selections):
        """
        Handles per-subject schedule picking for irregular students.
        selections: list of {'subject_id': id, 'section_id': id}
        """
        self.validate_picking_period(term)
        enrollment = self._ensure_student_can_pick(student, term)

        if enrollment.is_regular:
            raise ValidationError({'detail': 'Student is classified as Regular. Please use the regular schedule picker.'})

        if SectionStudent.objects.select_for_update().filter(student=student, term=term).exists():
            raise ConflictError("Your schedule for this term has already been picked and locked.")

        if not selections:
            raise ValidationError({'detail': 'At least one schedule selection is required.'})

        approved_grades = Grade.objects.select_for_update().filter(
            student=student,
            term=term,
            advising_status=Grade.ADVISING_APPROVED
        ).select_related('subject')
        approved_grade_map = {grade.subject_id: grade for grade in approved_grades}

        existing_ranges = []
        selected_sections = {}

        for item in selections:
            subject_id = item.get('subject_id')
            section_id = item.get('section_id')
            if subject_id not in approved_grade_map:
                raise PermissionDenied("You can only pick sections for approved subjects in this term.")
            
            try:
                section = Section.objects.select_for_update().get(id=section_id, term=term)
            except Section.DoesNotExist as exc:
                raise ValidationError({'detail': 'Selected section is invalid for this term.'}) from exc
            current_students = section.student_assignments.select_for_update().count()
            if current_students >= section.max_students:
                raise ConflictError(f"Section {section.name} is full.")

            matching_schedules = list(Schedule.objects.filter(
                term=term,
                section=section,
                subject_id=subject_id
            ))
            if not matching_schedules:
                raise ValidationError({'detail': f"Section {section.name} does not offer the selected subject in this term."})

            if self._has_conflict(matching_schedules, existing_ranges):
                raise ConflictError(f"Section {section.name} conflicts with another selected subject.")

            existing_ranges.extend(
                time_range
                for schedule in matching_schedules
                for time_range in self._schedule_to_ranges(schedule)
            )
            selected_sections[subject_id] = section

        # For irregulars, 'home section' is less strict, but we can assign them to one 
        # of their chosen sections for administrative grouping.
        for subject_id, section in selected_sections.items():
            Grade.objects.filter(
                student=student,
                subject_id=subject_id,
                term=term,
                advising_status=Grade.ADVISING_APPROVED
            ).update(section=section)

        if selections:
            first_section = selected_sections[selections[0]['subject_id']]
            existing = SectionStudent.objects.select_for_update().filter(
                student=student,
                term=term
            ).first()
            if existing:
                existing.section = first_section
                existing.save()
            else:
                SectionStudent.objects.create(
                    student=student,
                    section=first_section,
                    term=term,
                    is_home_section=True
                )

        return True

    @transaction.atomic
    def auto_assign_remaining(self, term):
        """
        Automatically assigns unpicked students to available slots after the picking deadline.
        """
        unassigned_enrollments = StudentEnrollment.objects.filter(
            term=term,
            advising_status='APPROVED'
        ).exclude(
            student__section_assignments__term=term
        )

        assigned_count = 0
        for enrollment in unassigned_enrollments:
            try:
                # Default to AM, the service will fallback to PM if full
                # Admin bypass: Allow assignment even before the picking period is officially 'open'
                self.pick_schedule_regular(enrollment.student, term, 'AM', bypass_period_validation=True)
                assigned_count += 1
            except Exception:
                # Log or handle full capacity at program/year level
                continue
        
        return assigned_count
