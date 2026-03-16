from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Sum
from apps.students.models import Student, StudentEnrollment
from apps.academics.models import Program, Subject
from apps.grades.models import Grade
from apps.facilities.models import Room
from apps.faculty.models import Professor
from apps.finance.models import Payment
from apps.notifications.models import Notification
from apps.auditing.models import AuditLog
from .services.report_service import ReportService

class ReportViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == 'masterlist':
            from core.permissions import IsRegistrar
            return [IsRegistrar()]
        if self.action in ['cor', 'academic_summary']:
            from core.permissions import IsRegistrar, IsStudent, IsAdmission
            # Using class-based OR composition then instantiating
            return [(IsRegistrar | IsStudent | IsAdmission)()]
        return super().get_permissions()

    @action(detail=False, methods=['get'])
    def masterlist(self, request):
        term_id = request.query_params.get('term_id')
        program_id = request.query_params.get('program_id')
        year_level = request.query_params.get('year_level')

        if not term_id:
            return Response({"error": "term_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            excel_data = ReportService.generate_masterlist_excel(term_id, program_id, year_level)
            response = HttpResponse(
                excel_data.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="masterlist.xlsx"'
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def cor(self, request):
        student_id = request.query_params.get('student_id')
        term_id = request.query_params.get('term_id')

        # Allow students to get their own COR, or Registrar to get any
        user = request.user
        if not student_id:
            if user.role == 'STUDENT':
                student_id = user.student_profile.id
            else:
                return Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if user.role == 'STUDENT' and str(user.student_profile.id) != str(student_id):
                return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            # Ensure student_id is integer if provided
            try:
                student_id = int(student_id)
            except (ValueError, TypeError):
                return Response({"error": "Invalid student_id format"}, status=status.HTTP_400_BAD_REQUEST)

        if not term_id:
            return Response({"error": "term_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pdf_data = ReportService.generate_cor_pdf(student_id, term_id)
            response = HttpResponse(pdf_data.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="COR_{student_id}.pdf"'
            return response
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='academic-summary')
    def academic_summary(self, request):
        student_id = request.query_params.get('student_id')
        user = request.user

        if not student_id:
            if user.role == 'STUDENT':
                student_id = user.student_profile.id
            else:
                return Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            student = Student.objects.select_related('user', 'program', 'curriculum').get(id=student_id)
            latest_enrollment = student.enrollments.order_by('-enrollment_date').first()
            
            # 1. Basic Stats
            all_grades = Grade.objects.filter(student=student).select_related('subject', 'term')
            passed_grades = all_grades.filter(grade_status='PASSED')
            failed_grades = all_grades.filter(grade_status='FAILED')
            
            total_units_earned = passed_grades.aggregate(total=Sum('subject__total_units'))['total'] or 0
            
            # Calculate GPA (only for numeric grades)
            numeric_grades = all_grades.filter(final_grade__isnull=False)
            total_grade_points = sum(g.final_grade * g.subject.total_units for g in numeric_grades)
            total_gpa_units = sum(g.subject.total_units for g in numeric_grades)
            current_gpa = round(total_grade_points / total_gpa_units, 2) if total_gpa_units > 0 else 0
            
            # 2. Complete Curriculum Summary (Merged with Grades)
            semesters_data = []
            curriculum_subjects = Subject.objects.filter(curriculum=student.curriculum).order_by('year_level', 'semester', 'code')
            
            # Map existing grades for quick lookup
            grade_map = {g.subject_id: g for g in all_grades}
            
            # Group curriculum subjects by year and semester
            curriculum_groups = {}
            for s in curriculum_subjects:
                key = (s.year_level, s.semester)
                if key not in curriculum_groups:
                    curriculum_groups[key] = []
                curriculum_groups[key].append(s)
            
            # Process each group (Year X - Semester Y)
            for (year, sem_code), subjects in sorted(curriculum_groups.items()):
                sem_grades = []
                s_grade_points = 0
                s_gpa_units = 0
                s_total_units = 0
                
                # Format semester display name
                sem_display = "First Semester" if sem_code == '1' else "Second Semester" if sem_code == '2' else "Summer" if sem_code == 'S' else f"Semester {sem_code}"
                
                for s in subjects:
                    g = grade_map.get(s.id)
                    s_total_units += s.total_units
                    
                    if g:
                        sem_grades.append({
                            "code": s.code,
                            "subject": s.description,
                            "units": s.total_units,
                            "grade": str(g.final_grade) if g.final_grade else g.get_grade_status_display(),
                            "status": g.get_grade_status_display(),
                            "status_code": g.grade_status,
                            "term_code": g.term.code if g.term else "N/A"
                        })
                        if g.final_grade:
                            s_grade_points += g.final_grade * s.total_units
                            s_gpa_units += s.total_units
                    else:
                        sem_grades.append({
                            "code": s.code,
                            "subject": s.description,
                            "units": s.total_units,
                            "grade": "--",
                            "status": "Not Taken",
                            "status_code": "NOT_TAKEN",
                            "term_code": "--"
                        })

                semesters_data.append({
                    "year_level": year,
                    "semester_code": sem_code,
                    "title": f"Year {year} - {sem_display}",
                    "grades": sem_grades,
                    "gpa": round(s_grade_points / s_gpa_units, 2) if s_gpa_units > 0 else 0,
                    "total_units": s_total_units
                })

            # 3. Curriculum Progress
            progress = []
            curriculum_subjects = Subject.objects.filter(curriculum=student.curriculum)
            for year in range(1, 6): # Assuming up to 5 years
                year_subjects = curriculum_subjects.filter(year_level=year)
                if not year_subjects.exists(): continue
                
                total_year_units = year_subjects.aggregate(total=Sum('total_units'))['total'] or 0
                passed_year_ids = passed_grades.filter(subject__in=year_subjects).values_list('subject_id', flat=True)
                earned_year_units = Subject.objects.filter(id__in=passed_year_ids).aggregate(total=Sum('total_units'))['total'] or 0
                
                percentage = round((earned_year_units / total_year_units) * 100) if total_year_units > 0 else 0
                progress.append({
                    "year": year,
                    "percentage": percentage
                })

            return Response({
                "student": {
                    "name": student.user.get_full_name(),
                    "idn": student.idn,
                    "program": student.program.name,
                    "year_level": latest_enrollment.year_level if latest_enrollment else 1,
                    "status": "Regular" if latest_enrollment and latest_enrollment.is_regular else "Irregular",
                    "academic_standing": "Good Standing", # Needs logic if you have probation rules
                    "total_units_earned": total_units_earned
                },
                "stats": {
                    "total_units_earned": total_units_earned,
                    "current_gpa": current_gpa,
                    "subjects_passed": passed_grades.count(),
                    "subjects_failed": failed_grades.count()
                },
                "semesters": semesters_data,
                "curriculum_progress": progress
            })

        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='graduation-check')
    def graduation_check(self, request):
        student_id = request.query_params.get('student_id')
        if not student_id:
             return Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            result = ReportService.graduation_check(student_id)
            return Response(result)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        user = request.user
        role = user.role
        data = {}

        if role == 'ADMIN':
            data = {
                "programs": Program.objects.count(),
                "subjects": Subject.objects.count(),
                "professors": Professor.objects.count(),
                "rooms": Room.objects.count(),
                "audit_count": AuditLog.objects.count()
            }
        elif role == 'REGISTRAR':
            data = {
                "pending_docs": Student.objects.filter(status='APPLICANT').count(),
                "pending_grades": StudentEnrollment.objects.filter(advising_status='PENDING').count(),
                "total_students": Student.objects.count(),
                "sections": 0  # TODO: add section count
            }
        elif role == 'CASHIER':
            from django.utils import timezone
            today = timezone.now().date()
            data = {
                "today_collections": Payment.objects.filter(created_at__date=today).aggregate(Sum('amount'))['amount__sum'] or 0,
                "monthly_total": Payment.objects.filter(created_at__month=today.month).aggregate(Sum('amount'))['amount__sum'] or 0,
                "pending_promissories": Payment.objects.filter(is_promissory=True).count()
            }
        elif role == 'STUDENT':
             # Simple dashboard stats for student
             student = getattr(user, 'student_profile', None)
             if student:
                 data = {
                     "enrolled_units": 0, # Calculate based on enrollment
                     "gpa": 0.0,
                     "notifications": Notification.objects.filter(recipient=user, is_read=False).count()
                 }
        
        return Response(data)
