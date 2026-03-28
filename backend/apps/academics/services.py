"""
Richwell Portal — Academics Services

This module handles complex business logic for the Academics application, 
including bulk processing of curriculum data and subjects from CSV.
"""

import csv
import io
import re
from .models import Program, CurriculumVersion, Subject, SubjectPrerequisite

def process_bulk_subjects_csv(file_obj):
    """
    Processes a CSV file containing curriculum and subject data.
    Automatically creates/updates Programs, Curriculums, and Subjects 
    while establishing complex prerequisite relationships.
    
    @param {File} file_obj - The uploaded CSV file object.
    @returns {dict} A summary of processed records and any encountered errors.
    """
    # Use 'utf-8-sig' to automatically handle BOM if present
    decoded_file = file_obj.read().decode('utf-8-sig')
    io_string = io.StringIO(decoded_file)
    reader = csv.DictReader(io_string)
    
    # Sanitize headers (strip whitespace)
    reader.fieldnames = [name.strip() for name in reader.fieldnames] if reader.fieldnames else []
    
    programs_created = 0
    curriculums_created = 0
    subjects_processed = 0
    errors = []
    
    # 1. First pass: Create programs, curriculums, and subjects
    subject_map = {} # (curriculum_id, code) -> Subject object
    rows = list(reader)
    
    last_program_code = None
    current_year_level = 1

    for row_idx, row in enumerate(rows, start=2): # record 1 is header
        try:
            row = {k.strip(): (v.strip() if v else '') for k, v in row.items() if k}
            
            program_code = row.get('Program')
            if not program_code: continue

            if program_code != last_program_code:
                current_year_level = 1
                last_program_code = program_code
                
            program, p_created = Program.objects.get_or_create(
                code=program_code,
                defaults={'name': f"Program {program_code}"}
            )
            if p_created: programs_created += 1
            
            curriculum, c_created = CurriculumVersion.objects.get_or_create(
                program=program,
                version_name='V1'
            )
            if c_created: curriculums_created += 1
            
            yr_sem = row.get('Year_Semester', '')
            semester = '1'
            
            if 'Summer' in yr_sem:
                semester = 'S'
                if not program.has_summer:
                    program.has_summer = True
                    program.save(update_fields=['has_summer'])
            else:
                if '1st Year' in yr_sem: current_year_level = 1
                elif '2nd Year' in yr_sem: current_year_level = 2
                elif '3rd Year' in yr_sem: current_year_level = 3
                elif '4th Year' in yr_sem: current_year_level = 4
                
                if '1st Semester' in yr_sem: semester = '1'
                elif '2nd Semester' in yr_sem: semester = '2'
            
            subject_code = row.get('Program_Code', '')
            if not subject_code: continue

            major_prefixes = [
                'CC', 'IS', 'CAP', 'NCM', 'MC', 'CRIM', 'CLJ', 'CDI', 'LEA', 
                'CA', 'FOR', 'FOR S', 'CFLM', 'CLFM', 'FSM', 'AE', 'PC', 
                'ENTREP', 'EST', 'THC', 'TPC', 'TMPE', 'ECE', 
                'Practicum', 'Practicum 1', 'Practicum 2', 'Practicum 3',
            ]
            
            is_major = False
            is_practicum = False
            code_upper = subject_code.upper()
            
            for prefix in major_prefixes:
                if code_upper.startswith(prefix):
                    is_major = True
                    break
            
            if 'INTERNSHIP' in code_upper or 'PRACTICUM' in code_upper or 'TEACHING INTERNSHIP' in code_upper:
                is_practicum = True
                is_major = True
                
            def parse_int(val):
                if not val: return 0
                try:
                    clean_val = re.sub(r'[^\d.]', '', str(val))
                    return int(float(clean_val)) if clean_val else 0
                except (ValueError, TypeError):
                    return 0

            lec_units = parse_int(row.get('Lec_Units'))
            lab_units = parse_int(row.get('Lab_Units')) 
            total_units = parse_int(row.get('Total_Units'))

            hrs_sem_raw = row.get('Hrs_Sem', '')
            hrs_per_week = 0
            if hrs_sem_raw:
                match = re.search(r'(\d+(?:\.\d+)?)', hrs_sem_raw)
                if match:
                    val = float(match.group(1))
                    if 'hrs/week' in hrs_sem_raw.lower() or 'hours/week' in hrs_sem_raw.lower():
                        hrs_per_week = val
                    else:
                        hrs_per_week = val / 18.0
            
            if hrs_per_week == 0 and total_units > 0:
                hrs_per_week = float(total_units)

            subject, _ = Subject.objects.update_or_create(
                curriculum=curriculum,
                code=subject_code,
                defaults={
                    'description': row.get('Subject_Description', ''),
                    'year_level': current_year_level,
                    'semester': semester,
                    'lec_units': lec_units,
                    'lab_units': lab_units,
                    'total_units': total_units,
                    'hrs_per_week': hrs_per_week,
                    'is_major': is_major,
                    'is_practicum': is_practicum,
                }
            )
            subject_map[(curriculum.id, subject_code)] = subject
            subjects_processed += 1
            
        except Exception as e:
            errors.append(f"Row {row_idx} error: {str(e)}")

    # 2. Second pass: Handle Prerequisites
    for row in rows:
        try:
            row = {k.strip(): (v.strip() if v else '') for k, v in row.items() if k}
            prereq_str = row.get('Prerequisites', '')
            if not prereq_str or prereq_str.lower() in ['none', 'n/a', '-']:
                continue
            
            program_code = row.get('Program')
            subject_code = row.get('Program_Code')
            
            program = Program.objects.get(code=program_code)
            curriculum = CurriculumVersion.objects.get(program=program, version_name='V1')
            subject = subject_map.get((curriculum.id, subject_code))
            
            if not subject: continue

            prereq_codes = [p.strip() for p in re.split(r'[,;]', prereq_str) if p.strip()]
            
            for p_code in prereq_codes:
                p_subject = Subject.objects.filter(curriculum=curriculum, code=p_code).first()
                if p_subject:
                    SubjectPrerequisite.objects.get_or_create(
                        subject=subject,
                        prerequisite_type='SPECIFIC',
                        prerequisite_subject=p_subject
                    )
                else:
                    if 'Year Standing' in p_code:
                        match = re.search(r'(\d)', p_code)
                        if match:
                            SubjectPrerequisite.objects.get_or_create(
                                subject=subject,
                                prerequisite_type='YEAR_STANDING',
                                standing_year=int(match.group(1))
                            )
        except Exception:
            pass

    return {
        'programs_created': programs_created,
        'curriculums_created': curriculums_created,
        'subjects_processed': subjects_processed,
        'errors': errors
    }
