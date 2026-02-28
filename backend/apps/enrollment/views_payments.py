"""
Payment views — cashier and payment-related endpoints.
Handles payment recording, adjustments, transaction listing, student search, and SOA.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from apps.accounts.models import User


class PaymentRecordView(APIView):
    """
    Record a payment for an enrollment.
    Allocates amount to monthly buckets and updates status.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        from apps.enrollment.serializers import PaymentRecordSerializer, PaymentTransactionSerializer
        from apps.enrollment.models import Enrollment, PaymentTransaction, MonthlyPaymentBucket
        from django.db import transaction
        import uuid
        from datetime import datetime
        
        serializer = PaymentRecordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        enrollment_id = serializer.validated_data['enrollment_id']
        amount = serializer.validated_data['amount']
        payment_mode = serializer.validated_data['payment_mode']
        reference_number = serializer.validated_data.get('reference_number', '')
        notes = serializer.validated_data.get('notes', '')
        
        try:
            from apps.enrollment.services import PaymentService
            
            txn = PaymentService.record_payment(
                enrollment=Enrollment.objects.get(id=enrollment_id),
                amount=amount,
                payment_mode=payment_mode,
                cashier=request.user,
                reference_number=reference_number,
                notes=notes
            )
            
            return Response({
                "success": True,
                "message": "Payment recorded successfully",
                "data": PaymentTransactionSerializer(txn).data
            }, status=201)
                
        except Enrollment.DoesNotExist:
            return Response({"error": "Enrollment not found"}, status=404)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)


