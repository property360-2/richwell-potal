import csv
import re
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.academics.models import Program, Subject, Curriculum, CurriculumSubject

class Command(BaseCommand):
    help = 'Import curriculum data from a CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file')

    def parse_year_semester(self, text):
        # Example: "1st Year - 1st Semester"
        year_map = {'1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5}
        sem_map = {'1st': 1, '2nd': 2, 'Summer': 3}

        year_match = re.search(r'(\d\w+)\s+Year', text)
        sem_match = re.search(r'(\d\w+|Summer)\s+Semester', text)

        year = year_map.get(year_match.group(1)) if year_match else 1
        semester = sem_map.get(sem_match.group(1)) if sem_match else 1
        
        # Special case for "Summer" which might not follow the numbered pattern
        if "Summer" in text:
            semester = 3

        return year, semester

    def handle(self, *args, **options):
        csv_path = options['csv_file']
        
        self.stdout.write(self.style.NOTICE(f"Importing curriculum from {csv_path}..."))

        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        with transaction.atomic():
            # 1. Create Programs and Curricula
            program_codes = set(row['Program'] for row in rows)
            programs = {}
            curricula = {}

            for code in program_codes:
                p, _ = Program.objects.get_or_create(
                    code=code,
                    defaults={'name': code.replace('_', ' ')}
                )
                programs[code] = p
                
                c, _ = Curriculum.objects.get_or_create(
                    program=p,
                    code='2024-STD',
                    defaults={
                        'name': f'{code} Standard Curriculum 2024',
                        'effective_year': 2024
                    }
                )
                curricula[code] = c

            # 2. Create Subjects
            subjects_to_create = []
            subject_codes = set(row['Program_Code'].strip() for row in rows)
            
            # Map codes to subjects for linking
            subjects_map = {}

            for row in rows:
                code = row['Program_Code'].strip()
                title = row['Subject_Description'].strip()
                units_str = row['Total_Units'].strip() or '0'
                units = int(float(units_str))

                # Find or create subject
                # Note: Subjects are unique by code globally in the model
                s, created = Subject.objects.get_or_create(
                    code=code,
                    defaults={
                        'program': programs[row['Program']],
                        'title': title,
                        'units': units if units > 0 else 3, # Default if 0
                        'year_level': 1, # Temporary, will use CurriculumSubject for precise placement
                        'semester_number': 1
                    }
                )
                subjects_map[code] = s
                
                if created:
                    self.stdout.write(f"  Created subject: {code}")

                # 3. Create CurriculumSubject
                year, semester = self.parse_year_semester(row['Year_Semester'])
                
                CurriculumSubject.objects.get_or_create(
                    curriculum=curricula[row['Program']],
                    subject=s,
                    defaults={
                        'year_level': year,
                        'semester_number': semester,
                        'is_required': True
                    }
                )

            # 4. Handle Prerequisites
            for row in rows:
                code = row['Program_Code'].strip()
                prereq_str = row['Prerequisites'].strip()
                
                if prereq_str and prereq_str.lower() != 'none':
                    subject = subjects_map.get(code)
                    if not subject: continue

                    # Basic split for simple cases (e.g. "Math 101, Eng 102")
                    # Cleaning up common and/ separators
                    prereq_codes = re.split(r',|&|and', prereq_str)
                    for p_code in prereq_codes:
                        p_code = p_code.strip()
                        if not p_code: continue
                        
                        prereq_obj = Subject.objects.filter(code__iexact=p_code).first()
                        if prereq_obj:
                            subject.prerequisites.add(prereq_obj)
                            self.stdout.write(f"    Linked {code} -> {p_code}")
                        else:
                            self.stdout.write(self.style.WARNING(f"    Prerequisite not found: {p_code} for {code}"))

        self.stdout.write(self.style.SUCCESS("Curriculum import complete!"))
