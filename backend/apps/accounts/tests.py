from django.test import TestCase
from apps.accounts.models import User, Permission, PermissionCategory, UserPermission

class UserPermissionTest(TestCase):
    def setUp(self):
        # Create a category
        self.category = PermissionCategory.objects.create(
            name='Test Category',
            code='test_cat'
        )
        
        # Create a permission
        self.permission = Permission.objects.create(
            category=self.category,
            name='Test Permission',
            code='test.perm',
            default_for_roles=['ADMIN', 'REGISTRAR']
        )
        
        # Create users
        self.admin = User.objects.create_user(
            username='admin@example.com',
            email='admin@example.com',
            password='password123',
            first_name='Admin',
            last_name='User',
            role=User.Role.ADMIN
        )
        
        self.student = User.objects.create_user(
            username='student@example.com',
            email='student@example.com',
            password='password123',
            first_name='Student',
            last_name='User',
            role=User.Role.STUDENT
        )

    def test_role_default_permission(self):
        """Test that users get permissions assigned to their roles by default."""
        self.assertTrue(self.admin.has_permission('test.perm'))
        self.assertFalse(self.student.has_permission('test.perm'))

    def test_custom_grant_permission(self):
        """Test that a specific permission can be granted to a user regardless of role."""
        # Grant permission to student
        UserPermission.objects.create(
            user=self.student,
            permission=self.permission,
            granted=True
        )
        
        self.assertTrue(self.student.has_permission('test.perm'))

    def test_custom_revoke_permission(self):
        """Test that a role-default permission can be revoked for a specific user."""
        # Revoke permission from admin
        UserPermission.objects.create(
            user=self.admin,
            permission=self.permission,
            granted=False
        )
        
        self.assertFalse(self.admin.has_permission('test.perm'))

    def test_non_existent_permission(self):
        """Test that has_permission returns False for non-existent permission codes."""
        self.assertFalse(self.admin.has_permission('non.existent'))
