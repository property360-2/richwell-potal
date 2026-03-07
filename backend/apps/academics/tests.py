from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User
from .models import Program, CurriculumVersion, Subject

class AcademicsTests(APITestCase):
    def setUp(self):
        # Create an admin user to interact with the protected endpoints
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            username='admin',
            password='password123',
            first_name='Admin',
            last_name='User',
            role='ADMIN'
        )
        self.client.force_authenticate(user=self.admin_user)

    def test_create_program(self):
        url = reverse('program-list')
        data = {'code': 'BSCS', 'name': 'Computer Science'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Program.objects.count(), 1)
        self.assertEqual(Program.objects.get().code, 'BSCS')

    def test_create_curriculum(self):
        program = Program.objects.create(code='BSIT', name='IT')
        url = reverse('curriculumversion-list')
        data = {'program': program.id, 'version_name': '2023-2024'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_bulk_upload_no_file(self):
        url = reverse('subject-bulk-upload')
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'No file provided')

    def test_filter_subjects_by_curriculum(self):
        program = Program.objects.create(code='BSIS', name='IS')
        curr1 = CurriculumVersion.objects.create(program=program, version_name='V1')
        curr2 = CurriculumVersion.objects.create(program=program, version_name='V2')
        
        Subject.objects.create(curriculum=curr1, code='MATH1', description='Math 1', year_level=1, semester='1', total_units=3)
        Subject.objects.create(curriculum=curr1, code='MATH2', description='Math 2', year_level=1, semester='2', total_units=3)
        Subject.objects.create(curriculum=curr2, code='ENG1', description='English 1', year_level=1, semester='1', total_units=3)

        url = reverse('subject-list')
        
        # Test filtering by curriculum ID
        response = self.client.get(f"{url}?curriculum={curr1.id}")
        self.assertEqual(len(response.data['results']), 2)
        
        # Test filtering by semester
        response = self.client.get(f"{url}?curriculum={curr1.id}&semester=2")
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['code'], 'MATH2')
