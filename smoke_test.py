#!/usr/bin/env python3
import urllib.request
import urllib.error
import json
import sys

BASE_URL = 'http://localhost:5000/api'

def test_endpoint(method, path, data=None, headers=None):
    """Test an API endpoint"""
    if headers is None:
        headers = {}
    
    url = f"{BASE_URL}{path}"
    headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8') if data else None,
        headers=headers,
        method=method
    )
    
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode('utf-8'))
        return response.status, result
    except urllib.error.HTTPError as e:
        try:
            error_data = json.loads(e.read().decode('utf-8'))
        except:
            error_data = {"error": str(e)}
        return e.code, error_data

# Test 1: Health Check
print("\n" + "="*60)
print("TEST 1: Health Check")
print("="*60)
status, result = test_endpoint('GET', '/health')
print(f"GET /api/health → {status}")
print(json.dumps(result, indent=2))
print("✅ PASS" if status == 200 else f"❌ FAIL ({status})")

# Test 2: Register User
print("\n" + "="*60)
print("TEST 2: Register User")
print("="*60)
register_data = {
    "name": "Test User",
    "email": "test@logistic18.com",
    "password": "TestPassword123",
    "orgId": "org-test-001"
}
status, result = test_endpoint('POST', '/auth/register', register_data)
print(f"POST /api/auth/register → {status}")
print(json.dumps(result, indent=2))
print("✅ PASS" if status == 201 else f"❌ FAIL ({status})")

# Test 3: Login
print("\n" + "="*60)
print("TEST 3: Login")
print("="*60)
login_data = {
    "email": "test@logistic18.com",
    "password": "TestPassword123"
}
status, result = test_endpoint('POST', '/auth/login', login_data)
print(f"POST /api/auth/login → {status}")
print(json.dumps(result, indent=2))
token = result.get('accessToken', None)
print(f"Token: {token[:50]}..." if token else "No token!")
print("✅ PASS" if status == 200 and token else f"❌ FAIL ({status})")

# Test 4-8: Protected Endpoints
protected_tests = [
    ('GET', '/suppliers', 'Suppliers'),
    ('GET', '/shipments', 'Shipments'),
    ('GET', '/inventory', 'Inventory'),
    ('GET', '/alerts', 'Alerts'),
    ('GET', '/analytics/dashboard', 'Analytics'),
]

if token:
    headers = {'Authorization': f'Bearer {token}'}
    for i, (method, path, name) in enumerate(protected_tests, 4):
        print("\n" + "="*60)
        print(f"TEST {i}: {name}")
        print("="*60)
        status, result = test_endpoint(method, path, headers=headers)
        print(f"{method} /api{path} → {status}")
        if isinstance(result, dict) and 'error' not in result:
            print(json.dumps(result, indent=2)[:200] + "..." if len(str(result)) > 200 else json.dumps(result, indent=2))
        else:
            print(json.dumps(result, indent=2))
        is_success = status in [200, 201]
        print("✅ PASS" if is_success else f"❌ FAIL ({status})")
else:
    print("\n❌ Skipping protected endpoint tests - no token")

print("\n" + "="*60)
print("SMOKE TEST COMPLETE")
print("="*60)
