#!/usr/bin/env python3
"""
Backend API Test Suite for SK Bike - Product Pricing
Tests the separation of public price (Harga Jual) and admin cost_price (Harga Modal)
"""

import requests
import json
import sys
from typing import Optional

# Configuration
BASE_URL = "https://skbike-github-build.preview.emergentagent.com/api"
ADMIN_EMAIL = "bryan.halim007@gmail.com"
ADMIN_PASSWORD = "velox2026"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_test(name: str):
    print(f"\n{Colors.BLUE}{'='*80}{Colors.RESET}")
    print(f"{Colors.BLUE}TEST: {name}{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*80}{Colors.RESET}")

def print_pass(msg: str):
    print(f"{Colors.GREEN}✓ PASS: {msg}{Colors.RESET}")

def print_fail(msg: str):
    print(f"{Colors.RED}✗ FAIL: {msg}{Colors.RESET}")

def print_info(msg: str):
    print(f"{Colors.YELLOW}ℹ INFO: {msg}{Colors.RESET}")

class TestSession:
    def __init__(self):
        self.session = requests.Session()
        self.token: Optional[str] = None
        self.test_product_id: Optional[str] = None
        self.failures = []
        self.passes = []

    def login_admin(self) -> bool:
        """Login as admin and store auth token"""
        print_test("Admin Login")
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                timeout=30
            )
            print_info(f"Login status: {response.status_code}")
            
            if response.status_code != 200:
                print_fail(f"Login failed with status {response.status_code}")
                print_info(f"Response: {response.text}")
                self.failures.append("Admin login failed")
                return False
            
            data = response.json()
            self.token = data.get("token")
            
            if not self.token:
                print_fail("No token in login response")
                self.failures.append("No auth token received")
                return False
            
            print_pass(f"Admin logged in successfully")
            print_info(f"User: {data.get('email')}, Role: {data.get('role')}")
            self.passes.append("Admin login successful")
            return True
            
        except Exception as e:
            print_fail(f"Login exception: {str(e)}")
            self.failures.append(f"Login exception: {str(e)}")
            return False

    def test_public_products_endpoint(self) -> bool:
        """Test GET /api/products - must include price, must NOT include cost_price or code"""
        print_test("Public Products Endpoint - GET /api/products")
        try:
            response = self.session.get(f"{BASE_URL}/products", timeout=30)
            print_info(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print_fail(f"Public products endpoint returned {response.status_code}")
                self.failures.append(f"Public products endpoint failed: {response.status_code}")
                return False
            
            products = response.json()
            print_info(f"Retrieved {len(products)} products")
            
            if len(products) == 0:
                print_fail("No products found in database")
                self.failures.append("No products in database")
                return False
            
            # Check first product structure
            product = products[0]
            print_info(f"Sample product: {product.get('name')}")
            
            # Must have price
            if "price" not in product:
                print_fail("Product missing 'price' field (Harga Jual)")
                self.failures.append("Public product missing 'price' field")
                return False
            
            if not isinstance(product["price"], (int, float)):
                print_fail(f"Product 'price' is not numeric: {type(product['price'])}")
                self.failures.append("Product price is not numeric")
                return False
            
            print_pass(f"Product has numeric 'price' field: {product['price']}")
            
            # Must NOT have cost_price
            if "cost_price" in product:
                print_fail("Product exposes 'cost_price' (Harga Modal) - should be hidden!")
                self.failures.append("Public product exposes cost_price (security issue)")
                return False
            
            print_pass("Product correctly hides 'cost_price' (Harga Modal)")
            
            # Must NOT have code
            if "code" in product:
                print_fail("Product exposes 'code' - should be hidden!")
                self.failures.append("Public product exposes code")
                return False
            
            print_pass("Product correctly hides 'code'")
            
            # Check all products
            for i, p in enumerate(products):
                if "price" not in p:
                    print_fail(f"Product {i} missing 'price'")
                    self.failures.append(f"Product {i} missing price")
                    return False
                if "cost_price" in p:
                    print_fail(f"Product {i} exposes 'cost_price'")
                    self.failures.append(f"Product {i} exposes cost_price")
                    return False
                if "code" in p:
                    print_fail(f"Product {i} exposes 'code'")
                    self.failures.append(f"Product {i} exposes code")
                    return False
            
            print_pass(f"All {len(products)} products correctly expose 'price' and hide 'cost_price' and 'code'")
            self.passes.append("Public products endpoint correct")
            return True
            
        except Exception as e:
            print_fail(f"Exception: {str(e)}")
            self.failures.append(f"Public products test exception: {str(e)}")
            return False

    def test_admin_create_product(self) -> bool:
        """Test POST /api/admin/products - create product with both price and cost_price"""
        print_test("Admin Create Product - POST /api/admin/products")
        
        if not self.token:
            print_fail("No auth token available")
            self.failures.append("Cannot test admin create - no auth token")
            return False
        
        try:
            product_data = {
                "name": "TEST Sepeda Gunung Premium",
                "category": "Sepeda Gunung",
                "description": "Test product for pricing verification",
                "price": 5000000,
                "cost_price": 3500000,
                "stock": 10,
                "status": "Tersedia",
                "specs": {
                    "frame": "Aluminium Test",
                    "transmisi": "Shimano Test",
                    "rem": "Hydraulic Test",
                    "ukuran_roda": "29 inci",
                    "baterai_motor": "-"
                }
            }
            
            print_info(f"Creating product with price={product_data['price']}, cost_price={product_data['cost_price']}")
            
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.post(
                f"{BASE_URL}/admin/products",
                json=product_data,
                headers=headers,
                timeout=30
            )
            
            print_info(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print_fail(f"Create product failed with status {response.status_code}")
                print_info(f"Response: {response.text}")
                self.failures.append(f"Admin create product failed: {response.status_code}")
                return False
            
            created = response.json()
            self.test_product_id = created.get("id")
            
            if not self.test_product_id:
                print_fail("No product ID in response")
                self.failures.append("No product ID returned")
                return False
            
            print_pass(f"Product created with ID: {self.test_product_id}")
            
            # Verify response includes both price and cost_price
            if "price" not in created:
                print_fail("Created product response missing 'price'")
                self.failures.append("Create response missing price")
                return False
            
            if "cost_price" not in created:
                print_fail("Created product response missing 'cost_price'")
                self.failures.append("Create response missing cost_price")
                return False
            
            if created["price"] != product_data["price"]:
                print_fail(f"Price mismatch: expected {product_data['price']}, got {created['price']}")
                self.failures.append("Price not persisted correctly")
                return False
            
            if created["cost_price"] != product_data["cost_price"]:
                print_fail(f"Cost price mismatch: expected {product_data['cost_price']}, got {created['cost_price']}")
                self.failures.append("Cost price not persisted correctly")
                return False
            
            print_pass(f"Product created with price={created['price']} and cost_price={created['cost_price']}")
            self.passes.append("Admin create product with cost_price successful")
            return True
            
        except Exception as e:
            print_fail(f"Exception: {str(e)}")
            self.failures.append(f"Admin create product exception: {str(e)}")
            return False

    def test_admin_list_products(self) -> bool:
        """Test GET /api/admin/products - must include both price and cost_price"""
        print_test("Admin List Products - GET /api/admin/products")
        
        if not self.token:
            print_fail("No auth token available")
            self.failures.append("Cannot test admin list - no auth token")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.get(
                f"{BASE_URL}/admin/products",
                headers=headers,
                timeout=30
            )
            
            print_info(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print_fail(f"Admin products endpoint returned {response.status_code}")
                self.failures.append(f"Admin products endpoint failed: {response.status_code}")
                return False
            
            products = response.json()
            print_info(f"Retrieved {len(products)} admin products")
            
            if len(products) == 0:
                print_fail("No products found")
                self.failures.append("No products in admin list")
                return False
            
            # Check that admin products include both price and cost_price
            product = products[0]
            
            if "price" not in product:
                print_fail("Admin product missing 'price'")
                self.failures.append("Admin product missing price")
                return False
            
            if "cost_price" not in product:
                print_fail("Admin product missing 'cost_price'")
                self.failures.append("Admin product missing cost_price")
                return False
            
            if "code" not in product:
                print_fail("Admin product missing 'code'")
                self.failures.append("Admin product missing code")
                return False
            
            print_pass(f"Admin products include price, cost_price, and code")
            
            # Find our test product if it exists
            if self.test_product_id:
                test_product = next((p for p in products if p.get("id") == self.test_product_id), None)
                if test_product:
                    print_info(f"Found test product: {test_product.get('name')}")
                    print_info(f"  price={test_product.get('price')}, cost_price={test_product.get('cost_price')}")
                    
                    if test_product.get("price") != 5000000:
                        print_fail(f"Test product price incorrect: {test_product.get('price')}")
                        self.failures.append("Test product price not persisted")
                        return False
                    
                    if test_product.get("cost_price") != 3500000:
                        print_fail(f"Test product cost_price incorrect: {test_product.get('cost_price')}")
                        self.failures.append("Test product cost_price not persisted")
                        return False
                    
                    print_pass("Test product price and cost_price persisted correctly")
            
            self.passes.append("Admin list products includes cost_price")
            return True
            
        except Exception as e:
            print_fail(f"Exception: {str(e)}")
            self.failures.append(f"Admin list products exception: {str(e)}")
            return False

    def test_admin_update_product(self) -> bool:
        """Test PUT /api/admin/products/{id} - update both price and cost_price"""
        print_test("Admin Update Product - PUT /api/admin/products/{id}")
        
        if not self.token:
            print_fail("No auth token available")
            self.failures.append("Cannot test admin update - no auth token")
            return False
        
        if not self.test_product_id:
            print_fail("No test product ID available")
            self.failures.append("Cannot test admin update - no test product")
            return False
        
        try:
            update_data = {
                "price": 5250000,
                "cost_price": 3600000
            }
            
            print_info(f"Updating product {self.test_product_id}")
            print_info(f"New price={update_data['price']}, new cost_price={update_data['cost_price']}")
            
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.put(
                f"{BASE_URL}/admin/products/{self.test_product_id}",
                json=update_data,
                headers=headers,
                timeout=30
            )
            
            print_info(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print_fail(f"Update product failed with status {response.status_code}")
                print_info(f"Response: {response.text}")
                self.failures.append(f"Admin update product failed: {response.status_code}")
                return False
            
            updated = response.json()
            
            if updated.get("price") != update_data["price"]:
                print_fail(f"Updated price incorrect: expected {update_data['price']}, got {updated.get('price')}")
                self.failures.append("Updated price not persisted")
                return False
            
            if updated.get("cost_price") != update_data["cost_price"]:
                print_fail(f"Updated cost_price incorrect: expected {update_data['cost_price']}, got {updated.get('cost_price')}")
                self.failures.append("Updated cost_price not persisted")
                return False
            
            print_pass(f"Product updated: price={updated['price']}, cost_price={updated['cost_price']}")
            self.passes.append("Admin update product with cost_price successful")
            return True
            
        except Exception as e:
            print_fail(f"Exception: {str(e)}")
            self.failures.append(f"Admin update product exception: {str(e)}")
            return False

    def test_public_product_after_update(self) -> bool:
        """Verify public endpoint shows updated price but still hides cost_price"""
        print_test("Public Product After Update - Verify price exposed, cost_price hidden")
        
        if not self.test_product_id:
            print_fail("No test product ID available")
            self.failures.append("Cannot verify public product - no test product")
            return False
        
        try:
            response = self.session.get(f"{BASE_URL}/products", timeout=30)
            
            if response.status_code != 200:
                print_fail(f"Public products endpoint returned {response.status_code}")
                self.failures.append("Public products endpoint failed after update")
                return False
            
            products = response.json()
            test_product = next((p for p in products if p.get("id") == self.test_product_id), None)
            
            if not test_product:
                print_fail("Test product not found in public products list")
                self.failures.append("Test product not in public list")
                return False
            
            print_info(f"Found test product in public list: {test_product.get('name')}")
            
            # Must have updated price
            if "price" not in test_product:
                print_fail("Public product missing 'price'")
                self.failures.append("Public product missing price after update")
                return False
            
            if test_product["price"] != 5250000:
                print_fail(f"Public product price not updated: expected 5250000, got {test_product['price']}")
                self.failures.append("Public product price not updated")
                return False
            
            print_pass(f"Public product shows updated price: {test_product['price']}")
            
            # Must NOT have cost_price
            if "cost_price" in test_product:
                print_fail("Public product exposes 'cost_price' after update")
                self.failures.append("Public product exposes cost_price after update")
                return False
            
            print_pass("Public product correctly hides 'cost_price' after update")
            
            # Must NOT have code
            if "code" in test_product:
                print_fail("Public product exposes 'code' after update")
                self.failures.append("Public product exposes code after update")
                return False
            
            print_pass("Public product correctly hides 'code' after update")
            
            self.passes.append("Public product correctly shows price, hides cost_price after update")
            return True
            
        except Exception as e:
            print_fail(f"Exception: {str(e)}")
            self.failures.append(f"Public product verification exception: {str(e)}")
            return False

    def cleanup_test_product(self) -> bool:
        """Delete the test product"""
        print_test("Cleanup - DELETE /api/admin/products/{id}")
        
        if not self.token or not self.test_product_id:
            print_info("No test product to clean up")
            return True
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.delete(
                f"{BASE_URL}/admin/products/{self.test_product_id}",
                headers=headers,
                timeout=30
            )
            
            print_info(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                print_pass(f"Test product {self.test_product_id} deleted successfully")
                return True
            else:
                print_fail(f"Delete failed with status {response.status_code}")
                return False
                
        except Exception as e:
            print_fail(f"Cleanup exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"\n{Colors.BLUE}{'='*80}{Colors.RESET}")
        print(f"{Colors.BLUE}SK BIKE BACKEND API TEST SUITE - PRODUCT PRICING{Colors.RESET}")
        print(f"{Colors.BLUE}{'='*80}{Colors.RESET}")
        print_info(f"Base URL: {BASE_URL}")
        print_info(f"Admin: {ADMIN_EMAIL}")
        
        # Test sequence
        tests = [
            ("Admin Login", self.login_admin),
            ("Public Products Endpoint", self.test_public_products_endpoint),
            ("Admin Create Product", self.test_admin_create_product),
            ("Admin List Products", self.test_admin_list_products),
            ("Admin Update Product", self.test_admin_update_product),
            ("Public Product After Update", self.test_public_product_after_update),
            ("Cleanup Test Product", self.cleanup_test_product),
        ]
        
        for test_name, test_func in tests:
            result = test_func()
            if not result and test_name not in ["Cleanup Test Product"]:
                # Continue with remaining tests even if one fails
                print_info(f"Continuing with remaining tests...")
        
        # Summary
        print(f"\n{Colors.BLUE}{'='*80}{Colors.RESET}")
        print(f"{Colors.BLUE}TEST SUMMARY{Colors.RESET}")
        print(f"{Colors.BLUE}{'='*80}{Colors.RESET}")
        print(f"{Colors.GREEN}Passed: {len(self.passes)}{Colors.RESET}")
        print(f"{Colors.RED}Failed: {len(self.failures)}{Colors.RESET}")
        
        if self.passes:
            print(f"\n{Colors.GREEN}✓ Passed Tests:{Colors.RESET}")
            for p in self.passes:
                print(f"  {Colors.GREEN}• {p}{Colors.RESET}")
        
        if self.failures:
            print(f"\n{Colors.RED}✗ Failed Tests:{Colors.RESET}")
            for f in self.failures:
                print(f"  {Colors.RED}• {f}{Colors.RESET}")
        
        print(f"\n{Colors.BLUE}{'='*80}{Colors.RESET}")
        
        return len(self.failures) == 0

def main():
    test_session = TestSession()
    success = test_session.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
