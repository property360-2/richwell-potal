"""
Richwell Portal — Student Services

This module handles complex business logic for the Students application, 
including student application processing, approval workflows, enrollment logic, 
and manual student record creation.
"""

import datetime
import logging
from django.db import transaction
from django.db.models import Q
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.conf import settings
from django.contrib.auth import get_user_model

from .models import Student, StudentEnrollment
from core.models import SystemSequence
from apps.notifications.services.email_service import EmailService

User = get_user_model()
logger = logging.getLogger(__name__)

def apply_student(data):
    """
    Handles the initial public application of a student.
    Creates a User account (inactive) and a Student profile in APPLICANT status.
    
    @param {dict} data - Validated student application data.
    @returns {Student} The newly created Student instance.
    """
    email = data['email']
    if User.objects.filter(email=email).exists():
        raise DRFValidationError({'email': ['A student with this email already has an application or account.']})
        
    with transaction.atomic():
        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=data['first_name'],
            last_name=data['last_name'],
            role='STUDENT',
            is_active=False
        )
        
        try:
            student = Student.objects.create(
                user=user,
                idn=f"APP-{user.id}",
                middle_name=data.get('middle_name'),
                date_of_birth=data['date_of_birth'],
                gender=data['gender'],
                address_municipality=data['address_municipality'],
                address_barangay=data['address_barangay'],
                address_full=data.get('address_full'),
                contact_number=data['contact_number'],
                guardian_name=data['guardian_name'],
                guardian_contact=data['guardian_contact'],
                program=data['program'],
                curriculum=data['curriculum'],
                student_type=data['student_type'],
                status='APPLICANT'
            )
        except DjangoValidationError as e:
            raise DRFValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))

        # Send Confirmation Email (Non-blocking)
        try:
            from apps.academics.models import Program
            from apps.terms.models import Term
            
            # Fetch context details safely
            selected_program = Program.objects.filter(id=student.program_id).first()
            active_term = Term.objects.filter(is_active=True).first()
            
            # Prepare contextual data
            context = {
                'full_name': f"{user.first_name} {user.last_name}",
                'program_name': selected_program.name if selected_program else "Your Selected Program",
                'term_name': str(active_term) if active_term else "the Academic Year"
            }
            
            EmailService.send_html_email(
                subject="Application Received - Richwell Colleges",
                template_name="emails/application_confirmation.html",
                context=context,
                recipient_list=[email]
            )
        except Exception as e:
            # Log the error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send application confirmation email to {email}: {str(e)}")
            
        return student

