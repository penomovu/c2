import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/breachchecker.db');

if (process.argv.length < 3) {
  console.log('Usage: node scripts/import_file.js <path_to_file> [source_name]');
  console.log('Format expected: One entry per line.');
  console.log('  - passwords: "password" or "password:count"');
  console.log('  - emails: "email" or "email:password" or "email:hash"');
  process.exit(1);
}

const filePath = process.argv[2];
const sourceName = process.argv[3] || 'manual_import';

if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found: ${filePath}`);
  process.exit(1);
}

const db = new Database(DB_PATH);

// Detect content type roughly (password list vs email list)
// For now we'll assume password list for simplicity, or try to detect
const IMPORT_TYPE = 'password'; 

async function importFile() {
  console.log(`🚀 Importing from ${filePath}...`);
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO leaked_passwords (hash_prefix, hash_suffix, password_text, count, sources, date_first_seen)
    VALUES (?, ?, ?, COALESCE((SELECT count FROM leaked_passwords WHERE hash_prefix = ? AND hash_suffix = ?) + 1, 1), ?, CURRENT_TIMESTAMP)
  `);
  
  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO breach_sources (id, name, type) VALUES (?, ?, ?)
  `);
  
  insertSource.run(sourceName.toLowerCase().replace(/\s+/g, '_'), sourceName, 'password');

  let count = 0;
  let skipped = 0;
  const batchSize = 1000;
  
  // We'll use a transaction for speed
  const runTransaction = db.transaction((lines) => {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      let password = trimmed;
      let existingCount = 1;
      
      // Handle "password:count" format
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        // Check if the second part is a number
        if (/^\d+$/.test(parts[parts.length - 1])) {
           existingCount = parseInt(parts.pop(), 10);
           password = parts.join(':');
        }
      }
      
      const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = hash.substring(0, 5);
      const suffix = hash.substring(5);
      
      stmt.run(prefix, suffix, password, prefix, suffix, JSON.stringify([sourceName]));
    }
  });

  let batch = [];
  
  for await (const line of rl) {
    if (line.trim()) {
      batch.push(line);
      count++;
      
      if (batch.length >= batchSize) {
        runTransaction(batch);
        process.stdout.write(`  Processed ${count} lines...\r`);
        batch = [];
      }
    }
  }
  
  if (batch.length > 0) {
    runTransaction(batch);
  }
  
  console.log(`\n✅ Import complete. Processed ${count} lines.`);
}

importFile().catch(console.error);
