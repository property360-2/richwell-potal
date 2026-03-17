import pytest
from django.contrib.auth import get_user_model
from apps.accounts.services.user_service import UserService
from rest_framework.exceptions import PermissionDenied
from unittest.mock import MagicMock

User = get_user_model()

@pytest.mark.django_db
class TestUserService:
    def test_reset_password(self):
        user = User.objects.create_user(username='testuser', password='oldpassword', role='REGISTRAR')
        UserService.reset_password(user)
        assert user.check_password('testuser1234')

    def test_create_staff_admin_success(self):
        admin = User.objects.create_user(username='admin', password='password', role='ADMIN', email='admin@example.com')
        serializer = MagicMock()
        serializer.validated_data = {'role': 'REGISTRAR'}
        serializer.save.return_value = User(username='newstaff', role='REGISTRAR', email='newstaff@example.com')
        
        user = UserService.create_staff(serializer, admin)
        assert user.username == 'newstaff'
        assert user.check_password('newstaff1234')

    def test_create_staff_head_registrar_success(self):
        hr = User.objects.create_user(username='hr', password='password', role='HEAD_REGISTRAR', email='hr@example.com')
        serializer = MagicMock()
        serializer.validated_data = {'role': 'REGISTRAR'}
        serializer.save.return_value = User(username='newreg', role='REGISTRAR', email='newreg@example.com')
        
        user = UserService.create_staff(serializer, hr)
        assert user.username == 'newreg'
        assert user.check_password('newreg1234')

    def test_create_staff_head_registrar_fail(self):
        hr = User.objects.create_user(username='hr', password='password', role='HEAD_REGISTRAR', email='hr_fail@example.com')
        serializer = MagicMock()
        serializer.validated_data = {'role': 'ADMIN'}
        
        with pytest.raises(PermissionDenied):
            UserService.create_staff(serializer, hr)