def admit_student_application(student, monthly_commitment, admitted_by):
    """
    Admits a student's application, generates an IDN, activates the user account,
    and sets up initial enrollment for the active term.
    
    @param {Student} student - The applicant to admit.
    @param {float} monthly_commitment - The agreed monthly payment.
    @param {User} admitted_by - The staff user performing the admission.
    @returns {dict} Admission details including generated credentials.
    """
    if student.status != 'APPLICANT':
        raise DRFValidationError({'detail': 'Only applicants can be admitted.'})
        
    # Get active term
    from apps.terms.models import Term
    active_term = Term.objects.filter(is_active=True).first()
    if not active_term:
        raise DRFValidationError({'detail': 'No active term found. Please activate a term first.'})

    from apps.grades.services.advising_service import AdvisingService

    with transaction.atomic():
        # Generate IDN
        year_prefix = str(datetime.datetime.now().year)[2:]
        sequence_key = f"idn_{year_prefix}"
        seq_obj, _ = SystemSequence.objects.select_for_update().get_or_create(key=sequence_key)
        
        while True:
            seq_obj.last_value += 1
            idn = f"{year_prefix}{str(seq_obj.last_value).zfill(4)}"
            if not User.objects.filter(username=idn).exists():
                break
        
        seq_obj.save()
        
        # Update User and Student
        student.idn = idn
        student.status = 'ADMITTED'
        student.user.username = idn
        student.user.is_active = True
        
        # Generate Default Password: IDN + MMDD of birth
        dob_suffix = student.date_of_birth.strftime('%m%d')
        generated_password = f"{idn}{dob_suffix}"
        student.user.set_password(generated_password)
        student.user.save()
        
        student.save(audit_user=admitted_by)

        # Create Initial Enrollment
        reg_data = AdvisingService.check_student_regularity(student, active_term)
        year_level = AdvisingService.get_year_level(student)
        enrollment, created = StudentEnrollment.objects.get_or_create(
            student=student,
            term=active_term,
            defaults={
                'monthly_commitment': monthly_commitment,
                'year_level': year_level,
                'enrolled_by': admitted_by,
                'is_regular': reg_data['is_regular'],
                'regularity_reason': reg_data['reason']
            }
        )
        if created:
            enrollment.save(audit_user=admitted_by)
        
        # High-level Audit Log
        from apps.auditing.models import AuditLog
        from apps.auditing.middleware import get_current_ip
        AuditLog.objects.create(
            user=admitted_by,
            action='ADMIT_STUDENT',
            model_name='Student',
            object_id=str(student.id),
            object_repr=str(student),
            changes={'idn': idn, 'monthly_commitment': str(monthly_commitment)},
            ip_address=get_current_ip()
        )
        
        
        # Send Account Verified Email
        try:
            EmailService.send_html_email(
                subject="Application Verified - Richwell Colleges",
                template_name="emails/account_verified.html",
                context={
                    'full_name': student.user.get_full_name(),
                    'idn': idn,
                    'password': generated_password,
                    'login_url': f"{settings.FRONTEND_URL}/login"
                },
                recipient_list=[student.user.email]
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send account_verified email to {student.user.email}: {str(e)}")

        return {
            'idn': idn,
            'password': generated_password
        }

def enroll_student_for_term(student, monthly_commitment=None, enrolled_by=None):
    """
    Enrolls an already approved student into the current active term.
    Initializes status as 'FOR_ADVISING' for returning/self-service students.
    
    @param {Student} student - The student to enroll.
    @param {float} monthly_commitment - The agreed monthly payment.
    @param {User} enrolled_by - The staff or student user performing the action.
    @returns {StudentEnrollment} The created or updated enrollment record.
    """
    if student.status in ['APPLICANT', 'REJECTED']:
        raise DRFValidationError({'detail': 'Only admitted students can be enrolled.'})
            
    from apps.terms.models import Term
    active_term = Term.objects.filter(is_active=True).first()
    if not active_term:
        raise DRFValidationError({'detail': 'No active term found.'})

    from apps.grades.services.advising_service import AdvisingService
    
    with transaction.atomic():
        # Keep status as is (usually ADMITTED) until advising is approved
        # student.status = 'ENROLLED'
        # student.save()
        
        reg_data = AdvisingService.check_student_regularity(student, active_term)
        year_level = AdvisingService.get_year_level(student)
        
        # Determine status: if student enrolled themselves, it's FOR_ADVISING
        # If staff enrolled them (with commitment), maybe it's PENDING or DRAFT?
        # User wants "FOR_ADVISING" after submission of form.
        initial_status = 'FOR_ADVISING' if enrolled_by and enrolled_by.role == 'STUDENT' else 'DRAFT'

        enrollment, _ = StudentEnrollment.objects.update_or_create(
            student=student,
            term=active_term,
            defaults={
                'monthly_commitment': monthly_commitment or 0,
                'year_level': year_level,
                'enrolled_by': enrolled_by,
                'is_regular': reg_data['is_regular'],
                'regularity_reason': reg_data['reason'],
                'advising_status': initial_status
            }
        )
        if enrolled_by:
            enrollment.save(audit_user=enrolled_by)
        return enrollment

def manual_add_student_record(data, requested_by):
    """
    Manually creates a student record for existing students not in the system.
    Immediately activates account and enrolls them for the active term.
    
    @param {dict} data - Raw data for the student record.
    @param {User} requested_by - The staff user creating the record.
    @returns {tuple} (Student instance, is_regular boolean)
    """
    idn = data.get('idn')
    email = data.get('email')
    
    if not idn or not email:
        raise DRFValidationError({'detail': 'IDN and Email are required.'})
    
    if User.objects.filter(Q(username=idn) | Q(email=email)).exists():
        logger.warning(f"Manual Add Failed: User with IDN {idn} or email {email} already exists.")
        raise DRFValidationError({'detail': 'Student with this IDN or Email already exists.'})

    monthly_commitment = data.get('monthly_commitment')
    if monthly_commitment is None:
        raise DRFValidationError({'monthly_commitment': ['Monthly commitment is required for enrollment.']})
    
    try:
        monthly_commitment = float(monthly_commitment)
    except (TypeError, ValueError):
        raise DRFValidationError({'monthly_commitment': ['Must be a valid number.']})

    from apps.terms.models import Term
    from apps.grades.services.advising_service import AdvisingService
    
    active_term = Term.objects.filter(is_active=True).first()
    if not active_term:
        raise DRFValidationError({'detail': 'No active term found.'})

    with transaction.atomic():
        # User Creation
        user = User.objects.create_user(
            username=idn,
            email=email,
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            role='STUDENT'
        )
        
        dob_str = data.get('date_of_birth')
        try:
            dob = datetime.datetime.strptime(dob_str, '%Y-%m-%d').date()
        except (TypeError, ValueError) as exc:
            raise DRFValidationError({'date_of_birth': ['A valid date_of_birth is required (YYYY-MM-DD).']}) from exc
        
        # Set default password
        dob_suffix = dob.strftime('%m%d')
        user.set_password(f"{idn}{dob_suffix}")
        user.save()
        
        # Mappings
        gender_map = {'M': 'MALE', 'F': 'FEMALE'}
        type_map = {
            'REGULAR': 'FRESHMAN', 
            'TRANSFEREE': 'TRANSFEREE', 
            'CURRENT': 'CURRENT',
            'RETURNING': 'FRESHMAN'
        }

        # Student Profile
        try:
            student = Student.objects.create(
                user=user,
                idn=idn,
                date_of_birth=dob,
                gender=gender_map.get(data.get('gender'), 'MALE'),
                program_id=data.get('program'),
                curriculum_id=data.get('curriculum'),
                student_type=type_map.get(data.get('student_type'), 'FRESHMAN'),
                status='ENROLLED'
            )
        except DjangoValidationError as e:
            raise DRFValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))

        try:
            student.save(audit_user=requested_by)
        except DjangoValidationError as e:
            raise DRFValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))
        
        # Enrollment Record
        reg_data = AdvisingService.check_student_regularity(student, active_term)
        is_regular = reg_data['is_regular']
        regularity_reason = reg_data['reason']
        
        # Calculate year level automatically based on completed/credited units
        year_level = AdvisingService.get_year_level(student)
        
        enrollment = StudentEnrollment.objects.create(
            student=student,
            term=active_term,
            year_level=year_level,
            monthly_commitment=monthly_commitment,
            is_regular=is_regular,
            regularity_reason=regularity_reason,
            enrolled_by=requested_by
        )
        enrollment.save(audit_user=requested_by)
        
        logger.info(f"Student {idn} manually added and enrolled in {active_term.code} (Year {year_level}).")

        # High-level Audit Log
        from apps.auditing.models import AuditLog
        from apps.auditing.middleware import get_current_ip
        AuditLog.objects.create(
            user=requested_by,
            action='MANUAL_STUDENT',
            model_name='Student',
            object_id=str(student.id),
            object_repr=str(student),
            changes={'idn': idn, 'monthly_commitment': str(monthly_commitment)},
            ip_address=get_current_ip()
        )

    # Send Welcome Email (outside transaction to ensure commit)
    try:
        EmailService.send_html_email(
            subject="Welcome to Richwell Portal - Your Credentials",
            template_name="emails/welcome_legacy_student.html",
            context={
                "full_name": user.get_full_name(),
                "idn": idn,
                "password": f"{idn}{dob_suffix}",
                "login_url": f"{settings.FRONTEND_URL}/login"
            },
            recipient_list=[email]
        )
    except Exception as e:
        logger.error(f"Failed to send welcome email to {email}: {str(e)}")
        
    return student, is_regular

