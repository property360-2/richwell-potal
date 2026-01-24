from django.test import TestCase
from apps.core.utils import api_response, generate_signed_token, verify_signed_token


class UtilsTestCase(TestCase):
    def test_api_response_success(self):
        resp = api_response(True, data={"a": 1})
        self.assertTrue(resp.data["success"])
        self.assertEqual(resp.data["data"], {"a": 1})
        self.assertIsNone(resp.data["error"])

    def test_signed_token_roundtrip(self):
        token = generate_signed_token(123, expiry_hours=1)
        doc_id = verify_signed_token(token)
        self.assertEqual(doc_id, 123)
