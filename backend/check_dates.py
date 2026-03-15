import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.terms.models import Term
term = Term.objects.filter(is_active=True).first()
if term:
    print(f"Term: {term.code}")
    print(f"Picking Start: {term.schedule_picking_start}")
    print(f"Picking End: {term.schedule_picking_end}")
else:
    print("No active term found")