def toggle_student_regularity(student_id, is_regular):
    """
    Toggles the regularity status for a student's active term enrollment.
    
    @param {int} student_id - ID of the student profile.
    @param {boolean} is_regular - The new regularity status.
    @returns {tuple} (StudentEnrollment, boolean)
    """
    from apps.terms.models import Term
    active_term = Term.objects.filter(is_active=True).first()
    if not active_term:
        raise DRFValidationError({'detail': 'No active term found.'})
        
    enrollment = StudentEnrollment.objects.filter(student_id=student_id, term=active_term).first()
    if not enrollment:
        raise DRFValidationError({'detail': 'No enrollment record found for the active term.'})
        
    enrollment.is_regular = is_regular
    enrollment.save()
    return enrollment, is_regular

def get_student_schedule(student, term_id):
    """
    Compiles a formatted class schedule for a specific student and term.
    
    @param {Student} student - The student profile instance.
    @param {int} term_id - The ID of the academic term.
    @returns {Array} List of formatted schedule blocks.
    """
    from apps.grades.models import Grade
    from apps.scheduling.models import Schedule
    
    grades = Grade.objects.filter(student=student, term_id=term_id, advising_status='APPROVED')
    schedule_data = []

    for g in grades:
        schedules = Schedule.objects.filter(
            subject=g.subject, 
            term_id=term_id, 
            section__student_assignments__student=student
        )
        for s in schedules:
            schedule_data.append({
                "subject_code": g.subject.code,
                "subject_name": g.subject.description,
                "section_name": s.section.name,
                "days": s.days,
                "start_time": s.start_time.strftime('%H:%M') if s.start_time else None,
                "end_time": s.end_time.strftime('%H:%M') if s.end_time else None,
                "room": s.room.name if s.room else "TBA",
                "professor": s.professor.user.get_full_name() if s.professor else "TBA",
                "type": s.component_type
            })
    return schedule_data
