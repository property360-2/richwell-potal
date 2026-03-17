from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import get_user_model

User = get_user_model()

class UserService:
    @staticmethod
    def create_staff(serializer, creator):
        """
        Creates a new staff member with role validation.
        Head Registrars can only create other Registrars.
        """
        target_role = serializer.validated_data.get('role')
        
        if creator.role == 'HEAD_REGISTRAR' and target_role not in ['REGISTRAR', 'HEAD_REGISTRAR']:
            raise PermissionDenied("Head Registrars can only create other Registrar accounts.")
            
        new_user = serializer.save()
        initial_password = f"{new_user.username}1234"
        new_user.set_password(initial_password)
        new_user.save()
        return new_user

    @staticmethod
    def reset_password(user):
        """
        Resets a user's password to the default format: username1234
        """
        initial_password = f"{user.username}1234"
        user.set_password(initial_password)
        user.save()
        return user
