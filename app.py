import os
import hashlib
import sqlite3
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
from pathlib import Path

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

DATABASE_PATH = 'data/passwords.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    os.makedirs('data', exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leaked_passwords (
            hash_prefix TEXT NOT NULL,
            hash_suffix TEXT NOT NULL,
            count INTEGER DEFAULT 1,
            PRIMARY KEY (hash_prefix, hash_suffix)
        )
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_hash_prefix 
        ON leaked_passwords(hash_prefix)
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS breach_stats (
            id INTEGER PRIMARY KEY,
            total_passwords INTEGER,
            total_breaches INTEGER,
            last_updated TEXT
        )
    ''')
    
    cursor.execute('SELECT COUNT(*) FROM breach_stats')
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO breach_stats (total_passwords, total_breaches, last_updated)
            VALUES (0, 0, ?)
        ''', (datetime.now().isoformat(),))
    
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/demo')
def demo():
    return send_from_directory('static', 'demo.html')

@app.route('/api/range/<hash_prefix>')
def check_password_range(hash_prefix):
    if len(hash_prefix) != 5:
        return jsonify({'error': 'Hash prefix must be exactly 5 characters'}), 400
    
    hash_prefix = hash_prefix.upper()
    
    if not all(c in '0123456789ABCDEF' for c in hash_prefix):
        return jsonify({'error': 'Invalid hash prefix format'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT hash_suffix, count 
            FROM leaked_passwords 
            WHERE hash_prefix = ?
        ''', (hash_prefix,))
        
        matches = []
        for row in cursor.fetchall():
            matches.append({
                'suffix': row['hash_suffix'],
                'count': row['count']
            })
        
        conn.close()
        
        return jsonify({'matches': matches})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats')
def get_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM breach_stats WHERE id = 1')
        stats = cursor.fetchone()
        
        if stats:
            result = {
                'total_passwords': stats['total_passwords'],
                'total_breaches': stats['total_breaches'],
                'last_updated': stats['last_updated']
            }
        else:
            result = {
                'total_passwords': 0,
                'total_breaches': 0,
                'last_updated': None
            }
        
        conn.close()
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/add_passwords', methods=['POST'])
def add_passwords():
    data = request.json
    
    if not data or 'passwords' not in data:
        return jsonify({'error': 'Missing passwords field'}), 400
    
    passwords = data['passwords']
    
    if not isinstance(passwords, list):
        return jsonify({'error': 'Passwords must be a list'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        added_count = 0
        
        for password_entry in passwords:
            if isinstance(password_entry, str):
                password = password_entry
                count = 1
            elif isinstance(password_entry, dict):
                password = password_entry.get('password')
                count = password_entry.get('count', 1)
            else:
                continue
            
            if not password:
                continue
            
            hash_full = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
            hash_prefix = hash_full[:5]
            hash_suffix = hash_full[5:]
            
            cursor.execute('''
                INSERT OR REPLACE INTO leaked_passwords (hash_prefix, hash_suffix, count)
                VALUES (?, ?, ?)
            ''', (hash_prefix, hash_suffix, count))
            
            added_count += 1
        
        cursor.execute('SELECT COUNT(*) as total FROM leaked_passwords')
        total = cursor.fetchone()['total']
        
        cursor.execute('''
            UPDATE breach_stats 
            SET total_passwords = ?, last_updated = ?
            WHERE id = 1
        ''', (total, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'added': added_count,
            'total': total
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_database()
    print('Database initialized')
    print('Starting server on http://localhost:5000')
    app.run(debug=True, host='0.0.0.0', port=5000)