class PaymentAdjustmentView(APIView):
    """
    Create a payment adjustment transaction.
    Used by cashiers to correct errors, apply refunds, or make manual adjustments.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        from apps.enrollment.models import Enrollment, PaymentTransaction
        from decimal import Decimal, InvalidOperation
        from datetime import datetime
        import uuid

        user = request.user
        if user.role not in ['CASHIER', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return Response({"error": "Permission denied"}, status=403)

        enrollment_id = request.data.get('enrollment_id')
        amount = request.data.get('amount')
        adjustment_reason = request.data.get('adjustment_reason', '')
        original_transaction_id = request.data.get('original_transaction_id')
        payment_mode = request.data.get('payment_mode', 'CASH')

        if not enrollment_id:
            return Response({"error": "Enrollment ID is required"}, status=400)
        if not amount:
            return Response({"error": "Adjustment amount is required"}, status=400)
        if not adjustment_reason or len(adjustment_reason.strip()) < 5:
            return Response({"error": "Adjustment reason is required (min 5 characters)"}, status=400)

        try:
            amount = Decimal(str(amount))
        except (InvalidOperation, ValueError):
            return Response({"error": "Invalid amount format"}, status=400)

        if amount == 0:
            return Response({"error": "Adjustment amount cannot be zero"}, status=400)

        try:
            enrollment = Enrollment.objects.get(id=enrollment_id)
        except Enrollment.DoesNotExist:
            return Response({"error": "Enrollment not found"}, status=404)

        original_txn = None
        if original_transaction_id:
            try:
                original_txn = PaymentTransaction.objects.get(id=original_transaction_id)
            except PaymentTransaction.DoesNotExist:
                return Response({"error": "Original transaction not found"}, status=404)

        now = datetime.now()
        random_suffix = str(uuid.uuid4())[:5].upper()
        receipt_number = f"ADJ-{now.strftime('%Y%m%d')}-{random_suffix}"

        while PaymentTransaction.objects.filter(receipt_number=receipt_number).exists():
            random_suffix = str(uuid.uuid4())[:5].upper()
            receipt_number = f"ADJ-{now.strftime('%Y%m%d')}-{random_suffix}"

        transaction = PaymentTransaction.objects.create(
            enrollment=enrollment,
            amount=abs(amount),
            payment_mode=payment_mode,
            receipt_number=receipt_number,
            is_adjustment=True,
            adjustment_reason=adjustment_reason.strip(),
            original_transaction=original_txn,
            processed_by=user,
            notes=f"Adjustment: {adjustment_reason.strip()}"
        )

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.PAYMENT_ADJUSTED,
            target_model='PaymentTransaction',
            target_id=transaction.id,
            payload={
                'amount': str(transaction.amount),
                'reason': transaction.adjustment_reason,
                'student': enrollment.student.get_full_name(),
                'original_receipt': original_txn.receipt_number if original_txn else None
            }
        )

        return Response({
            "success": True,
            "data": {
                "id": str(transaction.id),
                "receipt_number": transaction.receipt_number,
                "amount": str(transaction.amount),
                "adjustment_reason": transaction.adjustment_reason,
                "payment_mode": transaction.payment_mode,
                "processed_by": user.get_full_name(),
                "processed_at": transaction.processed_at.isoformat() if transaction.processed_at else None,
                "original_receipt": original_txn.receipt_number if original_txn else None,
            }
        }, status=201)


class PaymentTransactionListView(APIView):
    """
    List all payment transactions with filtering and pagination.
    For admin/registrar oversight of all financial transactions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import PaymentTransaction

        user = request.user
        if user.role not in ['ADMIN', 'CASHIER', 'REGISTRAR', 'HEAD_REGISTRAR']:
            return Response({"error": "Permission denied"}, status=403)

        qs = PaymentTransaction.objects.select_related(
            'enrollment', 'enrollment__student', 'processed_by'
        ).order_by('-processed_at')

        search = request.query_params.get('search', '')
        if search:
            qs = qs.filter(
                Q(receipt_number__icontains=search) |
                Q(enrollment__student__first_name__icontains=search) |
                Q(enrollment__student__last_name__icontains=search) |
                Q(enrollment__student__student_number__icontains=search)
            )

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(processed_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(processed_at__date__lte=date_to)

        mode = request.query_params.get('payment_mode')
        if mode:
            qs = qs.filter(payment_mode=mode)

        txn_type = request.query_params.get('type')
        if txn_type == 'adjustment':
            qs = qs.filter(is_adjustment=True)
        elif txn_type == 'regular':
            qs = qs.filter(is_adjustment=False)

        page = int(request.query_params.get('page', 1))
        per_page = 25
        total = qs.count()
        start = (page - 1) * per_page
        end = start + per_page
        transactions = qs[start:end]

        results = []
        for txn in transactions:
            student = txn.enrollment.student if txn.enrollment else None
            results.append({
                'id': str(txn.id),
                'receipt_number': txn.receipt_number,
                'amount': str(txn.amount),
                'payment_mode': txn.payment_mode,
                'is_adjustment': txn.is_adjustment,
                'adjustment_reason': txn.adjustment_reason or '',
                'student_name': student.get_full_name() if student else 'Unknown',
                'student_number': student.student_number if student else 'N/A',
                'processed_by': txn.processed_by.get_full_name() if txn.processed_by else 'System',
                'processed_at': txn.processed_at.isoformat() if txn.processed_at else None,
                'notes': txn.notes or '',
                'original_receipt': txn.original_transaction.receipt_number if txn.original_transaction else None,
            })

        return Response({
            'results': results,
            'count': total,
            'next': page * per_page < total,
            'previous': page > 1,
        })


class StudentPaymentHistoryView(APIView):
    """
    Get payment history for a specific enrollment.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, enrollment_id, *args, **kwargs):
        from apps.enrollment.models import PaymentTransaction
        from apps.enrollment.serializers import PaymentTransactionSerializer
        
        transactions = PaymentTransaction.objects.filter(
            enrollment_id=enrollment_id
        ).select_related('processed_by').order_by('-processed_at')
        
        serializer = PaymentTransactionSerializer(transactions, many=True)
        return Response({
            "success": True,
            "results": serializer.data
        })


class CashierStudentSearchView(APIView):
    """
    Search for students for cashier/registrar.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import Enrollment, Semester, MonthlyPaymentBucket
        from apps.enrollment.serializers import MonthlyPaymentBucketSerializer
        
        query = request.query_params.get('q', '')
        active_semester = Semester.objects.filter(is_current=True).first()
        
        students = User.objects.filter(role='STUDENT').select_related('student_profile', 'student_profile__program')
        
        if query:
            students = students.filter(
                Q(student_number__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(email__icontains=query)
            )
            
        students = students[:50]
        
        data = []
        for s in students:
            enrollment = None
            if active_semester:
                enrollment = s.enrollments.filter(semester=active_semester).first()
            
            if not enrollment:
                enrollment = s.enrollments.order_by('-created_at').first()
            
            profile = getattr(s, 'student_profile', None)
            program_code = profile.program.code if profile and profile.program else 'N/A'
            
            payload = {
                'id': str(s.id),
                'student_number': s.student_number,
                'first_name': s.first_name,
                'last_name': s.last_name,
                'student_name': s.get_full_name(),
                'email': s.email,
                'program_code': program_code,
                'year_level': profile.year_level if profile else 1,
                'enrollment_id': str(enrollment.id) if enrollment else None,
                'enrollment_status': enrollment.status if enrollment else 'UNENROLLED',
                'payment_buckets': [],
                'total_balance': 0.0,
                'balance': '0.00'
            }

            if enrollment:
                buckets = list(enrollment.payment_buckets.all().order_by('month_number'))
                bucket_serializer = MonthlyPaymentBucketSerializer(buckets, many=True)
                payload['payment_buckets'] = bucket_serializer.data
                
                total_balance = sum(
                    max(float(b.required_amount) - float(b.paid_amount), 0)
                    for b in buckets
                )
                payload['total_balance'] = round(total_balance, 2)
                payload['balance'] = str(payload['total_balance'])
                payload['monthly_commitment'] = str(enrollment.monthly_commitment)

            data.append(payload)
            
        return Response(data)


class CashierPendingPaymentsView(APIView):
    """
    List all students with any outstanding balance (any unpaid month bucket).
    Includes both PENDING and ACTIVE enrollments.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import Enrollment, Semester, MonthlyPaymentBucket
        from django.db.models import Sum, F
        
        active_semester = Semester.objects.filter(is_current=True).first()
        if not active_semester:
            return Response([])

        enrollments_with_balance = Enrollment.objects.filter(
            semester=active_semester,
            status__in=['PENDING', 'ACTIVE'],
            payment_buckets__paid_amount__lt=F('payment_buckets__required_amount')
        ).distinct().select_related(
            'student', 'student__student_profile__program'
        ).order_by('student__last_name')

        from apps.enrollment.serializers import MonthlyPaymentBucketSerializer
        data = []
        for e in enrollments_with_balance:
            profile = getattr(e.student, 'student_profile', None)
            buckets = list(e.payment_buckets.all().order_by('month_number'))
            bucket_serializer = MonthlyPaymentBucketSerializer(buckets, many=True)

            total_balance = sum(
                max(float(b.required_amount) - float(b.paid_amount), 0)
                for b in buckets
            )
            
            if total_balance <= 0:
                continue

            next_unpaid = next(
                (b for b in buckets if float(b.paid_amount) < float(b.required_amount)),
                None
            )

            data.append({
                'id': str(e.id),
                'enrollment_id': str(e.id),
                'student_id': str(e.student.id),
                'student_number': e.student.student_number,
                'first_name': e.student.first_name,
                'last_name': e.student.last_name,
                'student_name': e.student.get_full_name(),
                'program_code': profile.program.code if profile and profile.program else 'N/A',
                'year_level': profile.year_level if profile else 1,
                'enrollment_status': e.status,
                'monthly_commitment': str(e.monthly_commitment),
                'total_balance': round(total_balance, 2),
                'next_unpaid_month': next_unpaid.month_number if next_unpaid else None,
                'payment_buckets': bucket_serializer.data,
                'created_at': e.created_at
            })
        
        data.sort(key=lambda x: x['total_balance'], reverse=True)
        return Response(data)


class CashierTodayTransactionsView(APIView):
    """
    List all collections processed today.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import PaymentTransaction, Enrollment, Semester
        from apps.enrollment.serializers import PaymentTransactionSerializer
        from django.utils import timezone
        from django.db.models import Sum, Count
        
        today = timezone.localtime().date()
        transactions = PaymentTransaction.objects.filter(
            processed_at__date=today
        ).select_related('enrollment__student', 'processed_by').order_by('-processed_at')
        
        total_collection = transactions.aggregate(total=Sum('amount'))['total'] or 0
        transactions_count = transactions.count()
        avg_collection = float(total_collection) / transactions_count if transactions_count > 0 else 0
        
        active_semester = Semester.objects.filter(is_current=True).first()
        pending_count = 0
        target_percentage = 0
        
        if active_semester:
            pending_count = Enrollment.objects.filter(
                semester=active_semester,
                status='PENDING',
                first_month_paid=False
            ).count()
            
            from apps.enrollment.models import MonthlyPaymentBucket
            bucket_qs = MonthlyPaymentBucket.objects.filter(
                enrollment__semester=active_semester
            )
            total_receivable = bucket_qs.aggregate(total=Sum('required_amount'))['total'] or 1
            total_paid = bucket_qs.aggregate(total=Sum('paid_amount'))['total'] or 0
            
            target_percentage = (float(total_paid) / float(total_receivable)) * 100

        serializer = PaymentTransactionSerializer(transactions, many=True)
        return Response({
            "success": True,
            "results": serializer.data,
            "stats": {
                "today_total": float(total_collection),
                "today_count": transactions_count,
                "avg_collection": avg_collection,
                "pending_enrollees": pending_count,
                "collection_target": f"{min(100, round(target_percentage, 1))}%"
            }
        })


class MyPaymentsView(APIView):
    """
    Get financial statement (SOA) for the logged-in student.
    Returns payment buckets and recent transactions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from .models import Enrollment, Semester, MonthlyPaymentBucket, PaymentTransaction
        from .serializers import MonthlyPaymentBucketSerializer, PaymentTransactionSerializer
        
        active_semester = Semester.objects.filter(is_current=True).first()
        if not active_semester:
            return Response({
                "buckets": [],
                "recent_transactions": [],
                "semester": "No active semester"
            })

        enrollment = Enrollment.objects.filter(
            student=request.user,
            semester=active_semester
        ).first()

        if not enrollment:
            return Response({
                "buckets": [],
                "recent_transactions": [],
                "semester": active_semester.name
            })

        buckets_qs = MonthlyPaymentBucket.objects.filter(enrollment=enrollment).order_by('month_number')
        buckets_data = []
        for b in buckets_qs:
            buckets_data.append({
                'month': b.month_number,
                'event_label': b.event_label,
                'paid': float(b.paid_amount),
                'required': float(b.required_amount)
            })

        transactions_qs = PaymentTransaction.objects.filter(enrollment=enrollment).order_by('-processed_at')[:10]
        transactions_data = PaymentTransactionSerializer(transactions_qs, many=True).data

        return Response({
            "buckets": buckets_data,
            "recent_transactions": transactions_data,
            "semester": f"{active_semester.name} {active_semester.academic_year}"
        })
