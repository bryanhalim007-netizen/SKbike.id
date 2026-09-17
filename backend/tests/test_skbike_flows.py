"""SK BIKE.id backend flow tests: config, products, auth, POS checkout, attendance, PINs."""
import os
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "bryan.halim007@gmail.com"
ADMIN_PASSWORD = "tokosake321"
WA_NUMBER = "628125559681"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("role") == "super_admin" or data.get("user", {}).get("role") == "super_admin"
    return data["token"]


@pytest.fixture(scope="session")
def h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------- Public ----------------
class TestPublic:
    def test_config(self):
        r = requests.get(f"{BASE_URL}/api/config", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["whatsapp_number"] == WA_NUMBER
        assert isinstance(d.get("categories"), list) and len(d["categories"]) >= 1

    def test_products_list(self):
        r = requests.get(f"{BASE_URL}/api/products", timeout=15)
        assert r.status_code == 200
        prods = r.json()
        assert isinstance(prods, list)
        assert len(prods) >= 5, f"Expected seeded products, got {len(prods)}"
        # public should not leak price/cost_price
        for p in prods:
            assert "cost_price" not in p
            assert "id" in p and "name" in p and "category" in p


# ---------------- Auth ----------------
class TestAuth:
    def test_login_bad_pw(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, h):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=h, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_admin_stats_unauth(self):
        r = requests.get(f"{BASE_URL}/api/admin/stats", timeout=15)
        assert r.status_code == 401

    def test_admin_stats(self, h):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=h, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_products", "total_categories"):
            assert k in d
        assert d["total_products"] >= 1


# ---------------- PIN gating ----------------
class TestPins:
    def test_verify_produk_correct(self, h):
        r = requests.post(f"{BASE_URL}/api/admin/verify-pin", headers=h,
                          json={"scope": "produk", "pin": "1614"}, timeout=15)
        assert r.status_code == 200 and r.json()["ok"] is True

    def test_verify_produk_wrong(self, h):
        r = requests.post(f"{BASE_URL}/api/admin/verify-pin", headers=h,
                          json={"scope": "produk", "pin": "0000"}, timeout=15)
        assert r.status_code == 200 and r.json()["ok"] is False

    def test_verify_kasir_correct(self, h):
        r = requests.post(f"{BASE_URL}/api/admin/verify-pin", headers=h,
                          json={"scope": "kasir", "pin": "1515"}, timeout=15)
        assert r.status_code == 200 and r.json()["ok"] is True

    def test_verify_bad_scope(self, h):
        r = requests.post(f"{BASE_URL}/api/admin/verify-pin", headers=h,
                          json={"scope": "invalid", "pin": "1111"}, timeout=15)
        assert r.status_code == 400


# ---------------- POS Checkout ----------------
class TestPOS:
    def test_pos_checkout_math(self, h):
        # Grab a real product id from admin list to reference
        adm = requests.get(f"{BASE_URL}/api/admin/products", headers=h, timeout=15).json()
        assert adm, "No admin products available"
        pid = adm[0].get("_id") or adm[0].get("id")
        # Not all admin lists expose ObjectId; server accepts missing product_id (uses provided cost_price)
        payload = {
            "customer": "TEST_Cust",
            "customer_phone": "081234567890",
            "payment_method": "Cash",
            "amount_paid": 1000000,
            "discount": 0,
            "items": [
                {"product_id": None, "name": "TEST_Item A", "code": "TA", "qty": 2,
                 "unit_price": 250000, "cost_price": 200000},
                {"product_id": None, "name": "TEST_Item B", "code": "TB", "qty": 1,
                 "unit_price": 300000, "cost_price": 250000},
            ],
        }
        r = requests.post(f"{BASE_URL}/api/admin/pos/checkout", headers=h, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["subtotal"] == 800000
        assert tx["total"] == 800000
        assert tx["change"] == 200000
        assert len(tx["items"]) == 2

    def test_pos_empty_cart(self, h):
        r = requests.post(f"{BASE_URL}/api/admin/pos/checkout", headers=h,
                          json={"customer": "x", "payment_method": "Cash", "amount_paid": 0,
                                "discount": 0, "items": []}, timeout=15)
        assert r.status_code == 400

    def test_pos_with_discount(self, h):
        payload = {
            "customer": "TEST_Disc",
            "payment_method": "Cash",
            "amount_paid": 500000,
            "discount": 50000,
            "items": [{"product_id": None, "name": "TEST_D", "code": "D", "qty": 1,
                       "unit_price": 400000, "cost_price": 300000}],
        }
        r = requests.post(f"{BASE_URL}/api/admin/pos/checkout", headers=h, json=payload, timeout=30)
        assert r.status_code == 200
        tx = r.json()
        assert tx["subtotal"] == 400000
        assert tx["total"] == 350000
        assert tx["change"] == 150000


# ---------------- Attendance ----------------
class TestAttendance:
    _emp_id = None

    def test_create_employee(self, h):
        payload = {"nama": f"TEST_EMP_{uuid.uuid4().hex[:6]}", "umur": 25,
                   "alamat": "Test", "no_hp": "0812", "jabatan": "Kasir"}
        r = requests.post(f"{BASE_URL}/api/admin/employees", headers=h, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["nama"] == payload["nama"]
        TestAttendance._emp_id = d["id"]

    def test_mark_hadir(self, h):
        assert TestAttendance._emp_id
        r = requests.post(f"{BASE_URL}/api/admin/attendance", headers=h,
                          json={"employee_id": TestAttendance._emp_id, "date": "2026-01-15", "status": "Hadir"},
                          timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "Hadir"

    def test_mark_izin(self, h):
        r = requests.post(f"{BASE_URL}/api/admin/attendance", headers=h,
                          json={"employee_id": TestAttendance._emp_id, "date": "2026-01-16", "status": "Izin"},
                          timeout=15)
        assert r.status_code == 200

    def test_mark_invalid_status(self, h):
        r = requests.post(f"{BASE_URL}/api/admin/attendance", headers=h,
                          json={"employee_id": TestAttendance._emp_id, "date": "2026-01-17", "status": "BAD"},
                          timeout=15)
        assert r.status_code == 400

    def test_list_attendance(self, h):
        r = requests.get(f"{BASE_URL}/api/admin/attendance",
                         headers=h, params={"employee_id": TestAttendance._emp_id}, timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 2
        statuses = {row["status"] for row in rows}
        assert "Hadir" in statuses and "Izin" in statuses

    def test_delete_employee(self, h):
        r = requests.delete(f"{BASE_URL}/api/admin/employees/{TestAttendance._emp_id}",
                            headers=h, timeout=15)
        assert r.status_code == 200
