"""Backend API tests for Velox Bike storefront."""
import os
import io
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "bryan.halim007@gmail.com"
ADMIN_PASSWORD = "velox2026"
CATEGORIES = ["Sepeda Gunung", "BMX", "Sepeda Anak", "Sepeda Lipat", "Sepeda Listrik"]


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["token"]
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------- Config / public ----------------
class TestPublic:
    def test_config(self, session):
        r = session.get(f"{BASE_URL}/api/config")
        assert r.status_code == 200
        data = r.json()
        assert data["whatsapp_number"] == "628125559681"
        assert data["categories"] == CATEGORIES

    def test_products_no_price(self, session):
        r = session.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        products = r.json()
        assert isinstance(products, list) and len(products) >= 1
        for p in products:
            assert "price" not in p, f"Price leaked in public API: {p}"
            assert "id" in p and "name" in p and "category" in p and "stock" in p

    def test_products_filter_by_category(self, session):
        r = session.get(f"{BASE_URL}/api/products", params={"category": "BMX"})
        assert r.status_code == 200
        data = r.json()
        assert all(p["category"] == "BMX" for p in data)


# ---------------- Auth ----------------
class TestAuth:
    def test_login_wrong_password(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login",
                         json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_login_sets_cookies(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login",
                         json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        # httpOnly cookies should be present in Set-Cookie headers
        cookies_header = r.headers.get("set-cookie", "").lower()
        assert "access_token" in cookies_header
        assert "httponly" in cookies_header

    def test_me_without_token(self, session):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL


# ---------------- Admin protected ----------------
class TestAdminProtection:
    def test_admin_products_unauth(self):
        r = requests.get(f"{BASE_URL}/api/admin/products")
        assert r.status_code == 401

    def test_admin_stats_unauth(self):
        r = requests.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 401


class TestAdminData:
    def test_admin_products_has_price(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/products", headers=auth_headers)
        assert r.status_code == 200
        products = r.json()
        assert len(products) >= 1
        for p in products:
            assert "price" in p, f"Admin product missing price: {p}"

    def test_admin_stats(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        for k in ("total_products", "total_categories", "in_stock", "inventory_value"):
            assert k in data
        assert data["total_products"] >= 1
        assert data["total_categories"] >= 1


# ---------------- CRUD ----------------
class TestAdminCRUD:
    created_id = None

    def test_create_invalid_category(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/admin/products", headers=auth_headers,
                          json={"name": "TEST_bad", "category": "InvalidCat", "price": 1000, "stock": 1})
        assert r.status_code == 400

    def test_create_product(self, auth_headers):
        payload = {
            "name": "TEST_Velox Test Bike",
            "category": "Sepeda Lipat",
            "description": "TEST product",
            "price": 5555000,
            "stock": 3,
            "status": "Tersedia",
            "image_url": "",
            "specs": {"frame": "Test", "transmisi": "7-speed", "rem": "V-brake",
                      "ukuran_roda": "20", "baterai_motor": "-"}
        }
        r = requests.post(f"{BASE_URL}/api/admin/products", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["price"] == 5555000
        assert data["category"] == "Sepeda Lipat"
        assert "id" in data
        TestAdminCRUD.created_id = data["id"]

        # verify appears in public list without price
        pub = requests.get(f"{BASE_URL}/api/products").json()
        match = [p for p in pub if p["id"] == data["id"]]
        assert match, "Created product not in public list"
        assert "price" not in match[0]

        # appears in admin list with price
        adm = requests.get(f"{BASE_URL}/api/admin/products", headers=auth_headers).json()
        match2 = [p for p in adm if p["id"] == data["id"]]
        assert match2 and match2[0]["price"] == 5555000

    def test_update_product(self, auth_headers):
        pid = TestAdminCRUD.created_id
        assert pid, "No product from create"
        r = requests.put(f"{BASE_URL}/api/admin/products/{pid}", headers=auth_headers,
                         json={"price": 6666000, "stock": 9, "status": "Stok Terbatas"})
        assert r.status_code == 200
        data = r.json()
        assert data["price"] == 6666000
        assert data["stock"] == 9
        assert data["status"] == "Stok Terbatas"

    def test_delete_product(self, auth_headers):
        pid = TestAdminCRUD.created_id
        r = requests.delete(f"{BASE_URL}/api/admin/products/{pid}", headers=auth_headers)
        assert r.status_code == 200
        # verify gone
        adm = requests.get(f"{BASE_URL}/api/admin/products", headers=auth_headers).json()
        assert all(p["id"] != pid for p in adm)

    def test_update_nonexistent(self, auth_headers):
        r = requests.put(f"{BASE_URL}/api/admin/products/507f1f77bcf86cd799439011",
                         headers=auth_headers, json={"price": 1})
        assert r.status_code == 404
