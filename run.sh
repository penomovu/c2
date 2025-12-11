#!/bin/bash

echo "================================================"
echo "Password Leak Checker - Startup Script"
echo "================================================"
echo ""

if [ ! -f "data/passwords.db" ]; then
    echo "Database not found. Seeding database..."
    python scripts/seed_database.py
    echo ""
fi

echo "Starting server..."
echo "Access the application at: http://localhost:5000"
echo "Press Ctrl+C to stop"
echo ""

python app.py
