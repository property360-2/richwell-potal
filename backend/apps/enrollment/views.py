# ============================================================
# Report Views (EPIC 13)
# ============================================================

class HeadReportView(APIView):
    """
    Generate reports for department heads.
    Supports enrollment lists and grade summaries.
    """
    permission_classes = [IsAuthenticated, IsDepartmentHead | IsRegistrar | IsAdmin]

    @extend_schema(
        summary="Generate Report",
        description="Generate enrollment or grade reports with filters",
        tags=["Reports"],
        parameters=[
            OpenApiParameter('type', str, description='Report type: enrollment, grades', required=True),
            OpenApiParameter('semester', str, description='Semester ID'),
            OpenApiParameter('program', str, description='Program ID'),
            OpenApiParameter('date_from', str, description='Start date (YYYY-MM-DD)'),
            OpenApiParameter('date_to', str, description='End date (YYYY-MM-DD)'),
        ]
    )
    def get(self, request):
        report_type = request.query_params.get('type')
        semester_id = request.query_params.get('semester')
        program_id = request.query_params.get('program')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not report_type:
            return Response({"error": "Report type is required"}, status=400)

        # Base queryset for enrollment
        queryset = Enrollment.objects.select_related(
            'student', 'student__student_profile', 'semester', 'student__student_profile__program'
        ).filter(status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED])

        # Apply filters
        if semester_id:
            queryset = queryset.filter(semester_id=semester_id)
        
        if program_id:
            queryset = queryset.filter(student__student_profile__program_id=program_id)
            
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
            
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        # Generate Report Data
        data = []
        
        if report_type == 'enrollment':
            # Enrollment List Report
            enrollments = queryset.prefetch_related('subject_enrollments')
            
            for enrollment in enrollments:
                profile = enrollment.student.student_profile
                total_units = sum(
                    se.subject.units for se in enrollment.subject_enrollments.all()
                    if se.status == SubjectEnrollment.Status.ENROLLED
                )
                
                data.append({
                    'student_number': enrollment.student.student_number,
                    'student_name': enrollment.student.get_full_name(),
                    'program_code': profile.program.code if profile and profile.program else 'N/A',
                    'year_level': profile.year_level if profile else 'N/A',
                    'status': enrollment.get_status_display(),
                    'total_units': total_units,
                    'date_enrolled': enrollment.created_at.date()
                })

        elif report_type == 'grades':
            # Grade Summary Report
            # Requires iterating through subject enrollments
            subject_enrollments = SubjectEnrollment.objects.filter(
                enrollment__in=queryset
            ).select_related('subject', 'enrollment__student')
            
            for se in subject_enrollments:
                data.append({
                    'student_number': se.enrollment.student.student_number,
                    'student_name': se.enrollment.student.get_full_name(),
                    'subject_code': se.subject.code,
                    'subject_title': se.subject.title,
                    'grade': str(se.grade) if se.grade else 'N/A',
                    'status': se.get_status_display(),
                    'units': se.subject.units
                })

        else:
            return Response({"error": "Invalid report type"}, status=400)

        return Response({
            "success": True,
            "type": report_type,
            "count": len(data),
            "results": data
        })