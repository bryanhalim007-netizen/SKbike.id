"""Tests for the new public product detail endpoint (price-less) and 404."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


@pytest.fixture(scope="module")
def sample_product():
    r = requests.get(f"{BASE_URL}/api/products", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list) and len(data) > 0, "No products returned from /api/products"
    return data[0]


def test_list_products_priceless(sample_product):
    # Public list should not expose price field
    assert "price" not in sample_product, f"Public product list leaks price: {sample_product}"
    assert "id" in sample_product


def test_get_product_by_id_priceless(sample_product):
    pid = sample_product["id"]
    r = requests.get(f"{BASE_URL}/api/products/{pid}", timeout=30)
    assert r.status_code == 200, r.text
    p = r.json()
    # Core fields present
    for k in ("id", "name", "category", "status", "specs", "variants", "sizes"):
        assert k in p, f"Missing key {k} in product detail"
    assert p["id"] == pid
    # No public price
    assert "price" not in p, "Public detail leaked 'price'"
    assert "cost_price" not in p, "Public detail leaked 'cost_price'"
    # Sizes must not expose price/cost_price either
    for s in p.get("sizes", []) or []:
        assert "price" not in s, f"size leaks price: {s}"
        assert "cost_price" not in s, f"size leaks cost_price: {s}"


def test_get_product_invalid_id_returns_404():
    # 24-hex but non-existent -> should be 404 (not 500)
    r = requests.get(f"{BASE_URL}/api/products/000000000000000000000000", timeout=30)
    assert r.status_code == 404, f"expected 404, got {r.status_code}: {r.text}"


def test_get_product_bad_id_format():
    # Malformed id -> should be 400/404, not 500
    r = requests.get(f"{BASE_URL}/api/products/not-a-valid-id", timeout=30)
    assert r.status_code in (400, 404, 422), f"unexpected status {r.status_code}: {r.text}"
