from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password

from core.permissions import IsAdmin
from .serializers import (
    UserSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    StaffCreateSerializer
)

User = get_user_model()

class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # We perform stateless JWT logout on the client side by deleting the token.
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)

class MeView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class ChangePasswordView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            if not user.check_password(serializer.validated_data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.validated_data.get("new_password"))
            user.save()
            return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class StaffManagementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = User.objects.exclude(role='STUDENT').order_by('id') # Admins manage staff, not students
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return StaffCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        # initial password is {prefix}{MMDD} 
        # Since we don't have birthdate in User model (it's in Student/Professor),
        # Staff users who are not professors/students (Admin, Registrar, Cashier, etc.) don't have birthdate.
        # So we'll auto-generate a generic one or use their username as initial password.
        initial_password = f"{user.username}1234"
        user.set_password(initial_password)
        user.save()

    def perform_update(self, serializer):
        # We don't want to update password here, only staff roles and active status.
        serializer.save()

    from rest_framework.decorators import action
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        initial_password = f"{user.username}1234"
        user.set_password(initial_password)
        user.save()
        return Response({"detail": f"Password reset to {initial_password}"}, status=status.HTTP_200_OK)
