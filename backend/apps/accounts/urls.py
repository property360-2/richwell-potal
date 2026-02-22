from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter

from . import views
from . import password_reset_views

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('login/', views.LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),

    # Profile
    path('me/', views.ProfileView.as_view(), name='profile'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    
    # Password Reset
    path('password/request-reset/', password_reset_views.RequestPasswordResetView.as_view(), name='request-password-reset'),
    path('password/validate-token/', password_reset_views.ValidateResetTokenView.as_view(), name='validate-reset-token'),
    path('password/reset/', password_reset_views.ResetPasswordView.as_view(), name='reset-password'),

    # User Management
    path('generate-student-id/', views.GenerateStudentIdView.as_view(), name='generate-student-id'),
    path('users/count/', views.UserCountView.as_view(), name='user-count'),
    path('users/', views.UserListView.as_view(), name='user-list'),
]

router = DefaultRouter()
router.register(r'students', views.StudentViewSet, basename='student')
router.register(r'staff', views.HigherUserViewSet, basename='staff')
urlpatterns += router.urls
