# Generated migration for PENDING_HEAD status

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollment', '0006_merge_20251213_2237'),
    ]

    operations = [
        migrations.AlterField(
            model_name='subjectenrollment',
            name='status',
            field=models.CharField(
                choices=[
                    ('ENROLLED', 'Enrolled'),
                    ('PENDING_PAYMENT', 'Pending Payment'),
                    ('PENDING_HEAD', 'Pending Head Approval'),
                    ('DROPPED', 'Dropped'),
                    ('PASSED', 'Passed'),
                    ('FAILED', 'Failed'),
                    ('INC', 'Incomplete'),
                    ('CREDITED', 'Credited'),
                ],
                default='ENROLLED',
                max_length=20
            ),
        ),
    ]
