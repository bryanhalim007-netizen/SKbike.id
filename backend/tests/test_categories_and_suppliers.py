"""Tests for new features: dynamic categories management + supplier CRUD."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://skbike-preview.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "bryan.halim007@gmail.com"
ADMIN_PASSWORD = "tokosake321"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ------------------ Categories ------------------

class TestCategoriesPublic:
    def test_public_list_returns_seeded(self):
        r = requests.get(f"{API}/categories", timeout=15)
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list)
        assert len(cats) >= 6
        # Field validation
        c = cats[0]
        for f in ("id", "name", "tag", "image_url", "show_on_home", "archived", "sort_order"):
            assert f in c, f"missing field {f} in category"
        # All returned should be non-archived
        assert all(c["archived"] is False for c in cats)

    def test_config_includes_categories(self):
        r = requests.get(f"{API}/config", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "categories" in data
        assert isinstance(data["categories"], list)
        assert len(data["categories"]) >= 6


class TestAdminCategoriesCRUD:
    created_ids = []

    def test_admin_list_with_product_count(self, admin_session):
        r = admin_session.get(f"{API}/admin/categories", timeout=15)
        assert r.status_code == 200
        cats = r.json()
        assert len(cats) >= 6
        assert all("product_count" in c for c in cats)

    def test_create_category(self, admin_session):
        name = f"TEST_Kategori_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{API}/admin/categories",
                               json={"name": name, "tag": "Tag1", "image_url": "https://x.test/img.jpg",
                                     "show_on_home": True}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == name
        assert d["tag"] == "Tag1"
        assert d["show_on_home"] is True
        assert d["archived"] is False
        assert d.get("product_count") == 0
        TestAdminCategoriesCRUD.created_ids.append((d["id"], name))

    def test_duplicate_name_case_insensitive_returns_400(self, admin_session):
        assert TestAdminCategoriesCRUD.created_ids, "prev test must have created a category"
        _, name = TestAdminCategoriesCRUD.created_ids[0]
        r = admin_session.post(f"{API}/admin/categories",
                               json={"name": name.upper(), "show_on_home": False}, timeout=15)
        assert r.status_code == 400

    def test_rename_category_propagates_to_products(self, admin_session):
        # Create category, then create product with that category, then rename
        cname = f"TEST_Cat_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{API}/admin/categories", json={"name": cname, "show_on_home": False}, timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]
        TestAdminCategoriesCRUD.created_ids.append((cid, cname))

        # Create product
        prod_payload = {"name": f"TEST_Product_{uuid.uuid4().hex[:6]}", "category": cname, "price": 100000, "stock": 5}
        r = admin_session.post(f"{API}/admin/products", json=prod_payload, timeout=15)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        # Rename category
        new_name = cname + "_renamed"
        r = admin_session.put(f"{API}/admin/categories/{cid}", json={"name": new_name}, timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == new_name
        TestAdminCategoriesCRUD.created_ids[-1] = (cid, new_name)

        # Product's category should be updated
        r = admin_session.get(f"{API}/admin/products", timeout=15)
        assert r.status_code == 200
        prods = r.json()
        found = [p for p in prods if p["id"] == pid]
        assert found and found[0]["category"] == new_name

        # cleanup product
        admin_session.delete(f"{API}/admin/products/{pid}", timeout=15)

    def test_archive_hides_from_public_and_products(self, admin_session):
        # Create cat with a product, then archive
        cname = f"TEST_ArchCat_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{API}/admin/categories", json={"name": cname, "show_on_home": True}, timeout=15)
        cid = r.json()["id"]
        TestAdminCategoriesCRUD.created_ids.append((cid, cname))

        pr = admin_session.post(f"{API}/admin/products", json={"name": f"TEST_P_{uuid.uuid4().hex[:6]}", "category": cname, "price": 50000, "stock": 3}, timeout=15)
        assert pr.status_code == 200
        pid = pr.json()["id"]

        # Public should include it before archiving
        pub = requests.get(f"{API}/categories", timeout=15).json()
        assert any(c["name"] == cname for c in pub)
        cfg_cats = requests.get(f"{API}/config", timeout=15).json()["categories"]
        assert cname in cfg_cats
        pub_prods = requests.get(f"{API}/products", timeout=15).json()
        assert any(p["id"] == pid for p in pub_prods)

        # Archive it
        r = admin_session.put(f"{API}/admin/categories/{cid}", json={"archived": True}, timeout=15)
        assert r.status_code == 200
        assert r.json()["archived"] is True

        # Now public endpoints should hide it
        pub = requests.get(f"{API}/categories", timeout=15).json()
        assert not any(c["name"] == cname for c in pub)
        cfg_cats = requests.get(f"{API}/config", timeout=15).json()["categories"]
        assert cname not in cfg_cats
        pub_prods = requests.get(f"{API}/products", timeout=15).json()
        assert not any(p["id"] == pid for p in pub_prods)

        # cleanup product
        admin_session.delete(f"{API}/admin/products/{pid}", timeout=15)

    def test_create_product_with_archived_category_400(self, admin_session):
        # Use previously archived category
        arch = [c for c in admin_session.get(f"{API}/admin/categories").json() if c["archived"]]
        assert arch, "need archived category from prior test"
        arch_name = arch[0]["name"]
        r = admin_session.post(f"{API}/admin/products", json={"name": "TEST_ShouldFail", "category": arch_name, "price": 1, "stock": 1}, timeout=15)
        assert r.status_code == 400

    def test_create_product_with_invalid_category_400(self, admin_session):
        r = admin_session.post(f"{API}/admin/products", json={"name": "TEST_ShouldFail2", "category": "___does_not_exist___", "price": 1, "stock": 1}, timeout=15)
        assert r.status_code == 400

    def test_reorder_categories(self, admin_session):
        cats = admin_session.get(f"{API}/admin/categories").json()
        # take first 2 non-archived
        active = [c for c in cats if not c["archived"]][:2]
        assert len(active) == 2
        # swap order
        order = [c["id"] for c in cats]
        # swap first two
        order[0], order[1] = order[1], order[0]
        r = admin_session.put(f"{API}/admin/categories/reorder", json={"order": order}, timeout=15)
        assert r.status_code == 200
        # verify
        cats2 = admin_session.get(f"{API}/admin/categories").json()
        # find index by id
        idx_new = {c["id"]: c["sort_order"] for c in cats2}
        assert idx_new[order[0]] < idx_new[order[1]]
        # restore
        original = [c["id"] for c in cats]
        admin_session.put(f"{API}/admin/categories/reorder", json={"order": original}, timeout=15)

    def test_delete_category_with_products_400(self, admin_session):
        cname = f"TEST_DelCat_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{API}/admin/categories", json={"name": cname}, timeout=15)
        cid = r.json()["id"]
        TestAdminCategoriesCRUD.created_ids.append((cid, cname))
        pr = admin_session.post(f"{API}/admin/products", json={"name": f"TEST_P2_{uuid.uuid4().hex[:6]}", "category": cname, "price": 100, "stock": 1}, timeout=15)
        pid = pr.json()["id"]
        r = admin_session.delete(f"{API}/admin/categories/{cid}", timeout=15)
        assert r.status_code == 400
        admin_session.delete(f"{API}/admin/products/{pid}", timeout=15)

    def test_delete_empty_archived_category_ok(self, admin_session):
        cname = f"TEST_EmptyArch_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{API}/admin/categories", json={"name": cname}, timeout=15)
        cid = r.json()["id"]
        # archive
        admin_session.put(f"{API}/admin/categories/{cid}", json={"archived": True}, timeout=15)
        r = admin_session.delete(f"{API}/admin/categories/{cid}", timeout=15)
        assert r.status_code == 200

    def test_zzz_cleanup(self, admin_session):
        # unarchive+delete any leftover TEST_ categories with no products
        for cid, _ in TestAdminCategoriesCRUD.created_ids:
            # Ensure product_count = 0 by fetching; ignore errors
            try:
                admin_session.put(f"{API}/admin/categories/{cid}", json={"archived": True}, timeout=15)
                admin_session.delete(f"{API}/admin/categories/{cid}", timeout=15)
            except Exception:
                pass


# ------------------ Suppliers ------------------

class TestSuppliers:
    def test_create_update_delete(self, admin_session):
        nama = f"TEST_Sup_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{API}/admin/suppliers", json={"nama": nama, "telepon": "0812", "alamat": "Jl A", "catatan": "n"}, timeout=15)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        assert r.json()["nama"] == nama

        # update
        r = admin_session.put(f"{API}/admin/suppliers/{sid}", json={"nama": nama + "_edited", "telepon": "0899"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["nama"] == nama + "_edited"
        assert r.json()["telepon"] == "0899"

        # get list contains it
        lst = admin_session.get(f"{API}/admin/suppliers", timeout=15).json()
        assert any(s["id"] == sid for s in lst)

        # delete
        r = admin_session.delete(f"{API}/admin/suppliers/{sid}", timeout=15)
        assert r.status_code == 200

    def test_create_supplier_empty_name_400(self, admin_session):
        r = admin_session.post(f"{API}/admin/suppliers", json={"nama": "   "}, timeout=15)
        assert r.status_code == 400
