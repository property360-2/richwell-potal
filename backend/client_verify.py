import os
import django
import sys
from django.test import Client
from django.contrib.auth import get_user_model
from django.urls import reverse

# Set up Django environment
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.auditing.models import AuditLog

User = get_user_model()

def run_client_e2e():
    print("🚀 Running E2E Verification using Django Client (with Middleware)...")
    
    # 1. Setup Actor
    head_reg = User.objects.filter(role='HEAD_REGISTRAR').first()
    if not head_reg:
        print("❌ Error: No Head Registrar found.")
        return
    
    print(f"👤 Actor: {head_reg.username}")
    
    # 2. Use Client (This runs the middleware stack)
    client = Client()
    client.force_login(head_reg)
    
    # Simulate Staff Creation
    staff_data = {
        'username': 'client_verify_reg',
        'email': 'client@test.com',
        'first_name': 'Client',
        'last_name': 'Test',
        'role': 'REGISTRAR'
    }
    
    User.objects.filter(username='client_verify_reg').delete()
    
    print("\n--- Test 1: Action via Client ---")
    # staff-list is the standard name for the StaffManagementViewSet list/create route
    response = client.post('/api/accounts/staff/', staff_data, content_type='application/json')
    
    if response.status_code == 201:
        print("✅ Staff created successfully.")
        
        # Verify Audit Log
        latest_log = AuditLog.objects.filter(model_name='User').order_by('-id').first()
        if latest_log and latest_log.user == head_reg:
            print(f"✅ SUCCESS: Log correctly attributed to {latest_log.user.username} via Middleware!")
        else:
            actor = latest_log.user.username if latest_log and latest_log.user else 'None'
            print(f"❌ FAILURE: Log actor is '{actor}'. Middleware might not be capturing context correctly.")
    else:
        print(f"❌ Failed to create staff. Status: {response.status_code}, Data: {response.json()}")

    # cleanup
    User.objects.filter(username='client_verify_reg').delete()

if __name__ == "__main__":
    run_client_e2e()
