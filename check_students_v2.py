import os
import sys
import django

# Add the current directory (backend) to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings') # Wait, is it core.settings or config.settings?
# Config dir had settings? No, let me check.

# I previously used core.settings in search_web? no.
# Let's check backend/config/
