import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.enrollment.models import SubjectEnrollment
from apps.accounts.models import User, DepartmentHeadProfile
from django.db.models import Count

print("--- DIAGNOSTIC REPORT ---")

# 1. Check total SubjectEnrollments by status
status_counts = SubjectEnrollment.objects.values('status').annotate(count=Count('id'))
print("\nSubject Enrollments by Status:")
for item in status_counts:
    print(f"  {item['status']}: {item['count']}")

# 2. Check Department Heads and their programs
heads = User.objects.filter(role='DEPARTMENT_HEAD')
print(f"\nDepartment Heads Found: {heads.count()}")
for head in heads:
    profile = getattr(head, 'department_head_profile', None)
    if profile:
        programs = profile.programs.all()
        print(f"  Head: {head.get_full_name()} (email: {head.email})")
        print(f"    Assigned Programs: {[p.code for p in programs]}")
        
        # Check if there are any PENDING_HEAD subjects in these programs
        pending_in_scope = SubjectEnrollment.objects.filter(
            status='PENDING_HEAD',
            subject__program__in=programs
        )
        print(f"    Pending Subjects in Scope: {pending_in_scope.count()}")
    else:
        print(f"  Head: {head.get_full_name()} - NO PROFILE FOUND")

# 3. Check some PENDING_HEAD subjects and their programs
pending_samples = SubjectEnrollment.objects.filter(status='PENDING_HEAD')[:5]
if pending_samples.exists():
    print("\nSamples of PENDING_HEAD subjects:")
    for ps in pending_samples:
        print(f"  Subject: {ps.subject.code} | Program: {ps.subject.program.code if ps.subject.program else 'NONE'}")
else:
    print("\nNo PENDING_HEAD subjects found in the entire database.")

print("\n--- END REPORT ---")
