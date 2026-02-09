"""
Advanced Sectioning Engine - Handles Freshmen Queue, ML Classmate Preservation, and Rebalancing.
"""

import logging
from django.db import transaction
from django.db.models import Count, Q
from apps.accounts.models import User, StudentProfile
from apps.academics.models import Section, SectionSubject
from apps.enrollment.models import Enrollment, SubjectEnrollment, Semester

logger = logging.getLogger(__name__)

class SectioningEngine:
    """
    Core engine for student-to-section assignment.
    """

    @classmethod
    @transaction.atomic
    def process_freshman_queue(cls, semester_id, program_id=None):
        """
        Assigns freshmen to sections on a first-come, first-served basis.
        
        Logic:
        1. Find all Freshmen (Year Level 1) in the semester with PENDING or ACTIVE enrollment 
           who don't have a home_section.
        2. Sort by Enrollment.created_at.
        3. Fill available sections for their program sequentially.
        """
        semester = Semester.objects.get(id=semester_id)
        
        # Get all freshmen for this semester who need a section
        enrollments = Enrollment.objects.filter(
            semester=semester,
            student__student_profile__year_level=1,
            student__student_profile__home_section__isnull=True
        ).select_related('student__student_profile').order_by('created_at')

        if program_id:
            enrollments = enrollments.filter(student__student_profile__program_id=program_id)

        processed_count = 0
        
        for enrollment in enrollments:
            profile = enrollment.student.student_profile
            program = profile.program
            
            # Find available sections for this program and year level
            sections = Section.objects.filter(
                semester=semester,
                program=program,
                year_level=1,
                is_dissolved=False
            ).order_by('name')

            assigned = False
            for section in sections:
                if section.enrolled_count < section.capacity:
                    profile.home_section = section
                    profile.save()
                    
                    # Auto-enroll in all subjects for this section's curriculum
                    cls._auto_enroll_subjects(enrollment, section)
                    
                    assigned = True
                    processed_count += 1
                    break
            
            if not assigned:
                logger.warning(f"No available section for Freshman {enrollment.student.email} in {program.code}")

        return processed_count

    @classmethod
    def _auto_enroll_subjects(cls, enrollment, section):
        """
        Automatically enrolls a student in all subjects offered for their section.
        """
        section_subjects = SectionSubject.objects.filter(section=section)
        
        for ss in section_subjects:
            SubjectEnrollment.objects.get_or_create(
                enrollment=enrollment,
                subject=ss.subject,
                defaults={
                    'section': section,
                    'status': SubjectEnrollment.Status.ENROLLED,
                    'enrollment_type': SubjectEnrollment.EnrollmentType.HOME
                }
            )

    @classmethod
    @transaction.atomic
    def run_ml_resectioning(cls, semester_id, program_id, year_level):
        """
        Executes ML-based sectioning for returning students.
        """
        from .ml_models import SocialGraphService, ClassmatePreservationModel
        
        semester = Semester.objects.get(id=semester_id)
        
        # Get students needing sectioning (Returning students = Year > 1)
        enrollments = Enrollment.objects.filter(
            semester=semester,
            student__student_profile__program_id=program_id,
            student__student_profile__year_level=year_level,
            student__student_profile__home_section__isnull=True
        ).select_related('student__student_profile')

        student_ids = [str(e.student_id) for e in enrollments]
        if not student_ids:
            return 0

        # Get target sections
        sections = list(Section.objects.filter(
            semester=semester,
            program_id=program_id,
            year_level=year_level,
            is_dissolved=False
        ).order_by('name'))

        if not sections:
            return 0

        # Build social matrix and predict groups
        matrix = SocialGraphService.get_social_matrix(student_ids)
        model = ClassmatePreservationModel(n_sections=len(sections))
        groups = model.predict_groups(matrix)

        # Assign students to sections based on group IDs
        assigned_count = 0
        for i, enrollment in enumerate(enrollments):
            section_idx = groups[i]
            section = sections[section_idx]
            
            # check capacity
            if section.enrolled_count < section.capacity:
                profile = enrollment.student.student_profile
                profile.home_section = section
                profile.save()
                cls._auto_enroll_subjects(enrollment, section)
                assigned_count += 1
            else:
                # Fallback to any other available section
                for alt_section in sections:
                    if alt_section.enrolled_count < alt_section.capacity:
                        profile = enrollment.student.student_profile
                        profile.home_section = alt_section
                        profile.save()
                        cls._auto_enroll_subjects(enrollment, alt_section)
                        assigned_count += 1
                        break

        return assigned_count

    @classmethod
    @transaction.atomic
    def rebalance_sections(cls, semester_id):
        """
        'Saka nakikita mong kulang' logic.
        Identifies underfilled sections and suggests merges or moves.
        """
        semester = Semester.objects.get(id=semester_id)
        underfilled_threshold = 0.3  # 30% capacity
        
        sections = Section.objects.filter(semester=semester, is_dissolved=False)
        actions_taken = []

        for section in sections:
            count = section.enrolled_count
            occupancy = count / section.capacity if section.capacity > 0 else 0
            
            if occupancy < underfilled_threshold:
                # Find a sibling section to merge into
                sibling = Section.objects.filter(
                    semester=semester,
                    program=section.program,
                    year_level=section.year_level,
                    is_dissolved=False
                ).exclude(id=section.id).first()
                
                if sibling and (sibling.enrolled_count + count) <= sibling.capacity:
                    # Move all students to sibling
                    cls._move_section_students(section, sibling)
                    section.is_dissolved = True
                    section.parent_section = sibling
                    section.save()
                    actions_taken.append(f"Dissolved {section.name} into {sibling.name}")

        return actions_taken

    @classmethod
    def _move_section_students(cls, from_section, to_section):
        """Moves all students and their subject enrollments from one section to another."""
        # Update profiles
        StudentProfile.objects.filter(home_section=from_section).update(home_section=to_section)
        # Update subject enrollments
        SubjectEnrollment.objects.filter(section=from_section).update(section=to_section)
