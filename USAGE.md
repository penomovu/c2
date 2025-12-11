# Usage Guide - Password Leak Checker

## Quick Start

### 1. Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Seed the database with common leaked passwords
python scripts/seed_database.py
```

### 2. Start the Server

```bash
python app.py
```

The server will start at `http://localhost:5000`

### 3. Access the Web Interface

Open your browser and navigate to:
```
http://localhost:5000
```

## Features

### Client-Side Password Censoring

The application automatically censors passwords for security:
- Shows only first and last character with bullets in between
- Example: "password123" → "p•••••••••3"
- Prevents shoulder surfing and accidental exposure

### k-Anonymity Protection

Following the Have I Been Pwned model:
1. Password is hashed using SHA-1 on the client
2. Only the first 5 characters of the hash are sent to the server
3. Server returns all matching hash suffixes
4. Client compares locally to determine if password was breached

This ensures your actual password never leaves your device!

### Password Checking

1. Enter a password in the input field
2. Click "Check Password" or press Enter
3. Results will show:
   - ✅ Safe: Password not found in breaches
   - ⚠️ Compromised: Password found with breach count

## API Usage

### Check Password Range (k-Anonymity)

```bash
# Hash your password with SHA-1
echo -n "password" | sha1sum
# Output: 5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8

# Send first 5 characters to API
curl http://localhost:5000/api/range/5BAA6

# Response includes all hashes starting with 5BAA6
{
  "matches": [
    {
      "suffix": "1E4C9B93F3F0682250B6CF8331B7EE68FD8",
      "count": 9279037
    }
  ]
}
```

### Get Statistics

```bash
curl http://localhost:5000/api/stats

# Response
{
  "total_passwords": 60,
  "total_breaches": 500,
  "last_updated": "2024-01-01T12:00:00"
}
```

### Add Passwords (Admin)

```bash
curl -X POST http://localhost:5000/api/add_passwords \
  -H "Content-Type: application/json" \
  -d '{
    "passwords": [
      {"password": "weakpass123", "count": 1000},
      "anotherweakone"
    ]
  }'

# Response
{
  "success": true,
  "added": 2,
  "total": 62
}
```

## Database Management

### Seeding with Common Passwords

```bash
python scripts/seed_database.py
```

This adds 60+ most common leaked passwords from real breaches.

### Importing Custom Password Lists

```bash
# Format: password:count (one per line)
# Example file content:
# password123:50000
# admin:30000
# welcome:25000

python scripts/download_databases.py path/to/passwords.txt
```

### Creating Sample Data

```bash
# Run without arguments to create sample file
python scripts/download_databases.py
```

## Security Best Practices

### For Users

1. **Never reuse passwords** - Each account should have a unique password
2. **Use a password manager** - Generate and store strong passwords
3. **Enable 2FA** - Two-factor authentication adds extra security
4. **Regular checks** - Periodically check if passwords have been compromised

### For Deployment

1. **Use HTTPS** - Always use SSL/TLS in production
2. **Rate limiting** - Implement rate limiting on API endpoints
3. **Authentication** - Add authentication for admin endpoints
4. **Database backups** - Regular backups of the password database
5. **Security headers** - Add appropriate HTTP security headers

## Advanced Usage

### Python Script Integration

```python
import hashlib
import requests

def check_password(password):
    # Hash password
    hash_full = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
    hash_prefix = hash_full[:5]
    hash_suffix = hash_full[5:]
    
    # Check with API
    response = requests.get(f'http://localhost:5000/api/range/{hash_prefix}')
    data = response.json()
    
    # Find match
    for match in data['matches']:
        if match['suffix'] == hash_suffix:
            return True, match['count']
    
    return False, 0

# Usage
is_pwned, count = check_password('mypassword')
if is_pwned:
    print(f'Warning! Found in {count:,} breaches')
else:
    print('Password not found in breaches')
```

### Bulk Password Checking

```python
import hashlib
import requests
import time

def bulk_check_passwords(passwords):
    results = {}
    
    for password in passwords:
        hash_full = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
        hash_prefix = hash_full[:5]
        hash_suffix = hash_full[5:]
        
        response = requests.get(f'http://localhost:5000/api/range/{hash_prefix}')
        data = response.json()
        
        found = False
        count = 0
        
        for match in data['matches']:
            if match['suffix'] == hash_suffix:
                found = True
                count = match['count']
                break
        
        results[password] = {'breached': found, 'count': count}
        
        # Be respectful with rate limiting
        time.sleep(0.1)
    
    return results

# Usage
passwords_to_check = ['password123', 'securepass456', 'admin']
results = bulk_check_passwords(passwords_to_check)

for password, result in results.items():
    status = '⚠️ BREACHED' if result['breached'] else '✅ SAFE'
    print(f'{password[:3]}***: {status}')
    if result['breached']:
        print(f'  Found {result["count"]:,} times')
```

## Testing

### Run API Tests

```bash
# Make sure server is running first
python test_api.py
```

### Manual Testing

1. Visit http://localhost:5000
2. Try common passwords: "password", "123456", "admin"
3. Try a strong unique password
4. Check that results show correctly
5. Verify password censoring works

## Troubleshooting

### Server won't start

```bash
# Check if port 5000 is already in use
lsof -i :5000

# Use a different port
python app.py --port 8000
```

### Database errors

```bash
# Reset database
rm data/passwords.db
python scripts/seed_database.py
```

### Import issues

```bash
# Check file encoding
file -i path/to/passwords.txt

# Convert if needed
iconv -f ISO-8859-1 -t UTF-8 input.txt > output.txt
```

## Performance Tips

1. **Database indexing** - Hash prefixes are indexed for fast lookups
2. **Batch imports** - Use batch_size parameter for large imports
3. **Caching** - Consider adding Redis for frequently checked prefixes
4. **CDN** - Serve static files from CDN in production

## Legal and Ethical Considerations

⚠️ **Important**: 
- Only use breach data obtained legally and ethically
- Respect privacy and data protection laws
- Never share or distribute breach databases
- Use this tool for security improvements only
- Consider user privacy in all implementations

## Support

For issues or questions:
- Check the README.md for general information
- Review this USAGE.md for detailed instructions
- Check the test_api.py for example usage
