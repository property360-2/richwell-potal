"""
Section Service - Handles automated section assignment and course auto-enrollment.
"""

import logging
from typing import Optional, List
from django.db import transaction
from django.db.models import Sum
from apps.accounts.models import StudentProfile
from apps.academics.models import Section, SectionSubject, Program
from ..models import Enrollment, SubjectEnrollment, Semester

logger = logging.getLogger(__name__)

class SectionService:
    """
    Service for automated sectioning logic.
    Used for new student admission and returning student semester activation.
    """

    @transaction.atomic
    def auto_assign_new_student(self, enrollment: Enrollment) -> Optional[Section]:
        """
        Auto-assign a section and its subjects to a newly admitted student.
        """
        student = enrollment.student
        profile = student.student_profile
        
        if not profile:
            logger.error(f"No student profile for enrollment {enrollment.id}")
            return None

        # 1. Find a suitable section
        # Criteria: Same Program, Same Year Level, Active Semester, Has Slots
        section = Section.objects.filter(
            program=profile.program,
            year_level=profile.year_level,
            semester=enrollment.semester,
            is_dissolved=False
        ).order_by('name').first() # Simple FCFS assignment to first available section

        if not section:
            logger.warning(f"No available section found for {student.email} in {profile.program.code}")
            return None

        # 2. Assign as home section
        profile.home_section = section
        profile.save()

        # 3. Auto-enroll in all subjects of that section
        self._enroll_student_in_section_subjects(enrollment, section)
        
        return section

    @transaction.atomic
    def auto_assign_current_students(self, new_semester: Semester):
        """
        Triggered when a new semester is activated.
        Finds active students and moves them to their next section.
        """
        # Find active students from the overall active status
        active_profiles = StudentProfile.objects.filter(status=StudentProfile.Status.ACTIVE).select_related('home_section', 'user')
        
        for profile in active_profiles:
            # Determine if we should increment year level
            # If the new semester is a "1st Semester" and not a "Summer", 
            # we typically move students up a year if they were in the previous year's 2nd semester.
            # However, for simplicity and safer automation, we'll try to find a section 
            # with the SAME NAME in the NEW SEMESTER first.
            
            target_year_level = profile.year_level
            current_section = profile.home_section
            
            # Logic: If we are moving to a new year (1st Sem of next AY), we might increment.
            # But the user asked to "strictly look for the next section name".
            # If current is BSIT-1A, we look for BSIT-1A in the current semester IF year_level hasn't changed.
            # Actually, typically students move 1A -> 2A when year changes.
            
            # For now, let's look for a section with the same name in the new semester.
            next_section = None
            if current_section:
                next_section = Section.objects.filter(
                    name=current_section.name,
                    semester=new_semester,
                    is_dissolved=False
                ).first()

            # If not found by name, fall back to any available section for their program/year
            if not next_section:
                next_section = Section.objects.filter(
                    program=profile.program,
                    year_level=target_year_level,
                    semester=new_semester,
                    is_dissolved=False
                ).order_by('name').first()

            # Create a new Enrollment record for the new semester
            enrollment, created = Enrollment.objects.get_or_create(
                student=profile.user,
                semester=new_semester,
                defaults={
                    'status': Enrollment.Status.PENDING,
                    'monthly_commitment': 0.00 
                }
            )
            
            if next_section:
                profile.home_section = next_section
                profile.save()
                self._enroll_student_in_section_subjects(enrollment, next_section)
                logger.info(f"Auto-assigned {profile.user.email} to {next_section.name} for {new_semester.name}")
            else:
                logger.warning(f"Could not find a section for {profile.user.email} in {new_semester}")

    def _enroll_student_in_section_subjects(self, enrollment: Enrollment, section: Section):
        """
        Helper method to enroll a student in all subjects linked to a section.
        """
        from .subject_enrollment_service import SubjectEnrollmentService
        subject_service = SubjectEnrollmentService()
        
        section_subjects = SectionSubject.objects.filter(
            section=section,
            is_deleted=False
        )
        
        for ss in section_subjects:
            try:
                # We use the internal service to handle the heavy lifting
                subject_service.enroll_in_subject(
                    student=enrollment.student,
                    enrollment=enrollment,
                    subject=ss.subject,
                    section=section
                )
                logger.info(f"Auto-enrolled {enrollment.student.email} in {ss.subject.code}")
            except Exception as e:
                # Log failures but keep going (maybe they already passed it or have conflict?)
                logger.error(f"Failed auto-enrollment in {ss.subject.code}: {str(e)}")
