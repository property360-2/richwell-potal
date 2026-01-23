from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.enrollment.services import DocumentReleaseService
from apps.enrollment.models import DocumentRelease

User = get_user_model()


class DocumentReleaseServiceTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', email='admin@example.com', password='pass', role=User.Role.ADMIN)
        self.student = User.objects.create_user(username='student', email='student@example.com', password='pass', role=User.Role.STUDENT)

    def test_create_and_revoke_release(self):
        release = DocumentReleaseService.create_release(
            student=self.student,
            document_type=DocumentRelease.DocumentType.TOR if hasattr(DocumentRelease.DocumentType, 'TOR') else DocumentRelease.DocumentType.choices[0][0],
            released_by=self.admin,
            purpose='Test release',
            copies=1
        )
        self.assertIsInstance(release, DocumentRelease)
        self.assertEqual(release.status, DocumentRelease.Status.ACTIVE)

        # revoke
        revoked = DocumentReleaseService.revoke_document(release, revoked_by=self.admin, reason='Mistake in issuance')
        self.assertEqual(revoked.status, DocumentRelease.Status.REVOKED)
