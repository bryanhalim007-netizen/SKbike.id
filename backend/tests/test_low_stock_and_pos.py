"""Tests for POS stock auto-deduct and /admin/low-stock endpoint."""
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
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def _pick_product(products):
    # Prefer product with stock >= 2 and no variants complexity if possible
    candidates = [p for p in products if int(p.get("stock", 0) or 0) >= 2]
    assert candidates, "No product with stock >= 2 found"
    # prefer simple ones (no sizes/variants) for cleaner test
    simple = [p for p in candidates if not p.get("sizes") and not p.get("variants")]
    return simple[0] if simple else candidates[0]


class TestLowStockEndpoint:
    def test_shape_and_consistency(self, auth):
        r = requests.get(f"{BASE_URL}/api/admin/low-stock", headers=auth, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("threshold") == 3
        assert isinstance(data.get("out_of_stock"), list)
        assert isinstance(data.get("low_stock"), list)
        assert data.get("count") == len(data["out_of_stock"]) + len(data["low_stock"])
        # Validate bucket rules
        for it in data["out_of_stock"]:
            assert it["stock"] <= 0
            assert "id" in it and "name" in it
        for it in data["low_stock"]:
            assert 1 <= it["stock"] <= 3
            assert "id" in it and "name" in it

    def test_auth_required(self):
        r = requests.get(f"{BASE_URL}/api/admin/low-stock", timeout=15)
        assert r.status_code in (401, 403)


class TestPosCheckoutDecrementsStock:
    def test_checkout_decrements_stock(self, auth):
        r = requests.get(f"{BASE_URL}/api/admin/products", headers=auth, timeout=30)
        assert r.status_code == 200, r.text
        products = r.json()
        prod = _pick_product(products)
        pid = prod["id"]
        before = int(prod.get("stock", 0) or 0)
        # figure out a color/size that has stock (if nested)
        color = None
        size = None
        sizes = prod.get("sizes") or []
        variants = prod.get("variants") or []
        if sizes:
            size_obj = max(sizes, key=lambda s: sum(int(c.get("stock", 0)) for c in (s.get("colors") or [])))
            size = size_obj.get("label")
            cols = size_obj.get("colors") or []
            if cols:
                c = max(cols, key=lambda c: int(c.get("stock", 0)))
                color = c.get("color")
        elif variants:
            v = max(variants, key=lambda v: int(v.get("stock", 0)))
            color = v.get("color")

        payload = {
            "items": [{
                "product_id": pid,
                "name": prod.get("name"),
                "code": prod.get("code", ""),
                "color": color,
                "size": size,
                "qty": 1,
                "unit_price": 1000.0,
            }],
            "discount": 0,
            "amount_paid": 1000.0,
            "payment_method": "Cash",
            "customer": "TEST_STOCK",
            "taken_status": "Sudah",
        }
        r2 = requests.post(f"{BASE_URL}/api/admin/pos/checkout", headers=auth, json=payload, timeout=60)
        assert r2.status_code == 200, r2.text
        tx = r2.json()
        assert tx.get("id") and tx.get("items")

        # Verify stock decreased by 1
        r3 = requests.get(f"{BASE_URL}/api/admin/products", headers=auth, timeout=30)
        assert r3.status_code == 200
        after_prod = next((p for p in r3.json() if p["id"] == pid), None)
        assert after_prod is not None, "Product disappeared after checkout"
        after = int(after_prod.get("stock", 0) or 0)
        assert after == before - 1, f"Expected stock {before-1} got {after} (product {pid})"
