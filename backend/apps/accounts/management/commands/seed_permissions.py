"""
Management command to seed initial permissions and categories.
Run with: python manage.py seed_permissions
"""

from django.core.management.base import BaseCommand
from apps.accounts.models import PermissionCategory, Permission


class Command(BaseCommand):
    help = 'Seed permission categories and permissions'

    # Permission structure: 40+ permissions across 10 categories
    PERMISSION_STRUCTURE = {
        'program_management': {
            'name': 'Program Management',
            'icon': 'graduation-cap',
            'order': 1,
            'description': 'Permissions related to academic program management',
            'permissions': [
                {
                    'code': 'program.view',
                    'name': 'View Programs',
                    'description': 'Can view list of academic programs',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'program.create',
                    'name': 'Create Programs',
                    'description': 'Can create new academic programs',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'program.edit',
                    'name': 'Edit Programs',
                    'description': 'Can edit existing academic programs',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'program.delete',
                    'name': 'Delete Programs',
                    'description': 'Can delete academic programs',
                    'default_roles': ['ADMIN']
                },
            ]
        },
        'subject_management': {
            'name': 'Subject Management',
            'icon': 'book-open',
            'order': 2,
            'description': 'Permissions related to subject/course management',
            'permissions': [
                {
                    'code': 'subject.view',
                    'name': 'View Subjects',
                    'description': 'Can view list of subjects',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'PROFESSOR']
                },
                {
                    'code': 'subject.create',
                    'name': 'Create Subjects',
                    'description': 'Can create new subjects',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'subject.edit',
                    'name': 'Edit Subjects',
                    'description': 'Can edit existing subjects',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'subject.delete',
                    'name': 'Delete Subjects',
                    'description': 'Can delete subjects',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR']
                },
            ]
        },
        'schedule_management': {
            'name': 'Schedule Management',
            'icon': 'calendar',
            'order': 3,
            'description': 'Permissions related to class schedule management',
            'permissions': [
                {
                    'code': 'schedule.view',
                    'name': 'View All Schedules',
                    'description': 'Can view all class schedules',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'PROFESSOR']
                },
                {
                    'code': 'schedule.edit',
                    'name': 'Edit Class Schedules',
                    'description': 'Can edit class schedules',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'schedule.create',
                    'name': 'Create Schedules',
                    'description': 'Can create new class schedules',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'schedule.override',
                    'name': 'Override Schedule Conflicts',
                    'description': 'Can override schedule conflict validations',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR']
                },
            ]
        },
        'enrollment_management': {
            'name': 'Enrollment Management',
            'icon': 'user-plus',
            'order': 4,
            'description': 'Permissions related to student enrollment',
            'permissions': [
                {
                    'code': 'enrollment.view',
                    'name': 'View Enrollments',
                    'description': 'Can view student enrollments',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'enrollment.override',
                    'name': 'Override Enrollment Rules',
                    'description': 'Can override enrollment validation rules',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'enrollment.approve',
                    'name': 'Approve Enrollments',
                    'description': 'Can approve student enrollments',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD']
                },
                {
                    'code': 'enrollment.reject',
                    'name': 'Reject Enrollments',
                    'description': 'Can reject student enrollments',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD']
                },
            ]
        },
        'grade_management': {
            'name': 'Grade Management',
            'icon': 'award',
            'order': 5,
            'description': 'Permissions related to grade management',
            'permissions': [
                {
                    'code': 'grade.view',
                    'name': 'View All Grades',
                    'description': 'Can view all student grades',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'grade.submit',
                    'name': 'Submit Grades',
                    'description': 'Can submit student grades',
                    'default_roles': ['ADMIN', 'PROFESSOR']
                },
                {
                    'code': 'grade.edit',
                    'name': 'Edit Grades',
                    'description': 'Can edit submitted grades',
                    'default_roles': ['ADMIN', 'PROFESSOR']
                },
                {
                    'code': 'grade.finalize',
                    'name': 'Finalize Grades',
                    'description': 'Can finalize grades for a section',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'grade.override',
                    'name': 'Override Grades',
                    'description': 'Can override finalized grades',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR']
                },
            ]
        },
        'payment_management': {
            'name': 'Payment Management',
            'icon': 'dollar-sign',
            'order': 6,
            'description': 'Permissions related to payment processing',
            'permissions': [
                {
                    'code': 'payment.view',
                    'name': 'View Payments',
                    'description': 'Can view payment records',
                    'default_roles': ['ADMIN', 'CASHIER', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'payment.record',
                    'name': 'Record Payments',
                    'description': 'Can record new payments',
                    'default_roles': ['ADMIN', 'CASHIER']
                },
                {
                    'code': 'payment.adjust',
                    'name': 'Adjust Payments',
                    'description': 'Can adjust payment amounts',
                    'default_roles': ['ADMIN', 'CASHIER']
                },
                {
                    'code': 'payment.void',
                    'name': 'Void Payments',
                    'description': 'Can void payment transactions',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR']
                },
            ]
        },
        'document_management': {
            'name': 'Document Management',
            'icon': 'file-text',
            'order': 7,
            'description': 'Permissions related to document handling',
            'permissions': [
                {
                    'code': 'document.view',
                    'name': 'View Documents',
                    'description': 'Can view student documents',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'document.release',
                    'name': 'Release Documents',
                    'description': 'Can release official documents',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'document.revoke',
                    'name': 'Revoke Documents',
                    'description': 'Can revoke released documents',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'document.verify',
                    'name': 'Verify Documents',
                    'description': 'Can verify document authenticity',
                    'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
                },
            ]
        },
        'audit_access': {
            'name': 'Audit & Logs',
            'icon': 'shield',
            'order': 8,
            'description': 'Permissions related to audit log access',
            'permissions': [
                {
                    'code': 'audit.view_all',
                    'name': 'View All Audit Logs',
                    'description': 'Can view all system audit logs',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR']
                },
                {
                    'code': 'audit.view_registrar',
                    'name': 'View Registrar Audit Logs',
                    'description': 'Can view registrar-specific audit logs',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR']
                },
                {
                    'code': 'audit.export',
                    'name': 'Export Audit Logs',
                    'description': 'Can export audit logs to file',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR']
                },
            ]
        },
        'user_management': {
            'name': 'User Management',
            'icon': 'users',
            'order': 9,
            'description': 'Permissions related to user account management',
            'permissions': [
                {
                    'code': 'user.view',
                    'name': 'View Users',
                    'description': 'Can view user accounts',
                    'default_roles': ['ADMIN']
                },
                {
                    'code': 'user.create',
                    'name': 'Create Users',
                    'description': 'Can create new user accounts',
                    'default_roles': ['ADMIN']
                },
                {
                    'code': 'user.edit',
                    'name': 'Edit Users',
                    'description': 'Can edit user account details',
                    'default_roles': ['ADMIN']
                },
                {
                    'code': 'user.delete',
                    'name': 'Delete Users',
                    'description': 'Can delete user accounts',
                    'default_roles': ['ADMIN']
                },
                {
                    'code': 'user.impersonate',
                    'name': 'Impersonate Users',
                    'description': 'Can impersonate other users',
                    'default_roles': ['ADMIN']
                },
                {
                    'code': 'user.manage_permissions',
                    'name': 'Manage User Permissions',
                    'description': 'Can grant/revoke user permissions',
                    'default_roles': ['ADMIN']
                },
            ]
        },
        'system_configuration': {
            'name': 'System Configuration',
            'icon': 'settings',
            'order': 10,
            'description': 'Permissions related to system settings',
            'permissions': [
                {
                    'code': 'system.view_config',
                    'name': 'View System Config',
                    'description': 'Can view system configuration',
                    'default_roles': ['ADMIN']
                },
                {
                    'code': 'system.edit_config',
                    'name': 'Edit System Config',
                    'description': 'Can edit system configuration',
                    'default_roles': ['ADMIN']
                },
                {
                    'code': 'system.manage_semesters',
                    'name': 'Manage Semesters',
                    'description': 'Can manage academic semesters',
                    'default_roles': ['ADMIN', 'HEAD_REGISTRAR']
                },
            ]
        }
    }

    def handle(self, *args, **options):
        """Seed permissions into the database"""
        self.stdout.write(self.style.WARNING('Starting permission seeding...'))

        categories_created = 0
        permissions_created = 0
        permissions_updated = 0

        for category_code, category_data in self.PERMISSION_STRUCTURE.items():
            # Create or update category
            category, created = PermissionCategory.objects.update_or_create(
                code=category_code,
                defaults={
                    'name': category_data['name'],
                    'icon': category_data['icon'],
                    'order': category_data['order'],
                    'description': category_data.get('description', '')
                }
            )

            if created:
                categories_created += 1
                self.stdout.write(f'  Created category: {category.name}')
            else:
                self.stdout.write(f'  Updated category: {category.name}')

            # Create or update permissions in this category
            for perm_data in category_data['permissions']:
                permission, created = Permission.objects.update_or_create(
                    code=perm_data['code'],
                    defaults={
                        'category': category,
                        'name': perm_data['name'],
                        'description': perm_data.get('description', ''),
                        'default_for_roles': perm_data['default_roles']
                    }
                )

                if created:
                    permissions_created += 1
                    self.stdout.write(f'    [+] Created: {permission.code}')
                else:
                    permissions_updated += 1
                    self.stdout.write(f'    [*] Updated: {permission.code}')

        self.stdout.write(self.style.SUCCESS(f'\nSeeding complete!'))
        self.stdout.write(self.style.SUCCESS(f'Categories: {categories_created} created, {len(self.PERMISSION_STRUCTURE) - categories_created} updated'))
        self.stdout.write(self.style.SUCCESS(f'Permissions: {permissions_created} created, {permissions_updated} updated'))
        self.stdout.write(self.style.SUCCESS(f'Total permissions: {Permission.objects.count()}'))
