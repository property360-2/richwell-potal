"""
Richwell Portal — Test Settings
Uses SQLite for fast, isolated test runs.
"""

from pathlib import Path

from .base import *  # noqa: F401, F403

DEBUG = False
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'TEST': {
            'SERIALIZE': False,
        },
    }
}
