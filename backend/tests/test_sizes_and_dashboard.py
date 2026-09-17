"""Tests for new features: product sizes, dashboard endpoint, POS with size."""
import os
import time
from datetime import date
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
SUPER_EMAIL = "bryan.halim007@gmail.com"
SUPER_PASSWORD = "velox2026"


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def super_headers():
    return {"Authorization": f"Bearer {_login(SUPER_EMAIL, SUPER_PASSWORD)}",
            "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def created_product(super_headers):
    payload = {
        "name": "TEST_SizeBike",
        "category": "Sepeda Lipat",
        "description": "TEST",
        "stock": 5,
        "sizes": [
            {"label": "M", "code": "TP-M", "cost_price": 3000000, "price": 4500000},
            {"label": "L", "code": "TP-L", "cost_price": 3500000, "price": 5000000},
        ],
    }
    r = requests.post(f"{BASE_URL}/api/admin/products", headers=super_headers, json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    yield data
    # cleanup
    requests.delete(f"{BASE_URL}/api/admin/products/{data['id']}", headers=super_headers)


# ---------------- Product sizes ----------------
class TestProductSizes:
    def test_create_derives_base_price_and_cost(self, created_product):
        p = created_product
        assert len(p["sizes"]) == 2
        assert p["price"] == 4500000  # min sell price
        assert p["cost_price"] == 3000000  # cost of cheapest (min price) size
        assert p["sizes"][0]["label"] == "M"
        assert p["sizes"][0]["code"] == "TP-M"

    def test_public_list_includes_sizes_without_cost(self, created_product):
        r = requests.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        found = next((p for p in r.json() if p["id"] == created_product["id"]), None)
        assert found is not None
        assert "sizes" in found and len(found["sizes"]) == 2
        # public should not expose price? It's per-size price... spec says public returns sizes array.
        # cost_price must never leak in public root
        assert "cost_price" not in found

    def test_update_sizes_rederives_base(self, super_headers, created_product):
        pid = created_product["id"]
        new_sizes = [
            {"label": "S", "code": "TP-S", "cost_price": 2000000, "price": 3000000},
            {"label": "XL", "code": "TP-XL", "cost_price": 4000000, "price": 6000000},
        ]
        r = requests.put(f"{BASE_URL}/api/admin/products/{pid}",
                         headers=super_headers, json={"sizes": new_sizes})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["price"] == 3000000
        assert data["cost_price"] == 2000000
        assert len(data["sizes"]) == 2

    def test_clear_sizes_with_empty_list(self, super_headers, created_product):
        pid = created_product["id"]
        r = requests.put(f"{BASE_URL}/api/admin/products/{pid}",
                         headers=super_headers, json={"sizes": [], "price": 9999000, "cost_price": 7000000})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["sizes"] == []
        # After clearing sizes, base price should reflect payload
        assert data["price"] == 9999000


# ---------------- Dashboard endpoint ----------------
class TestDashboard:
    def test_today_default(self, super_headers):
        r = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=super_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "summary" in data and "chart" in data
        s = data["summary"]
        for k in ("revenue", "gross_profit", "cost", "transactions", "units_sold", "avg_transaction_value"):
            assert k in s, f"missing key {k}"
        assert len(data["chart"]) == 1
        assert data["start"] == data["end"]

    @pytest.mark.parametrize("rng,expected_len", [("today", 1), ("yesterday", 1), ("7d", 7), ("30d", 30)])
    def test_chart_length(self, super_headers, rng, expected_len):
        r = requests.get(f"{BASE_URL}/api/admin/dashboard?range={rng}", headers=super_headers)
        assert r.status_code == 200
        assert len(r.json()["chart"]) == expected_len

    def test_month_range(self, super_headers):
        r = requests.get(f"{BASE_URL}/api/admin/dashboard?range=month", headers=super_headers)
        assert r.status_code == 200
        data = r.json()
        # Chart length = today's day-of-month
        assert data["start"].endswith("-01")
        assert len(data["chart"]) >= 1

    def test_custom_range(self, super_headers):
        r = requests.get(f"{BASE_URL}/api/admin/dashboard?range=custom&start=2025-01-01&end=2025-01-05",
                         headers=super_headers)
        assert r.status_code == 200
        data = r.json()
        assert len(data["chart"]) == 5
        assert data["start"] == "2025-01-01" and data["end"] == "2025-01-05"

    def test_custom_invalid_date(self, super_headers):
        r = requests.get(f"{BASE_URL}/api/admin/dashboard?range=custom&start=bad&end=2025-01-05",
                         headers=super_headers)
        assert r.status_code == 400

    def test_unauth(self):
        r = requests.get(f"{BASE_URL}/api/admin/dashboard")
        assert r.status_code == 401

    def test_non_super_forbidden(self, super_headers):
        email = "test_kasir_dash@skbike.id"
        password = "kasir123"
        # Create cashier
        r = requests.post(f"{BASE_URL}/api/admin/admins", headers=super_headers,
                          json={"email": email, "password": password, "role": "cashier", "name": "TestKasirDash"})
        created_id = None
        if r.status_code == 200:
            created_id = r.json().get("id")
        elif r.status_code != 400:  # 400 = already exists
            pytest.skip(f"Cannot create cashier: {r.status_code} {r.text}")
        try:
            lr = requests.post(f"{BASE_URL}/api/auth/login",
                              json={"email": email, "password": password})
            assert lr.status_code == 200, lr.text
            tok = lr.json()["token"]
            r = requests.get(f"{BASE_URL}/api/admin/dashboard",
                             headers={"Authorization": f"Bearer {tok}"})
            assert r.status_code == 403
        finally:
            if created_id:
                requests.delete(f"{BASE_URL}/api/admin/admins/{created_id}", headers=super_headers)


# ---------------- POS checkout with size ----------------
class TestPosCheckoutWithSize:
    def test_checkout_includes_size_and_reflects_in_dashboard(self, super_headers, created_product):
        # baseline
        b = requests.get(f"{BASE_URL}/api/admin/dashboard?range=today", headers=super_headers).json()
        base_rev = b["summary"]["revenue"]
        base_tx = b["summary"]["transactions"]
        base_units = b["summary"]["units_sold"]

        # Re-set sizes on product (previous test may have cleared them)
        pid = created_product["id"]
        requests.put(f"{BASE_URL}/api/admin/products/{pid}", headers=super_headers,
                     json={"sizes": [{"label": "M", "code": "TP-M", "cost_price": 3000000, "price": 4500000}]})

        payload = {
            "customer": "TEST_Cust",
            "customer_phone": "628000000000",
            "payment_method": "Cash",
            "amount_paid": 4500000,
            "items": [{
                "product_id": pid,
                "name": "TEST_SizeBike",
                "code": "TP-M",
                "color": "Merah",
                "size": "M",
                "qty": 1,
                "unit_price": 4500000,
                "cost_price": 3000000,
            }],
        }
        r = requests.post(f"{BASE_URL}/api/admin/pos/checkout", headers=super_headers, json=payload)
        assert r.status_code == 200, r.text
        time.sleep(1)
        after = requests.get(f"{BASE_URL}/api/admin/dashboard?range=today", headers=super_headers).json()
        assert after["summary"]["revenue"] >= base_rev + 4500000 - 1
        assert after["summary"]["transactions"] >= base_tx + 1
        assert after["summary"]["units_sold"] >= base_units + 1
        assert after["summary"]["gross_profit"] >= (b["summary"]["gross_profit"] + 1500000 - 1)
