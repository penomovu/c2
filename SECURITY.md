# Security Features

## Overview

This Password Leak Checker implements multiple security features to protect user privacy and data.

## Client-Side Security

### 1. Password Hashing (Client-Side)

All passwords are hashed using SHA-1 on the client side before any network communication:

```javascript
const hash = sha1(password);  // Computed in browser
```

**Benefits:**
- Passwords never leave the user's device in plain text
- No server-side storage of plain text passwords
- Man-in-the-middle attacks cannot capture passwords (though HTTPS is still recommended)

### 2. k-Anonymity Model

Following the Have I Been Pwned approach, we implement k-anonymity:

```javascript
const hashPrefix = hash.substring(0, 5);  // Only send first 5 chars
const hashSuffix = hash.substring(5);     // Keep remaining 35 chars local
```

**How it works:**
1. Hash the password locally: `5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8`
2. Send only prefix to server: `5BAA6`
3. Server returns all hashes starting with `5BAA6` (potentially hundreds)
4. Client compares full hash locally to find exact match

**Benefits:**
- Server cannot determine the actual password or full hash
- Each prefix matches ~16^35 possible passwords
- Provides plausible deniability
- Scales better than individual hash lookups

### 3. Client-Side Password Censoring

Passwords are automatically censored before display:

```javascript
function censorPassword(password) {
    if (password.length <= 2) {
        return '•'.repeat(password.length);
    }
    
    const firstChar = password[0];
    const lastChar = password[password.length - 1];
    const middleLength = password.length - 2;
    
    return firstChar + '•'.repeat(middleLength) + lastChar;
}
```

**Example:**
- `password123` → `p•••••••••3`
- `secret` → `s••••t`
- `ab` → `••`

**Benefits:**
- Prevents shoulder surfing
- Safe for screenshots and screen recordings
- Maintains length information for user verification
- Can demo tool publicly without exposing passwords

## Server-Side Security

### 1. Input Validation

All API inputs are validated:

```python
# Hash prefix validation
if len(hash_prefix) != 5:
    return error

if not all(c in '0123456789ABCDEF' for c in hash_prefix):
    return error
```

### 2. Database Security

- **No plain text storage**: Only SHA-1 hashes stored
- **Split hash storage**: Prefix and suffix stored separately
- **Indexed lookups**: Fast queries without exposing full hashes
- **SQL injection protection**: Parameterized queries

```python
cursor.execute('''
    SELECT hash_suffix, count 
    FROM leaked_passwords 
    WHERE hash_prefix = ?
''', (hash_prefix,))
```

### 3. Rate Limiting (Recommended for Production)

Add rate limiting to prevent abuse:

```python
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=lambda: request.remote_addr,
    default_limits=["100 per hour"]
)

@app.route('/api/range/<hash_prefix>')
@limiter.limit("10 per minute")
def check_password_range(hash_prefix):
    # ...
```

## Network Security

### HTTPS (Production Requirement)

While passwords are hashed client-side, HTTPS is still essential:

1. Prevents prefix enumeration attacks
2. Protects session data and cookies
3. Ensures integrity of JavaScript code delivered to client
4. Industry best practice

**Setup with Let's Encrypt:**

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### CORS Configuration

Properly configured CORS headers:

```python
from flask_cors import CORS

CORS(app)  # Development
# Production: CORS(app, origins=['https://yourdomain.com'])
```

## Privacy Protection

### Data Minimization

We minimize data collection:
- ❌ No user accounts
- ❌ No email addresses
- ❌ No IP logging (unless for abuse prevention)
- ❌ No analytics tracking
- ✅ Only hash prefixes processed

### No Logging of Sensitive Data

```python
# Don't log sensitive information
# BAD: logger.info(f"Checking password: {password}")
# GOOD: logger.info(f"Checking hash prefix: {hash_prefix}")
```

## Threat Model

### What We Protect Against

✅ **Plain text password exposure**
- Passwords hashed client-side

✅ **Password database compromise**
- Only hashes stored, must be cracked

✅ **Network eavesdropping (partial)**
- Only 5-char prefix transmitted
- HTTPS prevents this entirely

✅ **Shoulder surfing**
- Client-side censoring

✅ **Server operator abuse**
- Server never sees full hash or password

✅ **Man-in-the-middle (with HTTPS)**
- HTTPS encrypts all traffic

### What We Don't Protect Against

⚠️ **Weak passwords**
- Tool identifies weak passwords but can't force strong ones

⚠️ **Compromised client**
- If user's device is compromised, attacker can capture password

⚠️ **JavaScript injection (without CSP)**
- Malicious scripts could capture passwords before hashing

⚠️ **Rainbow tables**
- SHA-1 hashes can be reversed for weak passwords
- This is intentional - we're checking if password is known

## Security Headers (Production)

Add security headers to responses:

```python
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response
```

## Responsible Disclosure

If you discover a security vulnerability:

1. **Do not** publicly disclose until patched
2. Email security details to: [security contact]
3. Include:
   - Vulnerability description
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will:
- Respond within 48 hours
- Provide updates on fix progress
- Credit you in security advisory (if desired)

## Security Audit Checklist

- [ ] All passwords hashed client-side
- [ ] k-anonymity implemented correctly
- [ ] HTTPS enabled in production
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (parameterized queries)
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] No sensitive data in logs
- [ ] Client-side censoring working
- [ ] Database not publicly accessible
- [ ] Regular security updates applied

## Compliance

### GDPR Considerations

This tool is privacy-friendly:
- No personal data collected
- No user accounts or profiles
- No tracking or analytics
- Data minimization practiced
- Right to be forgotten: N/A (no user data stored)

### Data Breach Notification

If the password database is compromised:
- Impact: Low (only hashes stored, already from breaches)
- Users: No notification needed (no user accounts)
- Authorities: Assess based on jurisdiction

## Best Practices for Administrators

1. **Keep software updated**
   ```bash
   pip install --upgrade -r requirements.txt
   ```

2. **Regular security audits**
   - Review access logs
   - Check for unusual patterns
   - Update dependencies

3. **Secure the server**
   - Use firewall
   - Disable unnecessary services
   - Keep OS updated
   - Use SSH keys (not passwords)

4. **Monitor for abuse**
   - Implement rate limiting
   - Log API usage (not passwords!)
   - Alert on anomalies

5. **Backup strategy**
   - Regular database backups
   - Test restore procedures
   - Secure backup storage

## References

- [Have I Been Pwned API](https://haveibeenpwned.com/API/v3)
- [k-Anonymity Model](https://en.wikipedia.org/wiki/K-anonymity)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Troy Hunt's Password Blog Posts](https://www.troyhunt.com/tag/passwords/)
