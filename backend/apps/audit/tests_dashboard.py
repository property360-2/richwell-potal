from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import User, StudentProfile
from apps.academics.models import Section, Program, Curriculum, Subject, SectionSubject, ScheduleSlot
from apps.enrollment.models import Semester, Enrollment, SubjectEnrollment
from apps.audit.models import AuditLog

class DashboardAlertsTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@test.com', username='admin@test.com', 
            password='pass', role='ADMIN', first_name='Admin', last_name='User'
        )
        self.semester = Semester.objects.create(
            academic_year='2024-2025',
            name='First Semester',
            is_current=True,
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=100)).date()
        )
        self.program = Program.objects.create(code='BSIT', name='IT')
        self.curriculum = Curriculum.objects.create(
            program=self.program, code='IT24', name='IT24', effective_year=2024
        )
        
    def test_section_full_alert(self):
        # Create a section with 100% occupancy
        section = Section.objects.create(
            name='FULL-SEC', program=self.program, semester=self.semester,
            curriculum=self.curriculum, year_level=1, capacity=1
        )
        subject = Subject.objects.create(
            code='S1', title='S1', units=3, program=self.program,
            year_level=1, semester_number=1
        )
        SectionSubject.objects.create(section=section, subject=subject)
        
        user = User.objects.create_user(email='s@t.com', username='s@t.com', password='p', role='STUDENT', last_name='S')
        StudentProfile.objects.create(
            user=user, program=self.program, year_level=1, home_section=section,
            birthdate='2000-01-01', address='Addr', contact_number='123'
        )
        enrollment = Enrollment.objects.create(student=user, semester=self.semester, monthly_commitment=1000)
        SubjectEnrollment.objects.create(
            enrollment=enrollment, subject=subject, section=section, status='ENROLLED'
        )
        
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/audit/dashboard/alerts/')
        self.assertEqual(response.status_code, 200)
        
        alert_types = [a['type'] for a in response.data['alerts']]
        self.assertIn('SECTION_FULL', alert_types)

    def test_audit_spike_alert(self):
        # Create 101 audit logs in the last hour
        for i in range(101):
            AuditLog.objects.create(
                action='USER_LOGIN',
                actor=self.admin,
                target_model='User',
                timestamp=timezone.now()
            )
            
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/audit/dashboard/alerts/')
        self.assertIn('AUDIT_SPIKE', [a['type'] for a in response.data['alerts']])

    def test_irregular_conflict_alert(self):
        # Create two overlapping slots in the same section
        section = Section.objects.create(
            name='CONF-SEC', program=self.program, semester=self.semester,
            curriculum=self.curriculum, year_level=1, capacity=40
        )
        subject1 = Subject.objects.create(
            code='S1', title='S1', units=3, program=self.program,
            year_level=1, semester_number=1
        )
        subject2 = Subject.objects.create(
            code='S2', title='S2', units=3, program=self.program,
            year_level=1, semester_number=1
        )
        ss1 = SectionSubject.objects.create(section=section, subject=subject1)
        ss2 = SectionSubject.objects.create(section=section, subject=subject2)
        
        ScheduleSlot.objects.create(
            section_subject=ss1, day='MON', 
            start_time='08:00', end_time='10:00'
        )
        ScheduleSlot.objects.create(
            section_subject=ss2, day='MON', 
            start_time='09:00', end_time='11:00'
        )
        
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/audit/dashboard/alerts/')
        self.assertIn('IRREGULAR_CONFLICT', [a['type'] for a in response.data['alerts']])
