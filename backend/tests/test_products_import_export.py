"""Tests for Admin Product Export/Import endpoints."""
import os
import io
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://skbike-deps-install.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "bryan.halim007@gmail.com"
ADMIN_PASSWORD = "velox2026"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok, f"no token in login response: {data}"
    return tok


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_export_requires_auth():
    r = requests.get(f"{BASE_URL}/api/admin/products/export?format=json", timeout=30)
    assert r.status_code in (401, 403)


def test_export_json(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/products/export?format=json", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    assert "application/json" in r.headers.get("content-type", "")
    assert "attachment" in r.headers.get("content-disposition", "").lower()
    data = r.json()
    assert "count" in data and "products" in data
    assert isinstance(data["products"], list)
    assert data["count"] == len(data["products"])
    # Cost price should be present
    if data["products"]:
        assert "cost_price" in data["products"][0]


def test_export_excel(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/products/export?format=excel", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    assert "spreadsheet" in r.headers.get("content-type", "")
    assert r.content[:2] == b"PK"  # xlsx is a zip


def test_import_merge_json_updates_and_creates(auth_headers):
    # First export to get baseline
    r = requests.get(f"{BASE_URL}/api/admin/products/export?format=json", headers=auth_headers, timeout=30)
    baseline = r.json()
    baseline_total = baseline["count"]

    payload = {
        "products": [
            {
                "name": "TEST Import Bike Alpha",
                "code": "TST-IMP-001",
                "category": "Sepeda Gunung",
                "price": 1500000,
                "cost_price": 900000,
                "variants": [{"color": "Merah", "stock": 3}, {"color": "Hitam", "stock": 2}],
            }
        ]
    }
    files = {"file": ("test_import.json", json.dumps(payload).encode("utf-8"), "application/json")}
    r = requests.post(f"{BASE_URL}/api/admin/products/import?mode=merge", headers=auth_headers, files=files, timeout=30)
    assert r.status_code == 200, r.text
    result = r.json()
    assert result["mode"] == "merge"
    assert result["parsed"] == 1
    assert result["created"] + result["updated"] == 1

    # Re-import same file -> should update, not create duplicate
    files = {"file": ("test_import.json", json.dumps(payload).encode("utf-8"), "application/json")}
    r2 = requests.post(f"{BASE_URL}/api/admin/products/import?mode=merge", headers=auth_headers, files=files, timeout=30)
    assert r2.status_code == 200
    r2j = r2.json()
    assert r2j["updated"] == 1
    assert r2j["created"] == 0

    # Verify presence
    r3 = requests.get(f"{BASE_URL}/api/admin/products/export?format=json", headers=auth_headers, timeout=30)
    after = r3.json()
    names = [p["name"] for p in after["products"]]
    assert "TEST Import Bike Alpha" in names
    # Total should be baseline + 1 (or same if it existed)
    assert after["count"] >= baseline_total


def test_import_invalid_mode(auth_headers):
    files = {"file": ("x.json", b'{"products":[]}', "application/json")}
    r = requests.post(f"{BASE_URL}/api/admin/products/import?mode=bogus", headers=auth_headers, files=files, timeout=30)
    assert r.status_code == 400


def test_import_unsupported_format(auth_headers):
    files = {"file": ("x.txt", b"hello", "text/plain")}
    r = requests.post(f"{BASE_URL}/api/admin/products/import?mode=merge", headers=auth_headers, files=files, timeout=30)
    assert r.status_code == 400


def test_import_excel_roundtrip(auth_headers):
    # Fetch Excel export
    r = requests.get(f"{BASE_URL}/api/admin/products/export?format=excel", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    xlsx_bytes = r.content
    files = {"file": ("produk.xlsx", xlsx_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r2 = requests.post(f"{BASE_URL}/api/admin/products/import?mode=merge", headers=auth_headers, files=files, timeout=60)
    assert r2.status_code == 200, r2.text
    j = r2.json()
    assert j["mode"] == "merge"
    # All items should be updates (already exist by code/name)
    assert j["updated"] >= 1
