import os
import django
import sys

# Set up Django environment FIRST
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

# NOW import DRF and models
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from apps.accounts.views import StaffManagementViewSet
from apps.auditing.views import RegistrarActionLogViewSet
from apps.auditing.models import AuditLog

User = get_user_model()

def run_e2e_check():
    print("🚀 Running E2E Verification for Audit Logging...")
    
    # 1. Setup Actor (Head Registrar)
    head_reg = User.objects.filter(role='HEAD_REGISTRAR').first()
    if not head_reg:
        # Fallback to any user if no Head Registrar exists in this DB yet
        head_reg = User.objects.first()
        if not head_reg:
            print("❌ Error: No users found for testing.")
            return
        print(f"⚠️ Warning: No HEAD_REGISTRAR found, using {head_reg.username} instead.")
    
    print(f"👤 Actor: {head_reg.username} (Role: {head_reg.role})")
    
    # 2. Test CREATION via ViewSet
    print("\n--- Test 1: Log Creation ---")
    factory = APIRequestFactory()
    
    staff_data = {
        'username': 'test_reg_verify',
        'email': 'verify@test.com',
        'first_name': 'Test',
        'last_name': 'Registrar',
        'role': 'REGISTRAR',
        'department': 'Registrar'
    }
    
    User.objects.filter(username='test_reg_verify').delete()
    
    request = factory.post('/api/accounts/staff/', staff_data, format='json')
    force_authenticate(request, user=head_reg)
    
    view = StaffManagementViewSet.as_view({'post': 'create'})
    response = view(request)
    
    if response.status_code == 201:
        print("✅ Staff created successfully via API.")
        
        # Verify Audit Log
        latest_log = AuditLog.objects.filter(model_name='User').order_by('-id').first()
        if latest_log and latest_log.user == head_reg:
            print(f"✅ Log Entry Identified! ID: {latest_log.id}, Actor: {latest_log.user.username}")
        else:
            found_user = latest_log.user.username if latest_log and latest_log.user else 'None'
            print(f"❌ Failed to find log with correct actor. Found Actor: {found_user}")
    else:
        print(f"❌ Failed to create staff. Status: {response.status_code}, Data: {response.data}")
        return

    # 3. Test FETCHING via API
    print("\n--- Test 2: Log Fetching ---")
    fetch_request = factory.get('/api/auditing/registrar-history/')
    force_authenticate(fetch_request, user=head_reg)
    
    history_view = RegistrarActionLogViewSet.as_view({'get': 'list'})
    history_response = history_view(fetch_request)
    
    if history_response.status_code == 200:
        # RegistrarActionLogViewSet might return paginated results
        results = history_response.data.get('results', history_response.data)
        found = any(log['id'] == latest_log.id for log in results)
        
        if found:
            print(f"✅ SUCCESS: Log (ID: {latest_log.id}) found in API response!")
            print(f"📄 Total history items retrieved: {len(results)}")
        else:
            print(f"❌ Newly created log was NOT found in the API results.")
    else:
        print(f"❌ Failed to fetch action history via API. Status: {history_response.status_code}")

    # Cleanup
    User.objects.filter(username='test_reg_verify').delete()

if __name__ == "__main__":
    run_e2e_check()
