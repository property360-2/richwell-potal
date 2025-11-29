# Fixes Applied - URL Namespace Resolution

## Issue Fixed
All views were using `reverse_lazy('login')` and `reverse_lazy('home')`, but the URL names are namespaced as `sis:login` and `sis:home` due to `app_name = 'sis'` in urls.py.

## Changes Made

### 1. `richwell_config/settings.py`
Updated authentication URL settings to use namespaced names:
```python
LOGIN_URL = "sis:login"           # was "login"
LOGIN_REDIRECT_URL = "sis:home"   # was "home"
LOGOUT_REDIRECT_URL = "sis:login" # was "login"
```

### 2. `sis/views.py`
Updated all view URL references:
```python
class HomeView(LoginRequiredMixin, TemplateView):
    login_url = reverse_lazy('sis:login')    # was 'login'

class CustomLoginView(LoginView):
    next_page = reverse_lazy('sis:home')     # added this

class CustomLogoutView(LogoutView):
    next_page = reverse_lazy('sis:login')    # was 'login'
```

### 3. `templates/base.html`
Updated all template URL references:
- `{% url 'home' %}` → `{% url 'sis:home' %}`
- `{% url 'login' %}` → `{% url 'sis:login' %}`
- `{% url 'logout' %}` → `{% url 'sis:logout' %}`

### 4. `templates/home.html`
- `{% url 'login' %}` → `{% url 'sis:login' %}`

### 5. `templates/404.html`
- `{% url 'home' %}` → `{% url 'sis:home' %}`

### 6. `templates/500.html`
- `{% url 'home' %}` → `{% url 'sis:home' %}`

## Status: ✅ ALL FIXED

Django configuration now validates without errors.

```bash
python manage.py check
# System check identified no issues (0 silenced).
```

## Ready to Run

The application is now fully functional and ready to start:

```bash
python manage.py runserver
```

Access at:
- Portal: http://localhost:8000
- Admin: http://localhost:8000/admin/
- Login: http://localhost:8000/login/

Credentials:
- Username: `admin`
- Password: `admin123`
