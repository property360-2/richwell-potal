# Generated migration for dual approval tracking

from django.db import migrations, models


def backfill_approval_flags(apps, schema_editor):
    """Backfill approval flags for existing ENROLLED subject enrollments."""
    SubjectEnrollment = apps.get_model('enrollment', 'SubjectEnrollment')

    # All subjects with ENROLLED status should have both approvals set to True
    SubjectEnrollment.objects.filter(status='ENROLLED').update(
        payment_approved=True,
        head_approved=True
    )


class Migration(migrations.Migration):

    dependencies = [
        ('enrollment', '0007_add_pending_head_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='subjectenrollment',
            name='payment_approved',
            field=models.BooleanField(
                default=False,
                help_text='Whether first month payment requirement is satisfied'
            ),
        ),
        migrations.AddField(
            model_name='subjectenrollment',
            name='head_approved',
            field=models.BooleanField(
                default=False,
                help_text='Whether department head approval is complete'
            ),
        ),
        # Backfill existing data
        migrations.RunPython(backfill_approval_flags, migrations.RunPython.noop),
    ]
