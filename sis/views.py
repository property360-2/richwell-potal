from django.shortcuts import render
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import LoginView, LogoutView
from django.urls import reverse_lazy


class HomeView(LoginRequiredMixin, TemplateView):
    """Home page view - requires authentication."""
    template_name = 'home.html'
    login_url = reverse_lazy('sis:login')


class CustomLoginView(LoginView):
    """Custom login view with role-based redirect."""
    template_name = 'registration/login.html'
    redirect_authenticated_user = True
    next_page = reverse_lazy('sis:home')


class CustomLogoutView(LogoutView):
    """Custom logout view."""
    next_page = reverse_lazy('sis:login')


def handler_404(request, exception):
    """Handle 404 errors."""
    return render(request, '404.html', status=404)


def handler_500(request):
    """Handle 500 errors."""
    return render(request, '500.html', status=500)
