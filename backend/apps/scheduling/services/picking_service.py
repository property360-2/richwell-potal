from django.db import transaction, models
from apps.sections.models import Section, SectionStudent
from apps.grades.models import Grade
from apps.students.models import StudentEnrollment

class PickingService:
    @transaction.atomic
    def pick_schedule_regular(self, student, term, preferred_session):
        """
        Assigns a regular student to a section matching their preferred session (AM/PM).
        If preferred session is full, assigns to an alternative session and notifies the student.
        """
        # 1. Get student's enrollment info
        enrollment = StudentEnrollment.objects.filter(student=student, term=term).first()
        if not enrollment:
            raise ValueError("Student enrollment not found for this term.")
            
        if not enrollment.is_regular:
            raise ValueError("Student is classified as Irregular. Please use the individual schedule picker.")

        # 2. Find available sections for the preferred session
        sections = Section.objects.filter(
            term=term, 
            program=student.program, 
            year_level=enrollment.year_level,
            session=preferred_session
        ).annotate(
            current_students=models.Count('student_assignments')
        ).filter(current_students__lt=40).order_by('current_students')

        target_section = sections.first()
        redirected = False

        # 3. If preferred session is full, try the alternative
        if not target_section:
            alt_session = 'PM' if preferred_session == 'AM' else 'AM'
            target_section = Section.objects.filter(
                term=term, 
                program=student.program, 
                year_level=enrollment.year_level,
                session=alt_session
            ).annotate(
                current_students=models.Count('student_assignments')
            ).filter(current_students__lt=40).order_by('current_students').first()
            redirected = True

        if not target_section:
            raise ValueError("All available sections for your program and year level are currently full. Please contact the Registrar.")

        # 4. Assign student to this section for ALL their subjects in this term
        Grade.objects.filter(student=student, term=term).update(section=target_section)
        
        # 5. Set Home Section assignment
        SectionStudent.objects.update_or_create(
            student=student,
            section__term=term,
            defaults={'section': target_section, 'is_home_section': True}
        )

        # 6. TODO: Notification if redirected
        # if redirected:
        #     NotificationService.notify_session_redirection(student, preferred_session, target_section.session)

        return target_section, redirected

    @transaction.atomic
    def pick_schedule_irregular(self, student, term, selections):
        """
        Handles per-subject schedule picking for irregular students.
        selections: list of {'subject_id': id, 'section_id': id}
        """
        for item in selections:
            subject_id = item.get('subject_id')
            section_id = item.get('section_id')
            
            section = Section.objects.get(id=section_id)
            if section.student_assignments.count() >= 40:
                raise ValueError(f"Section {section.name} is full.")
                
            Grade.objects.filter(
                student=student, 
                subject_id=subject_id, 
                term=term
            ).update(section=section)

        # For irregulars, 'home section' is less strict, but we can assign them to one 
        # of their chosen sections for administrative grouping.
        if selections:
            first_section = Section.objects.get(id=selections[0]['section_id'])
            SectionStudent.objects.update_or_create(
                student=student,
                section__term=term,
                defaults={'section': first_section, 'is_home_section': True}
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
            student__section_assignments__section__term=term
        )

        assigned_count = 0
        for enrollment in unassigned_enrollments:
            try:
                # Default to AM, the service will fallback to PM if full
                self.pick_schedule_regular(enrollment.student, term, 'AM')
                assigned_count += 1
            except Exception:
                # Log or handle full capacity at program/year level
                continue
        
        return assigned_count
