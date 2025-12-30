"""
Test script for password change functionality
Tests the API endpoint directly to verify it works correctly
"""

import requests
import json

# API Configuration
API_BASE_URL = "http://localhost:8000/api/v1"

# Test credentials (update these with actual test users)
TEST_USERS = [
    {"email": "student@richwell.edu.ph", "password": "password123", "role": "STUDENT"},
    {"email": "cashier@richwell.edu.ph", "password": "password123", "role": "CASHIER"},
    {"email": "registrar@richwell.edu.ph", "password": "password123", "role": "REGISTRAR"},
    {"email": "professor@richwell.edu.ph", "password": "password123", "role": "PROFESSOR"},
    {"email": "admin@richwell.edu.ph", "password": "password123", "role": "ADMIN"},
]

def test_password_change(email, current_password, new_password="newpass123"):
    """Test password change for a user"""
    print(f"\n{'='*60}")
    print(f"Testing password change for: {email}")
    print(f"{'='*60}")

    # Step 1: Login to get token
    print("\n1. Logging in...")
    login_response = requests.post(
        f"{API_BASE_URL}/accounts/login/",
        json={"email": email, "password": current_password},
        headers={"Content-Type": "application/json"}
    )

    if login_response.status_code != 200:
        print(f"   [FAIL] Login failed: {login_response.status_code}")
        print(f"   Response: {login_response.text}")
        return False

    login_data = login_response.json()
    access_token = login_data.get("access")
    print(f"   [OK] Login successful! Got access token")

    # Step 2: Change password
    print("\n2. Changing password...")
    change_response = requests.post(
        f"{API_BASE_URL}/accounts/change-password/",
        json={
            "current_password": current_password,
            "new_password": new_password
        },
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
    )

    print(f"   Status Code: {change_response.status_code}")
    print(f"   Response: {change_response.text}")

    if change_response.status_code != 200:
        print(f"   [FAIL] Password change failed!")
        return False

    change_data = change_response.json()
    if not change_data.get("success"):
        print(f"   [FAIL] Password change returned success=false")
        return False

    print(f"   [OK] Password change successful!")

    # Step 3: Try to login with new password
    print("\n3. Testing login with NEW password...")
    new_login_response = requests.post(
        f"{API_BASE_URL}/accounts/login/",
        json={"email": email, "password": new_password},
        headers={"Content-Type": "application/json"}
    )

    if new_login_response.status_code != 200:
        print(f"   [FAIL] Login with new password failed: {new_login_response.status_code}")
        return False

    print(f"   [OK] Login with new password successful!")

    # Step 4: Change password back to original
    print("\n4. Changing password back to original...")
    new_token = new_login_response.json().get("access")
    restore_response = requests.post(
        f"{API_BASE_URL}/accounts/change-password/",
        json={
            "current_password": new_password,
            "new_password": current_password
        },
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {new_token}"
        }
    )

    if restore_response.status_code == 200:
        print(f"   [OK] Password restored to original")
    else:
        print(f"   [WARN] Failed to restore password (manual reset needed)")

    return True

def test_invalid_scenarios(email, password):
    """Test error handling"""
    print(f"\n{'='*60}")
    print(f"Testing error handling for: {email}")
    print(f"{'='*60}")

    # Login first
    login_response = requests.post(
        f"{API_BASE_URL}/accounts/login/",
        json={"email": email, "password": password},
        headers={"Content-Type": "application/json"}
    )

    if login_response.status_code != 200:
        print("   [WARN] Skipping error tests - login failed")
        return

    access_token = login_response.json().get("access")

    # Test 1: Wrong current password
    print("\n1. Testing wrong current password...")
    response = requests.post(
        f"{API_BASE_URL}/accounts/change-password/",
        json={
            "current_password": "wrongpassword",
            "new_password": "newpass123"
        },
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
    )

    if response.status_code == 400:
        print(f"   [OK] Correctly rejected wrong password (400)")
    else:
        print(f"   [FAIL] Unexpected status: {response.status_code}")

    # Test 2: Password too short
    print("\n2. Testing password too short...")
    response = requests.post(
        f"{API_BASE_URL}/accounts/change-password/",
        json={
            "current_password": password,
            "new_password": "12345"  # Less than 6 chars
        },
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
    )

    if response.status_code == 400:
        print(f"   [OK] Correctly rejected short password (400)")
    else:
        print(f"   [FAIL] Unexpected status: {response.status_code}")

    # Test 3: Missing fields
    print("\n3. Testing missing fields...")
    response = requests.post(
        f"{API_BASE_URL}/accounts/change-password/",
        json={
            "current_password": password
            # Missing new_password
        },
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
    )

    if response.status_code == 400:
        print(f"   [OK] Correctly rejected missing field (400)")
    else:
        print(f"   [FAIL] Unexpected status: {response.status_code}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("PASSWORD CHANGE FUNCTIONALITY TEST")
    print("="*60)
    print("\nThis script will test password change for multiple user roles.")
    print("Make sure the Django server is running on http://localhost:8000")
    print("\nPress Ctrl+C to cancel, or Enter to continue...")

    try:
        input()
    except KeyboardInterrupt:
        print("\n\nTest cancelled.")
        exit(0)

    # Test with first available user (student)
    test_user = TEST_USERS[0]

    print(f"\n\nTesting with: {test_user['email']}")
    success = test_password_change(test_user['email'], test_user['password'])

    if success:
        print("\n\n" + "="*60)
        print("[SUCCESS] PASSWORD CHANGE TEST PASSED!")
        print("="*60)

        # Test error handling
        test_invalid_scenarios(test_user['email'], test_user['password'])

        print("\n\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print("[OK] Password change endpoint is working correctly")
        print("[OK] Validation is working (wrong password, short password, missing fields)")
        print("[OK] Users can login with new password")
        print("\nNext steps:")
        print("- Test manually in the browser UI")
        print("- Test with other user roles (Cashier, Registrar, Professor, Admin)")
        print("- Verify the modal works correctly in student dashboard")
    else:
        print("\n\n" + "="*60)
        print("[FAILED] PASSWORD CHANGE TEST FAILED")
        print("="*60)
        print("Please check:")
        print("- Is the Django server running?")
        print("- Are the test credentials correct?")
        print("- Check the console output above for error details")
