"""
Richwell Portal — Academics Services

This module handles complex business logic for the Academics application, 
including bulk processing of curriculum data and subjects from CSV.
"""

import csv
import io
import re
from .models import Program, CurriculumVersion, Subject, SubjectPrerequisite
from apps.auditing.models import AuditLog

def process_bulk_subjects_csv(file_obj, audit_user=None, audit_ip=None):
    """
    Processes a CSV file containing curriculum and subject data.
    Automatically creates/updates Programs, Curriculums, and Subjects 
    while establishing complex prerequisite relationships.
    
    @param {File} file_obj - The uploaded CSV file object.
    @param {User} audit_user - The user performing the upload for auditing.
    @param {str} audit_ip - The IP address of the user for auditing.
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
                
            program = Program.objects.filter(code=program_code).first()
            if not program:
                program = Program(code=program_code, name=f"Program {program_code}")
                program.save(skip_audit=True)
                programs_created += 1
            
            curriculum = CurriculumVersion.objects.filter(program=program, version_name='V1').first()
            if not curriculum:
                curriculum = CurriculumVersion(program=program, version_name='V1')
                curriculum.save(skip_audit=True)
                curriculums_created += 1
            
            yr_sem = row.get('Year_Semester', '')
            semester = '1'
            
            if 'Summer' in yr_sem:
                semester = 'S'
                if not program.has_summer:
                    program.has_summer = True
                    program.save(update_fields=['has_summer'], skip_audit=True)
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

            subject = Subject.objects.filter(curriculum=curriculum, code=subject_code).first()
            if not subject:
                subject = Subject(curriculum=curriculum, code=subject_code)
            
            subject.description = row.get('Subject_Description', '')
            subject.year_level = current_year_level
            subject.semester = semester
            subject.lec_units = lec_units
            subject.lab_units = lab_units
            subject.total_units = total_units
            subject.hrs_per_week = hrs_per_week
            subject.is_major = is_major
            subject.is_practicum = is_practicum
            
            subject.save(skip_audit=True)
            
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
                    prereq = SubjectPrerequisite.objects.filter(
                        subject=subject,
                        prerequisite_type='SPECIFIC',
                        prerequisite_subject=p_subject
                    ).first()
                    if not prereq:
                        prereq = SubjectPrerequisite(
                            subject=subject,
                            prerequisite_type='SPECIFIC',
                            prerequisite_subject=p_subject
                        )
                        prereq.save(skip_audit=True)
                else:
                    if 'Year Standing' in p_code:
                        match = re.search(r'(\d)', p_code)
                        if match:
                            prereq = SubjectPrerequisite.objects.filter(
                                subject=subject,
                                prerequisite_type='YEAR_STANDING',
                                standing_year=int(match.group(1))
                            ).first()
                            if not prereq:
                                prereq = SubjectPrerequisite(
                                    subject=subject,
                                    prerequisite_type='YEAR_STANDING',
                                    standing_year=int(match.group(1))
                                )
                                prereq.save(skip_audit=True)

        except Exception:
            pass

    # 3. Create a single summary AuditLog entry
    if subjects_processed > 0:
        AuditLog.objects.create(
            user=audit_user,
            action='BULK_IMPORT',
            model_name='Curriculum',
            object_repr='Bulk Curriculum Upload',
            changes={
                "message": "User has bulk uploaded curriculums",
                "counts": {
                    "programs": programs_created,
                    "curriculums": curriculums_created,
                    "subjects": subjects_processed
                }
            },
            ip_address=audit_ip
        )

    return {
        'programs_created': programs_created,
        'curriculums_created': curriculums_created,
        'subjects_processed': subjects_processed,
        'errors': errors
    }
