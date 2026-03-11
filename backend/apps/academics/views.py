from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import csv
import io
from .models import Program, CurriculumVersion, Subject, SubjectPrerequisite
from .serializers import (
    ProgramSerializer, CurriculumVersionSerializer, 
    SubjectSerializer, SubjectPrerequisiteSerializer
)
from core.permissions import IsAdminOrReadOnly

class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.all().order_by('code')
    serializer_class = ProgramSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['code', 'name']
    filterset_fields = ['is_active', 'has_summer']

class CurriculumVersionViewSet(viewsets.ModelViewSet):
    queryset = CurriculumVersion.objects.all().order_by('-created_at')
    serializer_class = CurriculumVersionSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['program', 'is_active']
    
    @action(detail=True, methods=['post'])
    def set_active(self, request, pk=None):
        curriculum = self.get_object()
        # Deactivate all others for this program
        CurriculumVersion.objects.filter(program=curriculum.program, is_active=True).update(is_active=False)
        # Activate this one
        curriculum.is_active = True
        curriculum.save()
        return Response({'status': 'curriculum activated'})

from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all().order_by('year_level', 'semester')
    serializer_class = SubjectSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['code', 'description']
    filterset_fields = ['curriculum', 'curriculum__program', 'year_level', 'semester', 'is_major']
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def bulk_upload(self, request):
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file_obj = request.FILES['file']
        if not file_obj.name.endswith('.csv'):
            return Response({'error': 'File must be CSV'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Use 'utf-8-sig' to automatically handle BOM if present
            decoded_file = file_obj.read().decode('utf-8-sig')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            # Sanitize headers (strip whitespace)
            reader.fieldnames = [name.strip() for name in reader.fieldnames] if reader.fieldnames else []
            
            # Keep track of counts
            programs_created = 0
            curriculums_created = 0
            subjects_processed = 0
            errors = []
            
            # 1. First pass: Create programs, curriculums, and subjects
            # We store created subjects in a map for the second pass (prerequisites)
            subject_map = {} # (curriculum_id, code) -> Subject object
            rows = list(reader)

            for row_idx, row in enumerate(rows, start=2): # record 1 is header
                try:
                    # Clean the row data
                    row = {k.strip(): (v.strip() if v else '') for k, v in row.items() if k}
                    
                    program_code = row.get('Program')
                    if not program_code: continue
                        
                    # Get or Create Program
                    program, p_created = Program.objects.get_or_create(
                        code=program_code,
                        defaults={'name': f"Program {program_code}"}
                    )
                    if p_created: programs_created += 1
                    
                    # Get or Create Curriculum Version
                    curriculum, c_created = CurriculumVersion.objects.get_or_create(
                        program=program,
                        version_name='V1'
                    )
                    if c_created: curriculums_created += 1
                    
                    # Parse Year & Semester
                    yr_sem = row.get('Year_Semester', '')
                    year_level = 1
                    semester = '1'
                    
                    if 'Summer' in yr_sem:
                        semester = 'S'
                    else:
                        if '1st Year' in yr_sem: year_level = 1
                        elif '2nd Year' in yr_sem: year_level = 2
                        elif '3rd Year' in yr_sem: year_level = 3
                        elif '4th Year' in yr_sem: year_level = 4
                        
                        if '1st Semester' in yr_sem: semester = '1'
                        elif '2nd Semester' in yr_sem: semester = '2'
                    
                    # Subject setup
                    subject_code = row.get('Program_Code', '')
                    if not subject_code: continue
                        
                    lec_units = int(row.get('Lec_Units') or 0)
                    lab_units = int(row.get('Lab_Units') or 0) 
                    total_units = int(row.get('Total_Units') or 0)
                    
                    subject, _ = Subject.objects.update_or_create(
                        curriculum=curriculum,
                        code=subject_code,
                        defaults={
                            'description': row.get('Subject_Description', ''),
                            'year_level': year_level,
                            'semester': semester,
                            'lec_units': lec_units,
                            'lab_units': lab_units,
                            'total_units': total_units,
                        }
                    )
                    subject_map[(curriculum.id, subject_code)] = subject
                    subjects_processed += 1
                    
                except Exception as e:
                    errors.append(f"Row {row_idx} error: {str(e)}")

            # 2. Second pass: Handle Prerequisites
            # We do this after all subjects are created so we can link them
            for row in rows:
                try:
                    row = {k.strip(): (v.strip() if v else '') for k, v in row.items() if k}
                    prereq_str = row.get('Prerequisites', '')
                    if not prereq_str or prereq_str.lower() in ['none', 'n/a', '-']:
                        continue
                    
                    program_code = row.get('Program')
                    subject_code = row.get('Program_Code')
                    
                    # Find the subject (should be in map now)
                    # We need the curriculum to be specific
                    program = Program.objects.get(code=program_code)
                    curriculum = CurriculumVersion.objects.get(program=program, version_name='V1')
                    subject = subject_map.get((curriculum.id, subject_code))
                    
                    if not subject: continue

                    # Split prerequisites by comma or semicolon
                    import re
                    prereq_codes = [p.strip() for p in re.split(r'[,;]', prereq_str) if p.strip()]
                    
                    for p_code in prereq_codes:
                        # Try to find the prerequisite subject in the SAME curriculum
                        p_subject = Subject.objects.filter(curriculum=curriculum, code=p_code).first()
                        
                        if p_subject:
                            SubjectPrerequisite.objects.get_or_create(
                                subject=subject,
                                prerequisite_type='SPECIFIC',
                                prerequisite_subject=p_subject
                            )
                        else:
                            # If not found as a subject code, it might be a description like "2nd Year Standing"
                            if 'Year Standing' in p_code:
                                match = re.search(r'(\d)', p_code)
                                if match:
                                    SubjectPrerequisite.objects.get_or_create(
                                        subject=subject,
                                        prerequisite_type='YEAR_STANDING',
                                        standing_year=int(match.group(1))
                                    )
                except Exception:
                    pass # Ignore prerequisite errors to not fail the whole import

            return Response({
                'message': 'Upload completed.',
                'stats': {
                    'programs_created': programs_created,
                    'curriculums_created': curriculums_created,
                    'subjects_processed': subjects_processed,
                },
                'errors': errors
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SubjectPrerequisiteViewSet(viewsets.ModelViewSet):
    queryset = SubjectPrerequisite.objects.all()
    serializer_class = SubjectPrerequisiteSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['subject', 'prerequisite_type']
