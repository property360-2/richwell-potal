import math
from django.db import transaction, models
from apps.sections.models import Section
from apps.scheduling.models import Schedule
from apps.students.models import StudentEnrollment
from apps.academics.models import Subject

class SectioningService:
    @staticmethod
    def get_enrollment_stats(term):
        """
        Returns counts of approved students per program + year_level.
        Useful for the Registrar's sectioning matrix.
        """
        stats = StudentEnrollment.objects.filter(
            term=term, 
            advising_status='APPROVED'
        ).values(
            'student__program__id', 
            'student__program__code', 
            'student__program__name', 
            'year_level'
        ).annotate(
            count=models.Count('id')
        ).order_by('student__program__code', 'year_level')
        return stats

    @transaction.atomic
    def generate_sections(self, term, program, year_level):
        """
        Generates sections based on student counts (optimal 35, max 40).
        Automatically attaches curriculum subjects as empty schedule slots.
        """
        # 1. Count students
        count = StudentEnrollment.objects.filter(
            term=term,
            student__program=program,
            year_level=year_level,
            advising_status='APPROVED'
        ).count()
        
        if count == 0:
            return []

        # 2. Calculate num sections: ceil(count / 35)
        num_sections = math.ceil(count / 35.0)
        
        # 3. AM/PM split (Balance evenly)
        num_am = math.ceil(num_sections / 2.0)
        num_pm = num_sections - num_am
        
        created_sections = []
        
        # 4. Fetch subjects for this program/year/semester
        # We fetch from the curriculum version that is active and belonging to the program.
        subjects = Subject.objects.filter(
            curriculum__program=program,
            curriculum__is_active=True,
            year_level=year_level,
            semester=term.semester_type
        )
        
        for i in range(1, num_sections + 1):
            session = 'AM' if i <= num_am else 'PM'
            section_name = f"{program.code} {year_level}-{i}" # BSIS 1-1, 1-2...
            
            section, created = Section.objects.get_or_create(
                term=term,
                program=program,
                year_level=year_level,
                section_number=i,
                defaults={
                    'name': section_name,
                    'session': session,
                    'target_students': 35,
                    'max_students': 40
                }
            )
            created_sections.append(section)
            
            # Attach subjects via empty Schedule slots (both LEC and LAB if applicable)
            for subject in subjects:
                # Add Lecture component
                if subject.lec_units > 0:
                    Schedule.objects.get_or_create(
                        term=term,
                        section=section,
                        subject=subject,
                        component_type='LEC',
                        defaults={'days': []}
                    )
                # Add Lab component
                if subject.lab_units > 0:
                    Schedule.objects.get_or_create(
                        term=term,
                        section=section,
                        subject=subject,
                        component_type='LAB',
                        defaults={'days': []}
                    )
        
        return created_sections

    @transaction.atomic
    def manual_transfer_student(self, student, target_section, term, override_capacity=False):
        """
        Manually transfers a student to a target section.
        Updates all Grade records for the term and the StudentSection home record.
        """
        from apps.grades.models import Grade
        from apps.sections.models import SectionStudent

        # 1. Capacity Check
        current_count = target_section.student_assignments.count()
        if not override_capacity and current_count >= target_section.max_students:
            raise ValueError(f"Section {target_section.name} is full (Max: {target_section.max_students})")
        
        # 2. Update Grade records for this term
        updated_count = Grade.objects.filter(
            student=student,
            term=term
        ).update(section=target_section)

        # 3. Update SectionStudent record (Home Section)
        # Find existing assignment for this term
        existing = SectionStudent.objects.filter(student=student, section__term=term).first()
        if existing:
            existing.section = target_section
            existing.save()
        else:
            SectionStudent.objects.create(
                student=student,
                section=target_section,
                is_home_section=True
            )

        return updated_count
