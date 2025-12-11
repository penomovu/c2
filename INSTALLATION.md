# Installation Guide

## System Requirements

- **Python**: 3.8 or higher
- **pip**: Python package installer
- **Operating System**: Linux, macOS, or Windows
- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)
- **Disk Space**: ~50 MB (more if importing large databases)

## Installation Methods

### Method 1: Quick Install (Recommended)

```bash
# 1. Clone or download the repository
# (Already done if you're reading this)

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Initialize and seed the database
python scripts/seed_database.py

# 4. Verify installation
python verify_installation.py

# 5. Start the application
python app.py
```

Access at: http://localhost:5000

---

### Method 2: Using the Run Script

```bash
# Install dependencies first
pip install -r requirements.txt

# Run the application (auto-seeds database if needed)
chmod +x run.sh
./run.sh
```

---

### Method 3: Step-by-Step Manual Installation

#### Step 1: Check Python Version
```bash
python --version
# Should be 3.8 or higher
```

If Python 3 is installed as `python3`:
```bash
python3 --version
# Use python3 instead of python in all commands
```

#### Step 2: Install Dependencies
```bash
pip install Flask==3.0.0
pip install Flask-CORS==4.0.0
pip install requests==2.31.0
pip install cryptography==41.0.7
pip install Werkzeug==3.0.1
```

Or install all at once:
```bash
pip install -r requirements.txt
```

#### Step 3: Verify Dependencies
```bash
python -c "import flask; print('Flask:', flask.__version__)"
python -c "import flask_cors; print('Flask-CORS installed')"
```

#### Step 4: Create Database Directory
```bash
mkdir -p data
```

#### Step 5: Seed Database
```bash
python scripts/seed_database.py
```

Expected output:
```
Adding 60 common leaked passwords...
  Added: 123*** (appeared 23,597,311 times)
  ...
Database seeded successfully!
Total passwords in database: 59
```

#### Step 6: Verify Installation
```bash
python verify_installation.py
```

Expected output:
```
✅ ALL CHECKS PASSED!
```

#### Step 7: Run the Application
```bash
python app.py
```

Expected output:
```
Database initialized
Starting server on http://localhost:5000
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
 * Running on http://[your-ip]:5000
```

---

## Virtual Environment (Recommended)

Using a virtual environment keeps dependencies isolated:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Continue with normal installation...
python scripts/seed_database.py
python app.py
```

---

## Docker Installation (Alternative)

If you prefer Docker:

```bash
# Create Dockerfile (not included by default)
cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python scripts/seed_database.py

EXPOSE 5000

CMD ["python", "app.py"]
EOF

# Build image
docker build -t password-leak-checker .

# Run container
docker run -p 5000:5000 password-leak-checker
```

---

## Troubleshooting Installation

### Problem: "No module named 'flask'"

**Solution:**
```bash
pip install Flask
# or
pip install -r requirements.txt
```

### Problem: "Permission denied" when running scripts

**Solution:**
```bash
chmod +x run.sh
chmod +x verify_installation.py
```

### Problem: Port 5000 already in use

**Solution:**
```bash
# Find what's using port 5000
lsof -i :5000

# Kill the process
kill -9 [PID]

# Or use a different port
# Edit app.py and change: app.run(port=5000)
# to: app.run(port=8000)
```

### Problem: Database file locked

**Solution:**
```bash
# Stop any running instances
# Then remove the database and recreate
rm data/passwords.db
python scripts/seed_database.py
```

### Problem: pip install fails

**Solution:**
```bash
# Upgrade pip
pip install --upgrade pip

# Try again
pip install -r requirements.txt

# If still fails, install one by one:
pip install Flask
pip install Flask-CORS
pip install requests
```

### Problem: "ModuleNotFoundError: No module named 'flask_cors'"

**Solution:**
```bash
# The package name uses a hyphen
pip install Flask-CORS

# Not underscore
```

---

## Post-Installation Steps

### 1. Test the Installation
```bash
python test_api.py
```

### 2. Access the Application
Open your browser to:
- Main app: http://localhost:5000
- Demo page: http://localhost:5000/demo

### 3. Try Sample Passwords
Test with these common passwords:
- `password`
- `123456`
- `admin`

### 4. Import Custom Passwords (Optional)
```bash
# Create a password file (one per line)
echo "test123" > my_passwords.txt
echo "demo456" >> my_passwords.txt

# Import
python scripts/download_databases.py my_passwords.txt
```

---

## Production Deployment

For production use, additional setup is recommended:

### 1. Use HTTPS
```bash
# Generate SSL certificate (Let's Encrypt)
sudo certbot certonly --standalone -d yourdomain.com
```

### 2. Use Production Server (Gunicorn)
```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:443 \
  --certfile=/etc/letsencrypt/live/yourdomain.com/fullchain.pem \
  --keyfile=/etc/letsencrypt/live/yourdomain.com/privkey.pem \
  app:app
```

### 3. Set Up Systemd Service (Linux)
```bash
# Create service file
sudo nano /etc/systemd/system/password-checker.service

# Add this content:
[Unit]
Description=Password Leak Checker
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/project
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/gunicorn -w 4 -b 0.0.0.0:5000 app:app

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable password-checker
sudo systemctl start password-checker
```

### 4. Configure Nginx (Reverse Proxy)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Upgrade Instructions

To upgrade to a newer version:

```bash
# Backup database
cp data/passwords.db data/passwords.db.backup

# Pull latest changes
git pull origin main

# Update dependencies
pip install -r requirements.txt --upgrade

# Restart application
# (Ctrl+C to stop, then)
python app.py
```

---

## Uninstallation

To completely remove the application:

```bash
# Stop the application (Ctrl+C)

# Remove virtual environment (if used)
rm -rf venv/

# Remove database
rm -rf data/

# Remove Python cache
rm -rf __pycache__/
rm -rf scripts/__pycache__/

# Optionally remove the entire directory
cd ..
rm -rf password-leak-checker/
```

---

## Getting Help

If you encounter issues:

1. **Check the documentation**:
   - [README.md](README.md)
   - [QUICK_START.md](QUICK_START.md)
   - [USAGE.md](USAGE.md)

2. **Verify installation**:
   ```bash
   python verify_installation.py
   ```

3. **Check logs**:
   - Look for error messages in terminal output
   - Flask debug mode shows detailed errors

4. **Common issues**: See troubleshooting section above

---

## System-Specific Notes

### Linux
- Usually works out of the box
- May need `sudo` for system-wide pip installs
- Use virtual environment to avoid permission issues

### macOS
- Python 3 might be installed as `python3`
- Use `pip3` instead of `pip`
- Homebrew can install Python: `brew install python3`

### Windows
- Use Command Prompt or PowerShell
- Python executable might be `py` instead of `python`
- Virtual environment activation: `venv\Scripts\activate`
- If pip not found: `py -m pip install -r requirements.txt`

---

## Minimum Installation (No Dependencies)

If you only want to test locally without installing packages:

```bash
# Python 3's built-in HTTP server
# (Note: API won't work, only static files)
cd static
python -m http.server 8000

# Access at http://localhost:8000
```

This serves only the frontend, without database or API functionality.

---

## Next Steps

After successful installation:

1. 📖 Read [USAGE.md](USAGE.md) for detailed usage
2. 🔐 Review [SECURITY.md](SECURITY.md) for security info
3. 🎨 Visit `/demo` to see censoring in action
4. 🧪 Run `python test_api.py` to test API
5. 📊 Import your own password lists

---

**Installation complete! 🎉**

Access your application at: http://localhost:5000
