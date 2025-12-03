"""
WSGI config for richwell_config project.

It exposes the WSGI callable as a module-level variable named ``application``.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'richwell_config.settings')

application = get_wsgi_application()
