from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse

User = get_user_model()

class AuthenticationTests(APITestCase):
    def setUp(self):
        # Create an admin user
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@test.local',
            password='testpassword123',
            first_name='Admin',
            last_name='User'
        )
        self.admin_user.role = 'ADMIN'
        self.admin_user.must_change_password = False
        self.admin_user.save()

        # Create a registrar user that must change password
        self.staff_user = User.objects.create_user(
            username='registrar',
            email='registrar@test.local',
            password='testpassword123',
            first_name='Reggie',
            last_name='Strar'
        )
        self.staff_user.role = 'REGISTRAR'
        self.staff_user.must_change_password = True
        self.staff_user.save()

    def test_login_success(self):
        url = reverse('login')
        data = {'username': 'admin', 'password': 'testpassword123'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['role'], 'ADMIN')

    def test_login_failure(self):
        url = reverse('login')
        data = {'username': 'admin', 'password': 'wrongpassword'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_requires_auth(self):
        url = reverse('me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_returns_user_data(self):
        url = reverse('me')
        # Login to get token
        login_response = self.client.post(reverse('login'), {'username': 'registrar', 'password': 'testpassword123'}, format='json')
        access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + access_token)
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'registrar')
        self.assertTrue(response.data['must_change_password'])

    def test_change_password(self):
        url = reverse('change_password')
        # Login to get token
        login_response = self.client.post(reverse('login'), {'username': 'registrar', 'password': 'testpassword123'}, format='json')
        access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + access_token)
        
        data = {
            'old_password': 'testpassword123',
            'new_password': 'newpassword456',
            'confirm_password': 'newpassword456'
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify it changed by logging in with new password
        self.client.credentials() # clear header
        new_login = self.client.post(reverse('login'), {'username': 'registrar', 'password': 'newpassword456'}, format='json')
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)
        
        # Verify must_change_password is now False
        self.assertFalse(new_login.data['user']['must_change_password'])

class StaffManagementTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin', email='a@t.c', password='pwd', role='ADMIN', must_change_password=False
        )
        self.registrar = User.objects.create_user(
            username='reg', email='r@t.c', password='pwd', role='REGISTRAR', must_change_password=False
        )
        
    def test_admin_can_access_staff_list(self):
        # login as admin
        token = self.client.post(reverse('login'), {'username': 'admin', 'password': 'pwd'}).data['access']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
        
        url = reverse('staff-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 2)

    def test_registrar_cannot_access_staff_list(self):
        # login as registrar
        token = self.client.post(reverse('login'), {'username': 'reg', 'password': 'pwd'}).data['access']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
        
        url = reverse('staff-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
