import requests

# Get token via login
login_url = 'http://localhost:8000/api/accounts/auth/login/'
creds = {'username': 'admin', 'password': 'admin1234'} # Common seed password

try:
    print(f"Attempting login to {login_url}")
    r = requests.post(login_url, json=creds)
    r.raise_for_status()
    tokens = r.json()
    access_token = tokens['access']
    print("Login success. Got token.")

    me_url = 'http://localhost:8000/api/accounts/auth/me/'
    headers = {'Authorization': f'Bearer {access_token}'}
    r = requests.get(me_url, headers=headers)
    r.raise_for_status()
    print("ME Response:")
    print(r.json())
except Exception as e:
    print(f"Error: {e}")
    if 'r' in locals():
        print(f"Response: {r.text}")
