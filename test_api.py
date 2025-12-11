import requests
import hashlib
import json

BASE_URL = 'http://localhost:5000'

def test_stats():
    print('Testing /api/stats endpoint...')
    response = requests.get(f'{BASE_URL}/api/stats')
    print(f'  Status: {response.status_code}')
    print(f'  Response: {json.dumps(response.json(), indent=2)}')
    print()

def test_check_password(password):
    print(f'Testing password: {password[:3]}***')
    
    hash_full = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
    hash_prefix = hash_full[:5]
    hash_suffix = hash_full[5:]
    
    print(f'  Hash: {hash_full}')
    print(f'  Prefix: {hash_prefix}')
    
    response = requests.get(f'{BASE_URL}/api/range/{hash_prefix}')
    print(f'  Status: {response.status_code}')
    
    data = response.json()
    print(f'  Matches returned: {len(data["matches"])}')
    
    found = False
    for match in data['matches']:
        if match['suffix'] == hash_suffix:
            found = True
            print(f'  ⚠️  PASSWORD FOUND IN BREACH! Count: {match["count"]:,}')
            break
    
    if not found:
        print(f'  ✅ Password not found in breaches')
    
    print()

def test_add_passwords():
    print('Testing /api/add_passwords endpoint...')
    
    test_passwords = [
        {'password': 'test123', 'count': 100},
        {'password': 'demo456', 'count': 50},
        'newpassword789'
    ]
    
    response = requests.post(
        f'{BASE_URL}/api/add_passwords',
        json={'passwords': test_passwords}
    )
    
    print(f'  Status: {response.status_code}')
    print(f'  Response: {json.dumps(response.json(), indent=2)}')
    print()

if __name__ == '__main__':
    print('=' * 60)
    print('Password Leak Checker - API Test Suite')
    print('=' * 60)
    print()
    
    try:
        test_stats()
        
        test_check_password('password')
        test_check_password('123456')
        test_check_password('ThisIsAVerySecurePasswordThatShouldNotBeInAnyBreach123!')
        
        test_add_passwords()
        
        test_check_password('test123')
        
        print('=' * 60)
        print('All tests completed!')
        print('=' * 60)
        
    except requests.exceptions.ConnectionError:
        print('ERROR: Could not connect to the API server.')
        print('Please make sure the server is running on http://localhost:5000')
        print('Run: python app.py')
    except Exception as e:
        print(f'ERROR: {str(e)}')
