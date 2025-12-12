import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/breachchecker.db');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);

// Sources to fetch
const SOURCES = {
  TOP_PASSWORDS: {
    url: 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/best1050.txt',
    name: 'SecLists Top 1050',
    type: 'password'
  },
  // We can add more sources here
};

async function fetchAndImport() {
  console.log('🚀 Starting breach data fetcher...');
  console.log(`📂 Database: ${DB_PATH}`);

  // Create tables if they don't exist (simplified version of server.js schema)
  createSchema();

  await importTopPasswords();
  await importHIBPSample();

  console.log('✅ All imports completed.');
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leaked_passwords (
      hash_prefix TEXT NOT NULL,
      hash_suffix TEXT NOT NULL,
      password_text TEXT,
      count INTEGER DEFAULT 1,
      sources TEXT,
      date_first_seen TEXT,
      date_last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
      confidence_score REAL DEFAULT 1.0,
      PRIMARY KEY (hash_prefix, hash_suffix)
    );
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS breach_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      date_added TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function importTopPasswords() {
  const source = SOURCES.TOP_PASSWORDS;
  console.log(`\n⬇️  Fetching ${source.name}...`);
  
  try {
    const response = await fetch(source.url);
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    const passwords = text.split('\n');
    
    console.log(`Processing ${passwords.length} passwords...`);
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO leaked_passwords (hash_prefix, hash_suffix, password_text, count, sources, date_first_seen)
      VALUES (?, ?, ?, COALESCE((SELECT count FROM leaked_passwords WHERE hash_prefix = ? AND hash_suffix = ?) + 1, 1), ?, CURRENT_TIMESTAMP)
    `);

    const insertSource = db.prepare(`
      INSERT OR IGNORE INTO breach_sources (id, name, type) VALUES (?, ?, ?)
    `);
    
    insertSource.run('seclists_top10k', source.name, source.type);

    let count = 0;
    const batchSize = 1000;
    
    db.transaction(() => {
      for (const password of passwords) {
        const p = password.trim();
        if (!p) continue;
        
        const hash = crypto.createHash('sha1').update(p).digest('hex').toUpperCase();
        const prefix = hash.substring(0, 5);
        const suffix = hash.substring(5);
        
        stmt.run(prefix, suffix, p, prefix, suffix, JSON.stringify(['seclists_top10k']));
        count++;
        
        if (count % batchSize === 0) {
          process.stdout.write(`  Imported ${count} passwords...\r`);
        }
      }
    })();
    
    console.log(`  ✅ Imported ${count} passwords from ${source.name}`);
    
  } catch (error) {
    console.error(`❌ Failed to fetch ${source.name}:`, error.message);
  }
}

async function importHIBPSample() {
  console.log('\n⬇️  Fetching HIBP sample (simulating "lots of databases")...');
  // We'll fetch a few ranges to get real leaked hashes that we don't have cleartext for
  
  const prefixes = ['00000', '12345', 'ABCDE', 'CAFEB', 'BADCA']; // Sample prefixes
  
  for (const prefix of prefixes) {
    try {
      console.log(`  Fetching range ${prefix}...`);
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const text = await response.text();
      const lines = text.split('\r\n');
      
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO leaked_passwords (hash_prefix, hash_suffix, count, sources, date_first_seen)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      const insertSource = db.prepare(`
        INSERT OR IGNORE INTO breach_sources (id, name, type) VALUES (?, ?, ?)
      `);
      
      insertSource.run('hibp_api', 'Have I Been Pwned API', 'password');

      let imported = 0;
      
      db.transaction(() => {
        for (const line of lines) {
          if (!line) continue;
          const [suffix, countStr] = line.split(':');
          const count = parseInt(countStr, 10);
          
          stmt.run(prefix, suffix, count, JSON.stringify(['hibp_api']));
          imported++;
        }
      })();
      
      console.log(`    Imported ${imported} hashes for prefix ${prefix}`);
      
    } catch (error) {
      console.error(`    Failed to fetch range ${prefix}:`, error.message);
    }
  }
}

fetchAndImport().catch(console.error);
