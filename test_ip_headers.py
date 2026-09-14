#!/usr/bin/env python3
"""
Test to check what IP headers are available
"""
import requests

BASE_URL = "https://skbike-github-build.preview.emergentagent.com/api"

# Create a simple test endpoint response to see headers
session = requests.Session()

# Try to login and capture any debug info
resp = session.post(f"{BASE_URL}/auth/login", 
                    json={"email": "test_ip_check@x.com", "password": "wrong"},
                    timeout=30)

print(f"Status: {resp.status_code}")
print(f"Response: {resp.json()}")
print(f"\nRequest headers sent:")
for k, v in session.headers.items():
    print(f"  {k}: {v}")
