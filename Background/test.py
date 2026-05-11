# Run this test script to verify everything

import requests
import json

BASE_URL = "http://localhost:8000"

def test_all_endpoints():
    print("=" * 50)
    print("Testing Vastrika API Endpoints")
    print("=" * 50)
    
    # 1. Test root endpoint
    print("\n1. Testing Root Endpoint...")
    response = requests.get(f"{BASE_URL}/")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # 2. Test products endpoint
    print("\n2. Testing Products Endpoint...")
    response = requests.get(f"{BASE_URL}/products/with-discounts/")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        products = response.json()
        print(f"   Products found: {len(products)}")
    
    # 3. Test user registration
    print("\n3. Testing User Registration...")
    test_user = {
        "name": "Test User",
        "email": f"test_{hash('test')}@example.com",
        "password": "test123"
    }
    response = requests.post(f"{BASE_URL}/users/register", data=test_user)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   User created: {response.json()}")
    
    # 4. Test user login
    print("\n4. Testing User Login...")
    response = requests.post(f"{BASE_URL}/users/login", data={
        "email": "admin@vastrika.com",
        "password": "admin123"
    })
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   Admin login successful: {response.json()}")
    
    # 5. Test admin stats
    print("\n5. Testing Admin Stats...")
    response = requests.get(f"{BASE_URL}/admin/stats")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        stats = response.json()
        print(f"   Stats: {stats}")
    
    print("\n" + "=" * 50)
    print("✅ All tests completed!")
    print("=" * 50)

if __name__ == "__main__":
    test_all_endpoints()