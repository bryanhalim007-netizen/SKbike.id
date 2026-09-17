"""Backend tests for new features: featured/reorder, per-color image_url, employee foto_url."""
import os
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "bryan.halim007@gmail.com"
ADMIN_PASSWORD = "velox2026"


@pytest.fixture(scope="module")
def auth():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def product(auth):
    payload = {
        "name": "TEST_FeatureFlow",
        "category": "BMX",
        "description": "d",
        "price": 1000000,
        "stock": 5,
        "status": "Tersedia",
        "image_url": "",
        "variants": [
            {"color": "Red", "hex": "#ff0000", "stock": 3, "image_url": "/api/products/image/test_red.jpg"},
            {"color": "Blue", "hex": "#0000ff", "stock": 2, "image_url": ""},
        ],
    }
    r = requests.post(f"{BASE_URL}/api/admin/products", headers=auth, json=payload)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    yield pid
    requests.delete(f"{BASE_URL}/api/admin/products/{pid}", headers=auth)


class TestVariantImageUrl:
    def test_variant_image_url_persisted_public(self, product):
        r = requests.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        prod = next((p for p in r.json() if p["id"] == product), None)
        assert prod is not None
        variants = prod.get("variants") or prod.get("colors") or []
        red = next((v for v in variants if v["color"].lower() == "red"), None)
        assert red is not None
        assert red.get("image_url") == "/api/products/image/test_red.jpg"

    def test_variant_image_url_persisted_admin(self, product, auth):
        r = requests.get(f"{BASE_URL}/api/admin/products", headers=auth)
        prod = next((p for p in r.json() if p["id"] == product), None)
        assert prod is not None
        variants = prod.get("variants") or prod.get("colors") or []
        red = next((v for v in variants if v["color"].lower() == "red"), None)
        assert red and red.get("image_url") == "/api/products/image/test_red.jpg"


class TestFeatured:
    def test_set_featured_true(self, product, auth):
        r = requests.put(f"{BASE_URL}/api/admin/products/{product}/featured",
                         headers=auth, json={"featured": True})
        assert r.status_code == 200
        assert r.json()["featured"] is True

        # verify via public list
        pubs = requests.get(f"{BASE_URL}/api/products").json()
        prod = next((p for p in pubs if p["id"] == product), None)
        assert prod and prod.get("featured") is True

    def test_featured_appears_first(self, product, auth):
        pubs = requests.get(f"{BASE_URL}/api/products").json()
        featured_ids = [p["id"] for p in pubs if p.get("featured")]
        assert product in featured_ids
        # All featured products come before any non-featured
        first_non_featured = next((i for i, p in enumerate(pubs) if not p.get("featured")), len(pubs))
        our_index = next(i for i, p in enumerate(pubs) if p["id"] == product)
        assert our_index < first_non_featured

    def test_unset_featured(self, product, auth):
        r = requests.put(f"{BASE_URL}/api/admin/products/{product}/featured",
                         headers=auth, json={"featured": False})
        assert r.status_code == 200
        assert r.json()["featured"] is False

    def test_featured_not_found(self, auth):
        r = requests.put(f"{BASE_URL}/api/admin/products/507f1f77bcf86cd799439011/featured",
                         headers=auth, json={"featured": True})
        assert r.status_code == 404

    def test_featured_unauth(self):
        r = requests.put(f"{BASE_URL}/api/admin/products/anyid/featured", json={"featured": True})
        assert r.status_code == 401


class TestReorder:
    def test_reorder_ok(self, auth, product):
        # get admin list
        prods = requests.get(f"{BASE_URL}/api/admin/products", headers=auth).json()
        ids = [p["id"] for p in prods]
        # put our product first
        new_order = [product] + [i for i in ids if i != product]
        r = requests.put(f"{BASE_URL}/api/admin/products/reorder", headers=auth,
                         json={"order": new_order})
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # verify: unset featured first then confirm sort_order
        requests.put(f"{BASE_URL}/api/admin/products/{product}/featured",
                     headers=auth, json={"featured": False})
        pubs = requests.get(f"{BASE_URL}/api/products").json()
        non_featured = [p for p in pubs if not p.get("featured")]
        assert non_featured and non_featured[0]["id"] == product

    def test_reorder_unauth(self):
        r = requests.put(f"{BASE_URL}/api/admin/products/reorder", json={"order": []})
        assert r.status_code == 401


class TestEmployeeFoto:
    _emp_id = None

    def test_create_employee_with_foto(self, auth):
        payload = {
            "nama": "TEST_Emp_Foto",
            "jabatan": "Kasir",
            "gaji_bulanan": 5000000,
            "foto_url": "/api/products/image/emp_photo.jpg",
        }
        r = requests.post(f"{BASE_URL}/api/admin/employees", headers=auth, json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["foto_url"] == "/api/products/image/emp_photo.jpg"
        assert data["nama"] == "TEST_Emp_Foto"
        TestEmployeeFoto._emp_id = data["id"]

    def test_get_employee_has_foto(self, auth):
        assert TestEmployeeFoto._emp_id
        r = requests.get(f"{BASE_URL}/api/admin/employees", headers=auth)
        assert r.status_code == 200
        emp = next((e for e in r.json() if e["id"] == TestEmployeeFoto._emp_id), None)
        assert emp and emp["foto_url"] == "/api/products/image/emp_photo.jpg"

    def test_update_employee_foto(self, auth):
        eid = TestEmployeeFoto._emp_id
        r = requests.put(f"{BASE_URL}/api/admin/employees/{eid}", headers=auth,
                         json={"foto_url": "/api/products/image/emp_photo2.jpg"})
        assert r.status_code == 200
        assert r.json()["foto_url"] == "/api/products/image/emp_photo2.jpg"

    def test_delete_employee(self, auth):
        eid = TestEmployeeFoto._emp_id
        r = requests.delete(f"{BASE_URL}/api/admin/employees/{eid}", headers=auth)
        assert r.status_code == 200
