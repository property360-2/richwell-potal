import pytest
from django.urls import reverse
from rest_framework import status
from apps.students.models import Student, StudentEnrollment
from core.models import SystemSequence
from django.contrib.auth import get_user_model
from concurrent.futures import ThreadPoolExecutor
from django.db import connection

User = get_user_model()

@pytest.mark.django_db(transaction=True)
class TestStudentLifecycle:
    def test_application_flow(self, api_client, active_term, bscs_program, bscs_curriculum):
        # 1. Apply
        url = reverse('student-apply')
        data = {
            "first_name": "Juan",
            "last_name": "Dela Cruz",
            "email": "juan@example.com",
            "date_of_birth": "2005-01-01",
            "gender": "MALE",
            "address_municipality": "Malolos",
            "address_barangay": "San Vicente",
            "contact_number": "09123456789",
            "guardian_name": "Maria",
            "guardian_contact": "09987654321",
            "program": bscs_program.id,
            "curriculum": bscs_curriculum.id,
            "student_type": "FRESHMAN"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        student = Student.objects.get(user__email="juan@example.com")
        assert student.status == 'APPLICANT'
        assert student.idn.startswith('APP-')

        # 2. Approve (Atomic IDN generation)
        api_client.force_authenticate(user=User.objects.create_superuser(username='admin', email='a@a.com', password='p'))
        approve_url = reverse('student-approve', kwargs={'pk': student.pk})
        response = api_client.post(approve_url, {"monthly_commitment": 5000})
        
        assert response.status_code == status.HTTP_200_OK
        student.refresh_from_db()
        assert student.status == 'APPROVED'
        import datetime
        year_prefix = str(datetime.datetime.now().year)[2:]
        assert student.idn == f"{year_prefix}0001"
        assert student.user.username == student.idn
        assert student.user.must_change_password is True

        # Check Enrollment
        enrollment = StudentEnrollment.objects.get(student=student, term=active_term)
        assert enrollment.monthly_commitment == 5000
        assert enrollment.year_level == 1

    def test_idn_concurrency(self, api_client, active_term, bscs_program, bscs_curriculum):
        # Create 5 applicants
        applicants = []
        admin = User.objects.create_superuser(username='admin_seq', email='admin_seq@a.com', password='p')
        
        for i in range(5):
            u = User.objects.create(username=f'u{i}', email=f'u{i}@a.com')
            s = Student.objects.create(
                user=u, idn=f'APP-{i}', date_of_birth="2000-01-01", 
                program=bscs_program, curriculum=bscs_curriculum, status='APPLICANT'
            )
            applicants.append(s)

        # We will try to approve them "concurrently"
        # Note: True concurrency in pytest-django can be tricky with the DB wrapper,
        # but the select_for_update() is what we're testing.
        
        url_template = reverse('student-approve', kwargs={'pk': 0})
        
        def approve_student(s_id):
            # We need a new connection for each thread for real concurrency testing
            connection.close() 
            from rest_framework.test import APIClient
            client = APIClient()
            client.force_authenticate(user=admin)
            # Use reverse inside the thread to be absolutely sure
            url = reverse('student-approve', kwargs={'pk': s_id})
            res = client.post(url, {"monthly_commitment": 1000})
            if res.status_code != 200:
                print(f"Error for ID {s_id}: {res.status_code} - {res.data}")
            return res.status_code

        with ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(approve_student, [a.id for a in applicants]))

        assert all(r == 200 for r in results)
        
        idns = list(Student.objects.filter(status='APPROVED').values_list('idn', flat=True))
        assert len(set(idns)) == 5 # All unique
        # They should be sequential
        import datetime
        prefix = str(datetime.datetime.now().year)[2:]
        expected = [f"{prefix}{str(i).zfill(4)}" for i in range(1, 6)]
        assert sorted(idns) == expected
