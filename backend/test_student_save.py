import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.students.models import Student

try:
    student = Student.objects.get(idn='E2E-2002')
    print(f"Testing save for student: {student}")
    checklist = {
        'Form 138': {'submitted': True, 'verified': True},
        'Good Moral': {'submitted': True, 'verified': True},
        'PSA Birth Certificate': {'submitted': True, 'verified': True}
    }
    student.document_checklist = checklist
    student.save()
    print("Save successful!")
except Exception as e:
    import traceback
    traceback.print_exc()
