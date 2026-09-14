#!/usr/bin/env python3
"""
Test brute force with single session to verify IP consistency
"""
import requests

BASE_URL = "https://skbike-github-build.preview.emergentagent.com/api"
TEST_EMAIL = "single_session_test@x.com"

session = requests.Session()

print("Testing 6 consecutive login attempts with SAME session...")
for i in range(1, 7):
    resp = session.post(f"{BASE_URL}/auth/login", 
                       json={"email": TEST_EMAIL, "password": "wrong"},
                       timeout=30)
    print(f"Attempt {i}: Status {resp.status_code}, Detail: {resp.json().get('detail', 'N/A')}")

print("\nDone. If brute force works, attempt 6 should be 429.")
