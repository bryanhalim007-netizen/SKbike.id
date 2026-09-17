"""End-to-end backend tests for SKbike.id — auth (super+regular), PINs, sales, upload, employees."""
import os
import io
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

SUPER = {"email": "bryan.halim007@gmail.com", "password": "velox2026"}
REG = {"email": "skbike.id@store.com", "password": "bryanhalimm21"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def super_headers():
    return {"Authorization": f"Bearer {_login(SUPER)}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def reg_headers():
    return {"Authorization": f"Bearer {_login(REG)}", "Content-Type": "application/json"}


# ---------- Auth ----------
class TestAuth:
    def test_super_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER)
        assert r.status_code == 200
        data = r.json()
        assert data["is_super"] is True
        assert data["email"] == SUPER["email"]

    def test_regular_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json=REG)
        assert r.status_code == 200
        data = r.json()
        assert data.get("is_super") is False
        assert data["email"] == REG["email"]

    def test_me_super(self, super_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=super_headers)
        assert r.status_code == 200 and r.json()["is_super"] is True


# ---------- PIN gate ----------
class TestPins:
    def test_verify_produk_pin_ok(self, reg_headers):
        r = requests.post(f"{BASE_URL}/api/admin/verify-pin", headers=reg_headers,
                          json={"scope": "produk", "pin": "1614"})
        assert r.status_code == 200 and r.json()["ok"] is True

    def test_verify_produk_pin_wrong(self, reg_headers):
        r = requests.post(f"{BASE_URL}/api/admin/verify-pin", headers=reg_headers,
                          json={"scope": "produk", "pin": "0000"})
        assert r.status_code == 200 and r.json()["ok"] is False

    def test_verify_kasir_pin_ok(self, reg_headers):
        r = requests.post(f"{BASE_URL}/api/admin/verify-pin", headers=reg_headers,
                          json={"scope": "kasir", "pin": "1515"})
        assert r.status_code == 200 and r.json()["ok"] is True

    def test_verify_pin_bad_scope(self, reg_headers):
        r = requests.post(f"{BASE_URL}/api/admin/verify-pin", headers=reg_headers,
                          json={"scope": "bogus", "pin": "1111"})
        assert r.status_code == 400

    def test_pins_admin_only(self, reg_headers, super_headers):
        r = requests.get(f"{BASE_URL}/api/admin/pins", headers=reg_headers)
        assert r.status_code == 403
        r2 = requests.get(f"{BASE_URL}/api/admin/pins", headers=super_headers)
        assert r2.status_code == 200
        data = r2.json()
        assert data.get("produk") == "1614" and data.get("kasir") == "1515"


# ---------- Sales / Kasir ----------
class TestSales:
    created = {}

    def test_create_sale(self, reg_headers):
        payload = {
            "tanggal_penjualan": "2026-01-15",
            "nama_pembeli": "TEST_Buyer",
            "nama_barang": "TEST_Sepeda",
            "kode_barang": "TSTABC",
            "harga_modal": 1000000,
            "harga_jual": 1500000,
            "margin": 500000,
            "metode_pembayaran": "Cash",
            "sudah_diambil": "Sudah",
        }
        r = requests.post(f"{BASE_URL}/api/admin/sales", headers=reg_headers, json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["nama_barang"] == "TEST_Sepeda"
        assert data["harga_jual"] == 1500000
        TestSales.created["id"] = data["id"]

    def test_list_sales_contains(self, reg_headers):
        r = requests.get(f"{BASE_URL}/api/admin/sales", headers=reg_headers)
        assert r.status_code == 200
        ids = [s["id"] for s in r.json()]
        assert TestSales.created["id"] in ids

    def test_sales_summary(self, reg_headers):
        r = requests.get(f"{BASE_URL}/api/admin/sales/summary", headers=reg_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total_transactions"] >= 1
        assert data["total_revenue"] >= 1500000

    def test_sales_daily(self, reg_headers):
        r = requests.get(f"{BASE_URL}/api/admin/sales/daily?days=7", headers=reg_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 7
        assert all("date" in d and "revenue" in d for d in data)

    def test_delete_sale(self, reg_headers):
        sid = TestSales.created["id"]
        r = requests.delete(f"{BASE_URL}/api/admin/sales/{sid}", headers=reg_headers)
        assert r.status_code == 200


# ---------- Upload (object storage) ----------
class TestUpload:
    def test_upload_image(self, reg_headers):
        # 1x1 PNG
        png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
               b"\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01\x8b"
               b"\xd7\x14\xed\x00\x00\x00\x00IEND\xaeB`\x82")
        h = {"Authorization": reg_headers["Authorization"]}
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", headers=h, files=files, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "image_url" in data and data["image_url"].startswith("/api/products/image/")


# ---------- Admin management (super only) ----------
class TestAdminManagement:
    def test_list_admins_super(self, super_headers):
        r = requests.get(f"{BASE_URL}/api/admin/admins", headers=super_headers)
        assert r.status_code == 200
        data = r.json()
        emails = [a["email"].lower() for a in data]
        assert SUPER["email"] in emails
        assert REG["email"] in emails

    def test_list_admins_forbidden_for_regular(self, reg_headers):
        r = requests.get(f"{BASE_URL}/api/admin/admins", headers=reg_headers)
        assert r.status_code == 403


# ---------- Employees / Attendance ----------
class TestEmployees:
    created = {}

    def test_create_employee(self, reg_headers):
        r = requests.post(f"{BASE_URL}/api/admin/employees", headers=reg_headers,
                          json={"nama": "TEST_Employee", "umur": 25, "jabatan": "Kasir"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["nama"] == "TEST_Employee"
        TestEmployees.created["id"] = data["id"]

    def test_mark_attendance(self, reg_headers):
        eid = TestEmployees.created["id"]
        r = requests.post(f"{BASE_URL}/api/admin/attendance", headers=reg_headers,
                          json={"employee_id": eid, "date": "2026-01-15", "status": "Hadir"})
        assert r.status_code == 200
        assert r.json()["status"] == "Hadir"

    def test_list_attendance(self, reg_headers):
        eid = TestEmployees.created["id"]
        r = requests.get(f"{BASE_URL}/api/admin/attendance?employee_id={eid}", headers=reg_headers)
        assert r.status_code == 200
        assert any(a["date"] == "2026-01-15" for a in r.json())

    def test_delete_employee(self, reg_headers):
        eid = TestEmployees.created["id"]
        r = requests.delete(f"{BASE_URL}/api/admin/employees/{eid}", headers=reg_headers)
        assert r.status_code == 200
