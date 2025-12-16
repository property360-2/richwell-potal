"""
Seed programs into the database
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.academics.models import Program

programs_data = [
    {
        'code': 'BSIT',
        'name': 'Bachelor of Science in Information Technology',
        'description': 'A program focused on computing technology and software development.',
        'duration_years': 4,
        'is_active': True
    },
    {
        'code': 'BSCS',
        'name': 'Bachelor of Science in Computer Science',
        'description': 'A program focused on computer science theory and programming.',
        'duration_years': 4,
        'is_active': True
    },
    {
        'code': 'BSIS',
        'name': 'Bachelor of Science in Information Systems',
        'description': 'A program focused on business information systems and enterprise solutions.',
        'duration_years': 4,
        'is_active': True
    },
    {
        'code': 'BSBA',
        'name': 'Bachelor of Science in Business Administration',
        'description': 'A program focused on business management and administration.',
        'duration_years': 4,
        'is_active': True
    },
    {
        'code': 'BSED',
        'name': 'Bachelor of Secondary Education',
        'description': 'A program preparing students to become high school teachers.',
        'duration_years': 4,
        'is_active': True
    },
    {
        'code': 'BEED',
        'name': 'Bachelor of Elementary Education',
        'description': 'A program preparing students to become elementary school teachers.',
        'duration_years': 4,
        'is_active': True
    },
    {
        'code': 'BSHM',
        'name': 'Bachelor of Science in Hospitality Management',
        'description': 'A program focused on hotel and restaurant management.',
        'duration_years': 4,
        'is_active': True
    },
    {
        'code': 'TVL-ICT',
        'name': 'Technical-Vocational Livelihood - ICT',
        'description': 'A 2-year technical-vocational track focused on Information and Communications Technology.',
        'duration_years': 2,
        'is_active': True
    },
    {
        'code': 'TVL-HE',
        'name': 'Technical-Vocational Livelihood - Home Economics',
        'description': 'A 2-year technical-vocational track focused on Home Economics and culinary arts.',
        'duration_years': 2,
        'is_active': True
    }
]

created_count = 0
updated_count = 0

for data in programs_data:
    program, created = Program.objects.update_or_create(
        code=data['code'],
        defaults={
            'name': data['name'],
            'description': data['description'],
            'duration_years': data['duration_years'],
            'is_active': data['is_active']
        }
    )
    if created:
        created_count += 1
        print(f"  Created: {program.code} - {program.name}")
    else:
        updated_count += 1
        print(f"  Updated: {program.code} - {program.name}")

print(f"\nTotal: {created_count} created, {updated_count} updated")
print(f"Programs in database: {Program.objects.count()}")
