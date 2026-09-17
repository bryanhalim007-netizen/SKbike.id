"""Backend tests for unified backup export/import covering all datasets."""
import io
import json
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
# Fallback via frontend/.env if not present in env
if not BASE_URL:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass

ADMIN_EMAIL = "admin@skbike.id"
ADMIN_PASSWORD = "Admin@12345"

EXPECTED_KEYS = {
    "products", "sales", "services", "purchase_orders", "suppliers",
    "employees", "attendance", "price_history", "pos_transactions", "activity_logs",
}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/admin/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    if r.status_code != 200:
        # try /api/auth/login
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"no token in login response: {data}"
    return tok


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_backup_export_json_contains_all_datasets(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/backup/export",
                     params={"format": "json"}, headers=auth_headers, timeout=60)
    assert r.status_code == 200, r.text
    assert "application/json" in r.headers.get("content-type", "")
    payload = r.json()
    assert payload.get("type") == "skbike-backup"
    counts = payload.get("counts") or {}
    missing = EXPECTED_KEYS - set(counts.keys())
    assert not missing, f"Missing datasets in counts: {missing}"
    data = payload.get("data") or {}
    for k in EXPECTED_KEYS:
        assert k in data, f"data missing key {k}"
        assert isinstance(data[k], list)


def test_backup_export_excel(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/backup/export",
                     params={"format": "excel"}, headers=auth_headers, timeout=60)
    assert r.status_code == 200, r.text
    ct = r.headers.get("content-type", "")
    assert "spreadsheetml.sheet" in ct or "octet-stream" in ct, f"unexpected content-type: {ct}"
    # xlsx magic = PK zip header
    assert r.content[:2] == b"PK", "response is not a valid xlsx file"
    # Check sheet names present
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(r.content), read_only=True)
    sheet_titles = set(wb.sheetnames)
    expected_sheets = {"Penjualan", "Servis", "Pembelian", "Supplier", "Pegawai",
                       "Absensi", "RiwayatHarga", "TransaksiKasir", "LogAktivitas", "Produk"}
    missing = expected_sheets - sheet_titles
    assert not missing, f"missing sheets: {missing}"


def test_backup_import_merge_idempotent(auth_headers):
    # Export first
    r = requests.get(f"{BASE_URL}/api/admin/backup/export",
                     params={"format": "json"}, headers=auth_headers, timeout=60)
    assert r.status_code == 200
    files = {"file": ("backup.json", r.content, "application/json")}
    r2 = requests.post(f"{BASE_URL}/api/admin/backup/import",
                       params={"mode": "merge"}, headers=auth_headers, files=files, timeout=60)
    assert r2.status_code == 200, r2.text
    result = r2.json()
    assert isinstance(result, dict)


def test_backup_export_requires_auth():
    r = requests.get(f"{BASE_URL}/api/admin/backup/export",
                     params={"format": "json"}, timeout=20)
    assert r.status_code in (401, 403)
