# Password Leak Checker

A tool similar to Have I Been Pwned for checking if passwords have been leaked in data breaches.

## Features

- **Password Breach Checker**: Search leaked password databases to see if your password has been compromised
- **k-Anonymity Protection**: Uses the k-anonymity model - only the first 5 characters of the SHA-1 hash are sent to the server
- **Client-Side Censoring**: Passwords are automatically censored on the client side for security
- **Multiple Database Support**: Integrates with various leaked password databases
- **Breach Statistics**: Shows how many times a password appears in breaches

## How It Works

1. User enters a password in the web interface
2. Password is hashed using SHA-1 on the client side
3. Only the first 5 characters of the hash are sent to the server (k-anonymity)
4. Server returns all hashes starting with those 5 characters
5. Client compares the full hash locally to check for matches
6. Password is censored in the UI for security

## Installation

### Prerequisites

- Python 3.8+
- pip

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Download breach databases (optional):
   ```bash
   python scripts/download_databases.py
   ```

4. Run the server:
   ```bash
   python app.py
   ```

5. Open your browser to `http://localhost:5000`

## Architecture

- **Frontend**: HTML, CSS, JavaScript (vanilla JS, no frameworks)
- **Backend**: Python Flask API
- **Database**: SQLite for breach data storage
- **Hashing**: SHA-1 (industry standard for password breach checking)

## Security

- Passwords are never sent to the server in plain text
- k-anonymity ensures privacy even with hashed passwords
- Client-side censoring prevents shoulder surfing
- All communication should be done over HTTPS in production

## API Endpoints

### GET `/api/range/{hash_prefix}`

Check for leaked passwords by hash prefix (k-anonymity).

**Parameters:**
- `hash_prefix`: First 5 characters of SHA-1 hash (hex)

**Returns:**
```json
{
  "matches": [
    {"suffix": "XXXXX...", "count": 123},
    {"suffix": "YYYYY...", "count": 456}
  ]
}
```

### GET `/api/stats`

Get statistics about the breach database.

**Returns:**
```json
{
  "total_passwords": 1000000,
  "total_breaches": 500,
  "last_updated": "2024-01-01"
}
```

## License

MIT License
