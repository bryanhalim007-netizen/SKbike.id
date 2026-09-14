#!/usr/bin/env python3
"""
SK Bike Backend Auth Testing
Tests all auth endpoints with cookie and Bearer token authentication
"""
import requests
import sys
import json
from typing import Dict, Any

# Read backend URL from frontend/.env
def get_backend_url():
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                return line.split('=', 1)[1].strip()
    return None

BASE_URL = get_backend_url()
if not BASE_URL:
    print("❌ ERROR: Could not read REACT_APP_BACKEND_URL from frontend/.env")
    sys.exit(1)

API_URL = f"{BASE_URL}/api"
print(f"🔗 Testing API at: {API_URL}\n")

# Admin credentials
ADMIN_EMAIL = "bryan.halim007@gmail.com"
ADMIN_PASSWORD = "velox2026"

# Test throwaway email for brute force testing
BRUTE_FORCE_EMAIL = "bruteforce_test@x.com"
WRONG_PASSWORD = "wrongpassword123"

# Test results tracking
test_results = []

def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append({"name": name, "passed": passed, "details": details})
    print(f"{status}: {name}")
    if details:
        print(f"   {details}")
    print()

def print_response(resp: requests.Response, show_body: bool = True):
    """Print response details for debugging"""
    print(f"   Status: {resp.status_code}")
    if show_body:
        try:
            body = resp.json()
            print(f"   Body: {json.dumps(body, indent=2)}")
        except:
            print(f"   Body: {resp.text[:200]}")
    print(f"   Cookies: {dict(resp.cookies)}")

# Test 1: Login with correct admin credentials
print("=" * 80)
print("TEST 1: POST /api/auth/login with correct admin credentials")
print("=" * 80)

session = requests.Session()
login_payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}

try:
    resp = session.post(f"{API_URL}/auth/login", json=login_payload, timeout=30)
    print_response(resp)
    
    if resp.status_code == 200:
        data = resp.json()
        
        # Check response structure
        has_id = "id" in data
        has_email = "email" in data
        has_name = "name" in data
        has_role = "role" in data
        has_token = "token" in data
        
        # Check cookies
        has_access_cookie = "access_token" in session.cookies
        has_refresh_cookie = "refresh_token" in session.cookies
        
        all_checks = all([has_id, has_email, has_name, has_role, has_token, has_access_cookie, has_refresh_cookie])
        
        if all_checks:
            bearer_token = data["token"]
            log_test(
                "Login returns 200 with user data, token, and httpOnly cookies",
                True,
                f"User: {data.get('email')}, Role: {data.get('role')}, Token present: {bool(bearer_token)}, Cookies: access_token={has_access_cookie}, refresh_token={has_refresh_cookie}"
            )
        else:
            missing = []
            if not has_id: missing.append("id")
            if not has_email: missing.append("email")
            if not has_name: missing.append("name")
            if not has_role: missing.append("role")
            if not has_token: missing.append("token")
            if not has_access_cookie: missing.append("access_token cookie")
            if not has_refresh_cookie: missing.append("refresh_token cookie")
            log_test(
                "Login returns 200 with user data, token, and httpOnly cookies",
                False,
                f"Missing fields: {', '.join(missing)}"
            )
    else:
        log_test(
            "Login returns 200 with user data, token, and httpOnly cookies",
            False,
            f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        )
except Exception as e:
    log_test("Login returns 200 with user data, token, and httpOnly cookies", False, f"Exception: {str(e)}")
    sys.exit(1)

# Test 2: GET /api/auth/me using cookies
print("=" * 80)
print("TEST 2: GET /api/auth/me using cookies from login")
print("=" * 80)

