# 🚀 Quick Start Guide

## Install and Run (3 Steps)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Seed Database
```bash
python scripts/seed_database.py
```

### 3. Start Server
```bash
python app.py
```

**Access**: http://localhost:5000

---

## Alternative: One Command Start

```bash
./run.sh
```

This script automatically:
- Checks if database exists
- Seeds it if needed
- Starts the server

---

## Try It Out

### Check Common Passwords
1. Go to http://localhost:5000
2. Try these passwords:
   - `password` → ⚠️ Found in 9,279,037 breaches
   - `123456` → ⚠️ Found in 23,597,311 breaches
   - `MySecureP@ssw0rd2024!` → ✅ Not found

### See Client-Side Censoring
Visit http://localhost:5000/demo to see:
- Live password censoring as you type
- Multiple censoring methods
- Implementation examples

---

## Verify Installation

```bash
python verify_installation.py
```

This checks that all components are properly installed.

---

## API Testing

```bash
python test_api.py
```

Tests all API endpoints with sample data.

---

## What This Tool Does

✅ **Checks if passwords are leaked** - Search 59+ common breached passwords  
✅ **Protects your privacy** - Uses k-anonymity (only 5-char hash prefix sent)  
✅ **Censors passwords** - Automatic censoring (e.g., `password` → `p••••••d`)  
✅ **Client-side hashing** - Your password never leaves your device  
✅ **RESTful API** - Easy integration with other tools  

---

## Next Steps

📖 **Read More**:
- [README.md](README.md) - Overview and introduction
- [USAGE.md](USAGE.md) - Detailed usage and examples
- [FEATURES.md](FEATURES.md) - Complete feature list
- [SECURITY.md](SECURITY.md) - Security implementation details
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Comprehensive project documentation

🔧 **Import Custom Passwords**:
```bash
python scripts/download_databases.py your_passwords.txt
```

🌐 **Production Deployment**:
- Use HTTPS in production
- Add rate limiting
- Configure proper CORS origins
- See [USAGE.md](USAGE.md) for details

---

## Troubleshooting

**Port already in use?**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

**Database issues?**
```bash
# Reset database
rm data/passwords.db
python scripts/seed_database.py
```

**Missing dependencies?**
```bash
# Reinstall
pip install -r requirements.txt --force-reinstall
```

---

## Project Structure

```
project/
├── app.py                 # Main Flask application
├── static/                # Frontend files
│   ├── index.html        # Main page
│   ├── demo.html         # Censoring demo
│   ├── app.js            # JavaScript logic
│   ├── sha1.js           # Hashing library
│   └── styles.css        # Styling
├── scripts/               # Utility scripts
│   ├── seed_database.py  # Populate database
│   └── download_databases.py  # Import passwords
├── data/                  # Database (auto-created)
│   └── passwords.db      # SQLite database
└── Documentation files (5 .md files)
```

---

## Key Features

🔐 **Password Censoring** (Unique Feature)
- Shows: `p•••••••d` instead of `password`
- Prevents shoulder surfing
- Safe for screenshots

🔒 **k-Anonymity**
- Only 5 characters of hash sent to server
- Server cannot determine your password
- Privacy-preserving search

⚡ **Fast & Lightweight**
- <10ms API responses
- No frameworks needed
- Minimal dependencies

---

**That's it! You're ready to go! 🎉**

For detailed information, see the full documentation files.
