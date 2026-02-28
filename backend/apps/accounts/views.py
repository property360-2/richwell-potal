"""
Accounts views — Re-export hub.

All views are split into domain-specific modules:
  views_auth.py        — Login, logout, profile, password
  views_users.py       — User listing, students, higher roles, student ID
  views_permissions.py — Permission categories, role toggle

This file re-exports everything so existing imports continue to work:
  from . import views  (in accounts/urls.py)
"""

# --- Auth & Profile ---
from .views_auth import (  # noqa: F401
    LoginView,
    LogoutView,
    ProfileView,
    UserCountView,
    ChangePasswordView,
)

# --- User Management ---
from .views_users import (  # noqa: F401
    UserListView,
    StudentViewSet,
    HigherUserViewSet,
    GenerateStudentIdView,
)

# --- Permissions ---
from .views_permissions import (  # noqa: F401
    PermissionCategoryViewSet,
    PermissionToggleView,
)
