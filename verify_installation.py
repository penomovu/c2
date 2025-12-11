#!/usr/bin/env python3
"""
Verification script for Password Leak Checker installation.
Checks that all components are properly installed and configured.
"""

import os
import sys
import sqlite3
from pathlib import Path

def check_file(filepath, description):
    """Check if a file exists."""
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description} MISSING: {filepath}")
        return False

def check_directory(dirpath, description):
    """Check if a directory exists."""
    if os.path.isdir(dirpath):
        print(f"✅ {description}: {dirpath}")
        return True
    else:
        print(f"❌ {description} MISSING: {dirpath}")
        return False

def check_database():
    """Check database integrity."""
    db_path = 'data/passwords.db'
    
    if not os.path.exists(db_path):
        print(f"⚠️  Database not found: {db_path}")
        print("   Run: python scripts/seed_database.py")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM leaked_passwords")
        password_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT * FROM breach_stats WHERE id = 1")
        stats = cursor.fetchone()
        
        conn.close()
        
        print(f"✅ Database operational: {password_count} passwords loaded")
        if stats:
            print(f"   Total passwords: {stats[1]}")
            print(f"   Total breaches: {stats[2]}")
            print(f"   Last updated: {stats[3]}")
        
        return True
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def check_python_syntax():
    """Check Python files for syntax errors."""
    python_files = [
        'app.py',
        'test_api.py',
        'scripts/seed_database.py',
        'scripts/download_databases.py'
    ]
    
    all_valid = True
    for filepath in python_files:
        try:
            with open(filepath, 'r') as f:
                compile(f.read(), filepath, 'exec')
            print(f"✅ Python syntax valid: {filepath}")
        except SyntaxError as e:
            print(f"❌ Python syntax error in {filepath}: {e}")
            all_valid = False
    
    return all_valid

def main():
    print("=" * 70)
    print("Password Leak Checker - Installation Verification")
    print("=" * 70)
    print()
    
    all_checks = []
    
    print("📁 Checking Core Files...")
    print("-" * 70)
    all_checks.append(check_file('app.py', 'Flask application'))
    all_checks.append(check_file('requirements.txt', 'Requirements file'))
    all_checks.append(check_file('run.sh', 'Run script'))
    all_checks.append(check_file('test_api.py', 'Test script'))
    all_checks.append(check_file('.gitignore', 'Git ignore'))
    print()
    
    print("📁 Checking Documentation...")
    print("-" * 70)
    all_checks.append(check_file('README.md', 'README'))
    all_checks.append(check_file('USAGE.md', 'Usage guide'))
    all_checks.append(check_file('SECURITY.md', 'Security docs'))
    all_checks.append(check_file('FEATURES.md', 'Features docs'))
    all_checks.append(check_file('PROJECT_SUMMARY.md', 'Project summary'))
    print()
    
    print("📁 Checking Directories...")
    print("-" * 70)
    all_checks.append(check_directory('static', 'Static files directory'))
    all_checks.append(check_directory('scripts', 'Scripts directory'))
    print()
    
    print("📁 Checking Frontend Files...")
    print("-" * 70)
    all_checks.append(check_file('static/index.html', 'Main HTML'))
    all_checks.append(check_file('static/demo.html', 'Demo HTML'))
    all_checks.append(check_file('static/styles.css', 'CSS styles'))
    all_checks.append(check_file('static/app.js', 'Main JavaScript'))
    all_checks.append(check_file('static/sha1.js', 'SHA-1 library'))
    print()
    
    print("📁 Checking Scripts...")
    print("-" * 70)
    all_checks.append(check_file('scripts/seed_database.py', 'Database seeding'))
    all_checks.append(check_file('scripts/download_databases.py', 'Database import'))
    print()
    
    print("🐍 Checking Python Syntax...")
    print("-" * 70)
    all_checks.append(check_python_syntax())
    print()
    
    print("🗄️  Checking Database...")
    print("-" * 70)
    all_checks.append(check_database())
    print()
    
    print("=" * 70)
    if all(all_checks):
        print("✅ ALL CHECKS PASSED!")
        print()
        print("🚀 Ready to run:")
        print("   python app.py")
        print("   or")
        print("   ./run.sh")
        print()
        print("🌐 Then visit: http://localhost:5000")
        print("=" * 70)
        return 0
    else:
        print("⚠️  SOME CHECKS FAILED")
        print()
        print("Please address the issues above before running.")
        print("=" * 70)
        return 1

if __name__ == '__main__':
    sys.exit(main())