try:
    resp = session.get(f"{API_URL}/auth/me", timeout=30)
    print_response(resp)
    
    if resp.status_code == 200:
        data = resp.json()
        if "id" in data and "email" in data and data["email"] == ADMIN_EMAIL:
            log_test(
                "GET /api/auth/me with cookies returns 200 with admin user",
                True,
                f"User: {data.get('email')}, Role: {data.get('role')}"
            )
        else:
            log_test(
                "GET /api/auth/me with cookies returns 200 with admin user",
                False,
                f"Response missing expected fields or wrong user"
            )
    else:
        log_test(
            "GET /api/auth/me with cookies returns 200 with admin user",
            False,
            f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        )
except Exception as e:
    log_test("GET /api/auth/me with cookies returns 200 with admin user", False, f"Exception: {str(e)}")

# Test 3: GET /api/auth/me using Bearer token
print("=" * 80)
print("TEST 3: GET /api/auth/me using Authorization: Bearer token")
print("=" * 80)

try:
    # Create a new session without cookies
    no_cookie_session = requests.Session()
    headers = {"Authorization": f"Bearer {bearer_token}"}
    resp = no_cookie_session.get(f"{API_URL}/auth/me", headers=headers, timeout=30)
    print_response(resp)
    
    if resp.status_code == 200:
        data = resp.json()
        if "id" in data and "email" in data and data["email"] == ADMIN_EMAIL:
            log_test(
                "GET /api/auth/me with Bearer token returns 200 with admin user",
                True,
                f"User: {data.get('email')}, Role: {data.get('role')}"
            )
        else:
            log_test(
                "GET /api/auth/me with Bearer token returns 200 with admin user",
                False,
                f"Response missing expected fields or wrong user"
            )
    else:
        log_test(
            "GET /api/auth/me with Bearer token returns 200 with admin user",
            False,
            f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        )
except Exception as e:
    log_test("GET /api/auth/me with Bearer token returns 200 with admin user", False, f"Exception: {str(e)}")

# Test 4: POST /api/auth/refresh with valid refresh_token cookie
print("=" * 80)
print("TEST 4: POST /api/auth/refresh with valid refresh_token cookie")
print("=" * 80)

try:
    resp = session.post(f"{API_URL}/auth/refresh", timeout=30)
    print_response(resp)
    
    if resp.status_code == 200:
        data = resp.json()
        has_token = "token" in data
        has_new_access_cookie = "access_token" in session.cookies
        
        if has_token and has_new_access_cookie:
            new_bearer_token = data["token"]
            log_test(
                "POST /api/auth/refresh with valid cookie returns 200 with new token",
                True,
                f"New token received, access_token cookie updated"
            )
        else:
            log_test(
                "POST /api/auth/refresh with valid cookie returns 200 with new token",
                False,
                f"Missing token in response or access_token cookie not updated"
            )
    else:
        log_test(
            "POST /api/auth/refresh with valid cookie returns 200 with new token",
            False,
            f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        )
except Exception as e:
    log_test("POST /api/auth/refresh with valid cookie returns 200 with new token", False, f"Exception: {str(e)}")

# Test 5: POST /api/auth/refresh without refresh_token cookie
print("=" * 80)
print("TEST 5: POST /api/auth/refresh without refresh_token cookie (should fail)")
print("=" * 80)

try:
    no_cookie_session = requests.Session()
    resp = no_cookie_session.post(f"{API_URL}/auth/refresh", timeout=30)
    print_response(resp)
    
    if resp.status_code == 401:
        log_test(
            "POST /api/auth/refresh without cookie returns 401",
            True,
            f"Correctly rejected with 401"
        )
    else:
        log_test(
            "POST /api/auth/refresh without cookie returns 401",
            False,
            f"Expected 401, got {resp.status_code}"
        )
except Exception as e:
    log_test("POST /api/auth/refresh without cookie returns 401", False, f"Exception: {str(e)}")

# Test 6: Brute force protection
print("=" * 80)
print("TEST 6: Brute force protection (5 failed attempts -> 6th returns 429)")
print("=" * 80)
print(f"Using throwaway email: {BRUTE_FORCE_EMAIL} to avoid locking real admin\n")

