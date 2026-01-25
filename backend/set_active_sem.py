
import os
import django
import sys

# Setup Django
sys.path.append('c:\\Users\\kmagh\\richwell-potal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.enrollment.models import Semester

def set_active_semester():
    target_name = "1st Semester"
    target_year = "2024-2025"
    
    # Deactivate all
    Semester.objects.all().update(is_current=False)
    
    # Activate target
    target = Semester.objects.filter(name=target_name, academic_year=target_year).first()
    if target:
        target.is_current = True
        target.save()
        print(f"Set {target} to Active")
    else:
        print(f"Target semester {target_name} {target_year} not found!")
        # Fallback search
        targets = Semester.objects.filter(name__icontains="1st").order_by('-academic_year')
        if targets.exists():
            target = targets.first()
            target.is_current = True
            target.save()
            print(f"Fallback: Set {target} to Active")

if __name__ == '__main__':
    set_active_semester()
