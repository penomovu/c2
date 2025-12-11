import os
import sys
import hashlib
import sqlite3
import requests
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

DATABASE_PATH = 'data/passwords.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    return conn

def download_rockyou_sample():
    print('Note: For legal and ethical reasons, this script provides a framework')
    print('for importing password breach data, but does not download actual breach files.')
    print('')
    print('To use real breach data:')
    print('1. Obtain breach data legally and ethically')
    print('2. Ensure you have permission to use the data')
    print('3. Format the data as one password per line')
    print('4. Use the import_password_file() function to import it')
    print('')
    print('Popular legal sources:')
    print('- SecLists: https://github.com/danielmiessler/SecLists')
    print('- Have I Been Pwned API: https://haveibeenpwned.com/API/v3')
    print('- NIST Password List: https://github.com/cry/nbp')
    
def import_password_file(filepath, batch_size=1000):
    if not os.path.exists(filepath):
        print(f'Error: File {filepath} not found')
        return
    
    print(f'Importing passwords from {filepath}...')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    passwords_added = 0
    batch = []
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line_num, line in enumerate(f, 1):
            password = line.strip()
            
            if not password:
                continue
            
            parts = password.split(':')
            if len(parts) == 2:
                password_text = parts[0]
                try:
                    count = int(parts[1])
                except ValueError:
                    count = 1
            else:
                password_text = password
                count = 1
            
            hash_full = hashlib.sha1(password_text.encode('utf-8')).hexdigest().upper()
            hash_prefix = hash_full[:5]
            hash_suffix = hash_full[5:]
            
            batch.append((hash_prefix, hash_suffix, count))
            
            if len(batch) >= batch_size:
                cursor.executemany('''
                    INSERT OR REPLACE INTO leaked_passwords (hash_prefix, hash_suffix, count)
                    VALUES (?, ?, ?)
                ''', batch)
                conn.commit()
                passwords_added += len(batch)
                print(f'  Imported {passwords_added:,} passwords...', end='\r')
                batch = []
        
        if batch:
            cursor.executemany('''
                INSERT OR REPLACE INTO leaked_passwords (hash_prefix, hash_suffix, count)
                VALUES (?, ?, ?)
            ''', batch)
            conn.commit()
            passwords_added += len(batch)
    
    cursor.execute('SELECT COUNT(*) as total FROM leaked_passwords')
    total = cursor.fetchone()[0]
    
    cursor.execute('''
        UPDATE breach_stats 
        SET total_passwords = ?, last_updated = ?
        WHERE id = 1
    ''', (total, datetime.now().isoformat()))
    
    conn.commit()
    conn.close()
    
    print(f'\n\nImport complete!')
    print(f'Passwords imported: {passwords_added:,}')
    print(f'Total in database: {total:,}')

def create_sample_breach_file(output_path='data/sample_breaches.txt'):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    sample_passwords = [
        'password:1000000',
        'letmein:500000',
        'welcome123:250000',
        'admin123:750000',
        'qwerty:1500000',
    ]
    
    with open(output_path, 'w') as f:
        for password in sample_passwords:
            f.write(password + '\n')
    
    print(f'Created sample breach file: {output_path}')
    print('Format: password:count (one per line)')
    return output_path

if __name__ == '__main__':
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
        import_password_file(filepath)
    else:
        print('Password Breach Database Downloader')
        print('=' * 50)
        print('')
        download_rockyou_sample()
        print('')
        print('Creating sample file for demonstration...')
        sample_file = create_sample_breach_file()
        print('')
        print(f'To import a password file, run:')
        print(f'  python scripts/download_databases.py <filepath>')
        print('')
        print(f'Example with sample file:')
        print(f'  python scripts/download_databases.py {sample_file}')