brute_session = requests.Session()
brute_payload = {"email": BRUTE_FORCE_EMAIL, "password": WRONG_PASSWORD}

try:
    # First 5 attempts should return 401
    all_401 = True
    for i in range(1, 6):
        resp = brute_session.post(f"{API_URL}/auth/login", json=brute_payload, timeout=30)
        print(f"   Attempt {i}: Status {resp.status_code}")
        if resp.status_code != 401:
            all_401 = False
            print(f"   ⚠️  Expected 401, got {resp.status_code}")
    
    # 6th attempt should return 429
    resp = brute_session.post(f"{API_URL}/auth/login", json=brute_payload, timeout=30)
    print(f"   Attempt 6: Status {resp.status_code}")
    print_response(resp, show_body=True)
    
    if all_401 and resp.status_code == 429:
        log_test(
            "Brute force protection: 5 failed attempts return 401, 6th returns 429",
            True,
            f"Lockout message: {resp.json().get('detail', 'N/A')}"
        )
    else:
        log_test(
            "Brute force protection: 5 failed attempts return 401, 6th returns 429",
            False,
            f"First 5 all 401: {all_401}, 6th status: {resp.status_code}"
        )
except Exception as e:
    log_test("Brute force protection: 5 failed attempts return 401, 6th returns 429", False, f"Exception: {str(e)}")

# Test 7: POST /api/auth/logout
print("=" * 80)
print("TEST 7: POST /api/auth/logout clears cookies")
print("=" * 80)

try:
    # Use the original session that has cookies
    resp = session.post(f"{API_URL}/auth/logout", timeout=30)
    print_response(resp)
    
    if resp.status_code == 200:
        # Check if cookies are cleared (they should be empty or expired)
        # After logout, trying to access /me should fail
        me_resp = session.get(f"{API_URL}/auth/me", timeout=30)
        print(f"   After logout, GET /api/auth/me status: {me_resp.status_code}")
        
        if me_resp.status_code == 401:
            log_test(
                "POST /api/auth/logout returns 200 and clears cookies",
                True,
                f"Logout successful, subsequent /me request returns 401"
            )
        else:
            log_test(
                "POST /api/auth/logout returns 200 and clears cookies",
                False,
                f"Logout returned 200 but /me still returns {me_resp.status_code}"
            )
    else:
        log_test(
            "POST /api/auth/logout returns 200 and clears cookies",
            False,
            f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        )
except Exception as e:
    log_test("POST /api/auth/logout returns 200 and clears cookies", False, f"Exception: {str(e)}")

# Test 8: Verify admin can still login after all tests
print("=" * 80)
print("TEST 8: Verify real admin can still login successfully")
print("=" * 80)

try:
    final_session = requests.Session()
    resp = final_session.post(f"{API_URL}/auth/login", json=login_payload, timeout=30)
    print_response(resp)
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get("email") == ADMIN_EMAIL:
            log_test(
                "Real admin can still login successfully after all tests",
                True,
                f"Admin {ADMIN_EMAIL} logged in successfully"
            )
        else:
            log_test(
                "Real admin can still login successfully after all tests",
                False,
                f"Login succeeded but wrong user: {data.get('email')}"
            )
    else:
        log_test(
            "Real admin can still login successfully after all tests",
            False,
            f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        )
except Exception as e:
    log_test("Real admin can still login successfully after all tests", False, f"Exception: {str(e)}")

# Summary
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)

passed = sum(1 for t in test_results if t["passed"])
total = len(test_results)

print(f"\nTotal: {passed}/{total} tests passed\n")

for i, test in enumerate(test_results, 1):
    status = "✅" if test["passed"] else "❌"
    print(f"{i}. {status} {test['name']}")

if passed == total:
    print("\n🎉 ALL TESTS PASSED!")
    sys.exit(0)
else:
    print(f"\n⚠️  {total - passed} test(s) failed")
    sys.exit(1)
