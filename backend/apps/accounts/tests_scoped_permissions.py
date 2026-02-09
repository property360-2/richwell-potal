from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from apps.accounts.models import User, Permission, PermissionCategory, UserPermission

class ScopedPermissionTest(APITestCase):
    def setUp(self):
        self.category = PermissionCategory.objects.create(name='Accounts', code='accounts')
        self.view_perm = Permission.objects.create(
            category=self.category,
            name='View Users',
            code='user.view',
            default_for_roles=['ADMIN']
        )
        self.manage_perm = Permission.objects.create(
            category=self.category,
            name='Manage Users',
            code='user.manage',
            default_for_roles=['ADMIN']
        )
        
        self.admin = User.objects.create_user(
            email='admin@test.com', username='admin@test.com', password='pass', role='ADMIN', first_name='Admin', last_name='User'
        )
        self.registrar = User.objects.create_user(
            email='registrar@test.com', username='registrar@test.com', password='pass', role='REGISTRAR', first_name='Reg', last_name='User'
        )
        self.professor = User.objects.create_user(
            email='prof@test.com', username='prof@test.com', password='pass', role='PROFESSOR', first_name='Prof', last_name='User'
        )
        self.student = User.objects.create_user(
            email='student@test.com', username='student@test.com', password='pass', role='STUDENT', first_name='Stud', last_name='User'
        )

    def test_get_permission_scope(self):
        # Create a scoped permission for registrar
        UserPermission.objects.create(
            user=self.registrar,
            permission=self.manage_perm,
            granted=True,
            scope={'permitted_roles': ['PROFESSOR']}
        )
        
        scope = self.registrar.get_permission_scope('user.manage')
        self.assertEqual(scope.get('permitted_roles'), ['PROFESSOR'])
        
        # Test non-existent scope
        scope_none = self.professor.get_permission_scope('user.manage')
        self.assertEqual(scope_none, {})

    def test_higher_user_viewset_filtering(self):
        # Grant registrar permission to manage only professors
        UserPermission.objects.create(
            user=self.registrar,
            permission=self.manage_perm,
            granted=True,
            scope={'permitted_roles': ['PROFESSOR']}
        )
        
        self.client.force_authenticate(user=self.registrar)
        url = '/api/v1/accounts/staff/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see Professor, but not Admin or self (if not in scope)
        # Actually, the queryset excludes role='ADMIN' for non-admins
        # And filter(role__in=['PROFESSOR'])
        results = response.data.get('results', response.data)
        emails = [u['email'] for u in results]
        
        self.assertIn('prof@test.com', emails)
        self.assertNotIn('admin@test.com', emails)
        self.assertNotIn('student@test.com', emails) 

    def test_higher_user_creation_restrictions(self):
        # Registrar can only create Professors
        UserPermission.objects.create(
            user=self.registrar,
            permission=self.manage_perm,
            granted=True,
            scope={'permitted_roles': ['PROFESSOR']}
        )
        
        self.client.force_authenticate(user=self.registrar)
        url = '/api/v1/accounts/staff/'
        
        # Attempt to create an Admin (Forbidden by logic in viewset)
        data_admin = {
            'email': 'newadmin@test.com',
            'password': 'pass',
            'role': 'ADMIN',
            'first_name': 'New',
            'last_name': 'Admin'
        }
        response = self.client.post(url, data_admin)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Attempt to create a Professor (Allowed)
        data_prof = {
            'email': 'newprof@test.com',
            'password': 'pass',
            'role': 'PROFESSOR',
            'first_name': 'New',
            'last_name': 'Prof'
        }
        response = self.client.post(url, data_prof)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
