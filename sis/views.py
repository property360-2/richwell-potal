"""
Django views for SIS application.
Views for enrollment, payments, grades, and admin functions.
"""

from django.shortcuts import render
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin


class HomeView(LoginRequiredMixin, View):
    """Home/Dashboard view"""
    template_name = 'sis/home.html'

    def get(self, request):
        context = {
            'user': request.user,
        }
        return render(request, self.template_name, context)
