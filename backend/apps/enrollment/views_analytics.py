"""
Role-based report views — analytics endpoints for admissions, payments, and enrollment.
"""

from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Count, Sum, Q, F, Value, CharField
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.core.permissions import IsRegistrar, IsAdmin
from apps.enrollment.models import Enrollment, SubjectEnrollment, Semester


class AdmissionStatsView(APIView):
    """
    Admission statistics — applicant counts by status, conversion rates.
    Role: Registrar, Admin
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        semester_id = request.query_params.get('semester')

        qs = Enrollment.objects.all()
        if semester_id:
            qs = qs.filter(semester_id=semester_id)
        else:
            current = Semester.objects.filter(is_current=True).first()
            if current:
                qs = qs.filter(semester=current)

        # Counts by status
        status_counts = dict(
            qs.values('status').annotate(count=Count('id')).values_list('status', 'count')
        )

        total = sum(status_counts.values())
        active = status_counts.get('ACTIVE', 0)
        pending = status_counts.get('PENDING', 0)
        pending_admission = status_counts.get('PENDING_ADMISSION', 0)
        rejected = status_counts.get('REJECTED', 0)
        admitted = status_counts.get('ADMITTED', 0)

        # Conversion rate
        conversion_rate = (
            round((active + admitted) / total * 100, 1) if total > 0 else 0
        )

        # Enrollments by program
        by_program = list(
            qs.filter(status__in=['ACTIVE', 'ADMITTED', 'COMPLETED'])
            .values(
                program_code=F('student__student_profile__program__code'),
                program_name=F('student__student_profile__program__name'),
            )
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Enrollments by created_via
        by_source = dict(
            qs.values('created_via').annotate(count=Count('id')).values_list('created_via', 'count')
        )

        return Response({
            'total_applicants': total,
            'status_breakdown': status_counts,
            'active': active,
            'pending': pending,
            'pending_admission': pending_admission,
            'rejected': rejected,
            'admitted': admitted,
            'conversion_rate': conversion_rate,
            'by_program': by_program,
            'by_source': by_source,
        })


class PaymentReportView(APIView):
    """
    Payment & cashier reports — revenue, balances, promissory note stats.
    Role: Cashier, Registrar, Admin
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        semester_id = request.query_params.get('semester')

        enrollments = Enrollment.objects.all()
        if semester_id:
            enrollments = enrollments.filter(semester_id=semester_id)
        else:
            current = Semester.objects.filter(is_current=True).first()
            if current:
                enrollments = enrollments.filter(semester=current)

        # Only active enrollments
        active_enrollments = enrollments.filter(
            status__in=['ACTIVE', 'ADMITTED', 'COMPLETED', 'PENDING_PAYMENT']
        )

        # Payment aggregates from MonthlyPaymentBucket
        from apps.enrollment.models import MonthlyPaymentBucket
        buckets = MonthlyPaymentBucket.objects.filter(
            enrollment__in=active_enrollments
        )

        total_required = buckets.aggregate(
            total=Coalesce(Sum('required_amount'), Decimal('0.00'))
        )['total']
        total_paid = buckets.aggregate(
            total=Coalesce(Sum('paid_amount'), Decimal('0.00'))
        )['total']
        outstanding = total_required - total_paid

        fully_paid_count = active_enrollments.filter(first_month_paid=True).count()
        not_paid_count = active_enrollments.filter(first_month_paid=False).count()

        # Promissory note stats
        from apps.enrollment.models_payments import PromissoryNote
        pn_qs = PromissoryNote.objects.filter(
            enrollment__in=active_enrollments
        )
        pn_stats = pn_qs.values('status').annotate(count=Count('id'))
        pn_total_amount = pn_qs.filter(
            status__in=['ACTIVE', 'PARTIALLY_PAID']
        ).aggregate(total=Coalesce(Sum('total_amount'), Decimal('0.00')))['total']
        pn_total_paid = pn_qs.filter(
            status__in=['ACTIVE', 'PARTIALLY_PAID']
        ).aggregate(total=Coalesce(Sum('amount_paid'), Decimal('0.00')))['total']

        today = timezone.now().date()
        overdue_count = pn_qs.filter(
            status__in=['ACTIVE', 'PARTIALLY_PAID'],
            due_date__lt=today,
        ).count()

        return Response({
            'total_required': str(total_required),
            'total_paid': str(total_paid),
            'outstanding_balance': str(outstanding),
            'collection_rate': round(
                float(total_paid) / float(total_required) * 100, 1
            ) if total_required > 0 else 0,
            'students_paid_first_month': fully_paid_count,
            'students_not_paid_first_month': not_paid_count,
            'promissory_notes': {
                'status_breakdown': {
                    item['status']: item['count'] for item in pn_stats
                },
                'total_amount_outstanding': str(pn_total_amount),
                'total_amount_paid': str(pn_total_paid),
                'overdue_count': overdue_count,
            }
        })


class DepartmentEnrollmentStatsView(APIView):
    """
    Departmental enrollment stats per program, year level, and section.
    Role: Department Head, Registrar, Admin
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        semester_id = request.query_params.get('semester')
        program_id = request.query_params.get('program')

        qs = Enrollment.objects.filter(
            status__in=['ACTIVE', 'ADMITTED', 'COMPLETED']
        ).select_related(
            'student__student_profile__program',
            'student__student_profile__home_section'
        )

        if semester_id:
            qs = qs.filter(semester_id=semester_id)
        else:
            current = Semester.objects.filter(is_current=True).first()
            if current:
                qs = qs.filter(semester=current)

        if program_id:
            qs = qs.filter(student__student_profile__program_id=program_id)

        # By program
        by_program = list(
            qs.values(
                program_code=F('student__student_profile__program__code'),
                program_name=F('student__student_profile__program__name'),
            ).annotate(count=Count('id')).order_by('-count')
        )

        # By year level
        by_year = list(
            qs.values(
                year_level=F('student__student_profile__year_level'),
            ).annotate(count=Count('id')).order_by('year_level')
        )

        # By section (top 20)
        by_section = list(
            qs.filter(
                student__student_profile__home_section__isnull=False,
            ).values(
                section_name=F('student__student_profile__home_section__name'),
                program_code=F('student__student_profile__program__code'),
            ).annotate(count=Count('id')).order_by('-count')[:20]
        )

        # Total counts
        total = qs.count()
        regular = qs.filter(student__student_profile__is_irregular=False).count()
        irregular = qs.filter(student__student_profile__is_irregular=True).count()
        transferees = qs.filter(student__student_profile__is_transferee=True).count()

        return Response({
            'total_enrolled': total,
            'regular_count': regular,
            'irregular_count': irregular,
            'transferee_count': transferees,
            'by_program': by_program,
            'by_year_level': by_year,
            'by_section': by_section,
        })
