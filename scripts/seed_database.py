import sys
import os
import hashlib
import sqlite3
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

DATABASE_PATH = 'data/passwords.db'

COMMON_LEAKED_PASSWORDS = [
    ('123456', 23597311),
    ('password', 9279037),
    ('123456789', 7870506),
    ('12345678', 3645804),
    ('12345', 2413945),
    ('111111', 3122985),
    ('1234567', 2230508),
    ('sunshine', 2228932),
    ('qwerty', 3946737),
    ('iloveyou', 1647621),
    ('princess', 1330259),
    ('admin', 2559558),
    ('welcome', 1084054),
    ('666666', 1056093),
    ('abc123', 2670319),
    ('football', 1070730),
    ('123123', 1915798),
    ('monkey', 1005359),
    ('654321', 1360683),
    ('!@#$%^&*', 1028632),
    ('charlie', 1067921),
    ('aa123456', 965719),
    ('donald', 936515),
    ('password1', 2367727),
    ('qwerty123', 905491),
    ('zxcvbnm', 830846),
    ('letmein', 1563045),
    ('trustno1', 802580),
    ('dragon', 1006666),
    ('master', 1054364),
    ('hello', 923857),
    ('freedom', 890485),
    ('whatever', 804346),
    ('qazwsx', 1134279),
    ('trustno1', 931755),
    ('Password', 962329),
    ('123qwe', 1011761),
    ('1q2w3e4r', 1065925),
    ('1qaz2wsx', 1040920),
    ('starwars', 832589),
    ('shadow', 871932),
    ('baseball', 984712),
    ('superman', 843040),
    ('michael', 1086408),
    ('696969', 957621),
    ('mustang', 794158),
    ('jessica', 938060),
    ('password123', 842789),
    ('password1234', 748679),
    ('pokemon', 781594),
    ('test', 1234567),
    ('root', 987654),
    ('admin123', 876543),
    ('guest', 765432),
    ('user', 654321),
    ('default', 543210),
    ('support', 432109),
    ('demo', 321098),
    ('sample', 210987),
    ('temp', 109876),
]

def add_password_to_db(conn, password, count):
    hash_full = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
    hash_prefix = hash_full[:5]
    hash_suffix = hash_full[5:]
    
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO leaked_passwords (hash_prefix, hash_suffix, count)
        VALUES (?, ?, ?)
    ''', (hash_prefix, hash_suffix, count))

def seed_database():
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
    
    print(f'Adding {len(COMMON_LEAKED_PASSWORDS)} common leaked passwords...')
    
    for password, count in COMMON_LEAKED_PASSWORDS:
        add_password_to_db(conn, password, count)
        print(f'  Added: {password[:3]}*** (appeared {count:,} times)')
    
    cursor.execute('SELECT COUNT(*) as total FROM leaked_passwords')
    total = cursor.fetchone()[0]
    
    cursor.execute('DELETE FROM breach_stats WHERE id = 1')
    cursor.execute('''
        INSERT INTO breach_stats (id, total_passwords, total_breaches, last_updated)
        VALUES (1, ?, ?, ?)
    ''', (total, 500, datetime.now().isoformat()))
    
    conn.commit()
    conn.close()
    
    print(f'\nDatabase seeded successfully!')
    print(f'Total passwords in database: {total:,}')
    print(f'Database location: {DATABASE_PATH}')

if __name__ == '__main__':
    seed_database()
