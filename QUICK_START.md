# 🚀 Quick Start Guide

## Install and Run (3 Steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Populate Database
```bash
npm run db:fetch-breaches
```

### 3. Start Development Server
```bash
npm run dev
```

**Access**: http://localhost:5173

---

## Import Custom Data

### Import Breach Files
If you have a list of leaked passwords (e.g. from research datasets):

```bash
npm run db:import path/to/passwords.txt
```

### Supported Formats
- Plain text (one password per line)
- `password:count` format
- `email:password` (passwords will be extracted)

---

## Project Structure

```
project/
├── server.js              # Node.js Express API
├── src/                   # React Frontend
├── scripts/               # Utility scripts
│   ├── fetch_breaches.js  # Download safe datasets (HIBP, SecLists)
│   └── import_file.js     # Import custom files
├── data/                  # Database (auto-created)
│   └── breachchecker.db   # SQLite database
└── Documentation files
```

## Next Steps

📖 **Read More**:
- [README.md](README.md) - Overview
- [DATA_SOURCES.md](DATA_SOURCES.md) - How to make the DB exhaustive
