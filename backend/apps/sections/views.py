from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.sections.models import Section, SectionStudent
from apps.sections.serializers import SectionSerializer, SectionStudentSerializer
from apps.sections.services.sectioning_service import SectioningService
from apps.terms.models import Term
from apps.academics.models import Program
from apps.students.models import Student

class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all().order_by('program__code', 'year_level', 'section_number')
    serializer_class = SectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'generate', 'transfer']:
            from core.permissions import IsRegistrar
            return [IsRegistrar()]
        return super().get_permissions()

    service = SectioningService()

    def get_queryset(self):
        queryset = Section.objects.all()
        term_id = self.request.query_params.get('term_id')
        program_id = self.request.query_params.get('program_id')
        year_level = self.request.query_params.get('year_level')
        subject_id = self.request.query_params.get('subject_id')

        if term_id:
            queryset = queryset.filter(term_id=term_id)
        if program_id:
            queryset = queryset.filter(program_id=program_id)
        if year_level:
            queryset = queryset.filter(year_level=year_level)
        if subject_id:
            queryset = queryset.filter(schedules__subject_id=subject_id).distinct()
            
        return queryset

    @action(detail=False, methods=['GET'], url_path='stats')
    def stats(self, request):
        """
        Returns enrollment stats for the Registrar's matrix.
        """
        term_id = request.query_params.get('term_id')
        if not term_id:
            return Response({"error": "term_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            term = Term.objects.get(id=term_id)
            stats = self.service.get_enrollment_stats(term)
            return Response(stats)
        except Term.DoesNotExist:
            return Response({"error": "Term not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['POST'], url_path='generate')
    def generate(self, request):
        """
        Auto-generates sections for a specific program and year level.
        """
        term_id = request.data.get('term_id')
        program_id = request.data.get('program_id')
        year_level = request.data.get('year_level')
        
        if not all([term_id, program_id, year_level]):
            return Response({"error": "term_id, program_id, and year_level are required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
            
        try:
            term = Term.objects.get(id=term_id)
            program = Program.objects.get(id=program_id)
            auto_schedule = request.data.get('auto_schedule', False)
            
            sections = self.service.generate_sections(term, program, int(year_level), auto_schedule=auto_schedule)
            serializer = self.get_serializer(sections, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['POST'], url_path='transfer')
    def transfer(self, request, pk=None):
        """
        Manually transfers a student to this section.
        """
        section = self.get_object()
        student_id = request.data.get('student_id')
        term_id = request.data.get('term_id')
        override = request.data.get('override', False)
        
        if not all([student_id, term_id]):
            return Response({"error": "student_id and term_id are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            student = Student.objects.get(id=student_id)
            term = Term.objects.get(id=term_id)
            
            count = self.service.manual_transfer_student(student, section, term, override_capacity=override)
            return Response({
                "message": f"Successfully transferred student to {section.name}.",
                "updated_records": count
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['GET'])
    def roster(self, request, pk=None):
        """
        Returns the list of students assigned to this section.
        """
        section = self.get_object()
        assignments = SectionStudent.objects.filter(section=section)
        serializer = SectionStudentSerializer(assignments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'], url_path='my-sections')
    def my_sections(self, request):
        """
        Returns sections and subjects assigned to the logged-in professor.
        """
        if not hasattr(request.user, 'professor_profile'):
            return Response({"error": "User does not have a professor profile."}, status=status.HTTP_400_BAD_REQUEST)
        
        professor = request.user.professor_profile
        active_term = Term.objects.filter(is_active=True).first()
        
        if not active_term:
            return Response({"error": "No active term found."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.scheduling.models import Schedule
        # Get unique (section, subject) pairs from schedules assigned to this professor
        schedules = Schedule.objects.filter(
            professor=professor,
            term=active_term
        ).select_related('section', 'subject')

        results = []
        seen_pairs = set()
        
        for sched in schedules:
            pair = (sched.section_id, sched.subject_id)
            if pair not in seen_pairs:
                results.append({
                    "section": {
                        "id": sched.section.id,
                        "name": sched.section.name,
                    },
                    "subject": {
                        "id": sched.subject.id,
                        "code": sched.subject.code,
                        "name": sched.subject.name,
                    }
                })
                seen_pairs.add(pair)
                
        return Response(results)
