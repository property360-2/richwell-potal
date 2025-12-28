"""
Accounts URL configuration.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('login/', views.LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),

    # Profile
    path('me/', views.ProfileView.as_view(), name='profile'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),

    # Permission Management
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<uuid:user_id>/permissions/', views.UserPermissionsView.as_view(), name='user-permissions'),
    path('users/<uuid:user_id>/permissions/update/', views.UpdateUserPermissionView.as_view(), name='update-permission'),
    path('users/<uuid:user_id>/permissions/bulk/', views.BulkUpdateUserPermissionsView.as_view(), name='bulk-update-permissions'),
    path('permissions/categories/', views.PermissionCategoryListView.as_view(), name='permission-categories'),
]
