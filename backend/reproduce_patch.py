
import os
import django
import sys

# Setup Django
sys.path.append('c:\\Users\\kmagh\\richwell-potal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.academics.models import SectionSubject
from apps.accounts.models import User
from rest_framework.test import APIRequestFactory
from apps.academics.views import SectionSubjectViewSet

def reproduce():
    # Find a professor
    prof = User.objects.filter(role='PROFESSOR').first()
    if not prof:
        print("No professor found")
        return

    # Find the section subject
    ss_id = 'd5129258-74b7-4522-a2a3-c6888cae768b'
    try:
        ss = SectionSubject.objects.get(id=ss_id)
        print(f"Found SS: {ss}")
    except SectionSubject.DoesNotExist:
        print("SS not found")
        return

    # Try to update
    print(f"Updating professor to {prof.id}...")
    
    # We can try to use the serializer directly to trace
    from apps.academics.serializers import SectionSubjectCreateSerializer
    
    serializer = SectionSubjectCreateSerializer(ss, data={'professor': str(prof.id)}, partial=True)
    if serializer.is_valid():
        try:
            serializer.save()
            print("Update success!")
        except Exception as e:
            print(f"Update failed: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("Serializer invalid:", serializer.errors)

if __name__ == '__main__':
    reproduce()
