import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs/promises';
import { config } from './src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PasswordCheckerApp {
  constructor() {
    this.app = express();
    this.port = config.port;
    this.database = null;
    this.initMiddleware();
    this.initDatabase();
    this.initRoutes();
  }

  initMiddleware() {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"]
        }
      }
    }));
    
    this.app.use(compression());
    this.app.use(cors());
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: false }));
    
    // Serve static files
    this.app.use(express.static(path.join(__dirname, 'dist'), {
      maxAge: '1d',
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
  }

  initDatabase() {
    try {
      // Ensure data directory exists
      await fs.mkdir('data', { recursive: true });
      
      this.database = new Database('data/passwords.db');
      
      // Create tables
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS leaked_passwords (
          hash_prefix TEXT NOT NULL,
          hash_suffix TEXT NOT NULL,
          count INTEGER DEFAULT 1,
          PRIMARY KEY (hash_prefix, hash_suffix)
        )
      `);
      
      this.database.exec(`
        CREATE INDEX IF NOT EXISTS idx_hash_prefix 
        ON leaked_passwords(hash_prefix)
      `);
      
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS breach_stats (
          id INTEGER PRIMARY KEY DEFAULT 1,
          total_passwords INTEGER DEFAULT 0,
          total_breaches INTEGER DEFAULT 0,
          last_updated TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Initialize stats if not exists
      const statsExists = this.database.prepare('SELECT id FROM breach_stats WHERE id = 1').get();
      if (!statsExists) {
        this.database.prepare(`
          INSERT INTO breach_stats (id, total_passwords, total_breaches, last_updated)
          VALUES (1, 0, 0, datetime('now'))
        `).run();
      }
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      process.exit(1);
    }
  }

  initRoutes() {
    // API Routes
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      });
    });

    this.app.get('/api/range/:hashPrefix', (req, res) => {
      try {
        const { hashPrefix } = req.params;
        
        if (hashPrefix.length !== 5) {
          return res.status(400).json({ 
            error: 'Hash prefix must be exactly 5 characters' 
          });
        }
        
        const normalizedPrefix = hashPrefix.toUpperCase();
        
        if (!/^[0-9A-F]{5}$/.test(normalizedPrefix)) {
          return res.status(400).json({ 
            error: 'Invalid hash prefix format. Must be hexadecimal.' 
          });
        }
        
        const stmt = this.database.prepare(`
          SELECT hash_suffix, count 
          FROM leaked_passwords 
          WHERE hash_prefix = ?
        `);
        
        const matches = stmt.all(normalizedPrefix).map(row => ({
          suffix: row.hash_suffix,
          count: row.count
        }));
        
        res.json({ matches });
      } catch (error) {
        console.error('Range query error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.get('/api/stats', (req, res) => {
      try {
        const stmt = this.database.prepare('SELECT * FROM breach_stats WHERE id = 1');
        const stats = stmt.get();
        
        res.json({
          total_passwords: stats?.total_passwords || 0,
          total_breaches: stats?.total_breaches || 0,
          last_updated: stats?.last_updated || null
        });
      } catch (error) {
        console.error('Stats query error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.post('/api/add-passwords', (req, res) => {
      try {
        const { passwords } = req.body;
        
        if (!Array.isArray(passwords)) {
          return res.status(400).json({ 
            error: 'Passwords must be an array' 
          });
        }
        
        const insertStmt = this.database.prepare(`
          INSERT OR REPLACE INTO leaked_passwords (hash_prefix, hash_suffix, count)
          VALUES (?, ?, ?)
        `);
        
        const updateStatsStmt = this.database.prepare(`
          UPDATE breach_stats 
          SET total_passwords = ?, last_updated = datetime('now')
          WHERE id = 1
        `);
        
        const transaction = this.database.transaction((passwords) => {
          let addedCount = 0;
          
          for (const passwordEntry of passwords) {
            let password, count = 1;
            
            if (typeof passwordEntry === 'string') {
              password = passwordEntry;
            } else if (typeof passwordEntry === 'object' && passwordEntry !== null) {
              password = passwordEntry.password;
              count = passwordEntry.count || 1;
            }
            
            if (!password || typeof password !== 'string') continue;
            
            const hashFull = crypto.createHash('sha1')
              .update(password, 'utf8')
              .digest('hex')
              .toUpperCase();
            
            const hashPrefix = hashFull.substring(0, 5);
            const hashSuffix = hashFull.substring(5);
            
            insertStmt.run(hashPrefix, hashSuffix, count);
            addedCount++;
          }
          
          const totalStmt = this.database.prepare('SELECT COUNT(*) as total FROM leaked_passwords');
          const { total } = totalStmt.get();
          updateStatsStmt.run(total);
          
          return { addedCount, total };
        });
        
        const result = transaction(passwords);
        
        res.json({
          success: true,
          added: result.addedCount,
          total: result.total
        });
      } catch (error) {
        console.error('Add passwords error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.get('/api/search/:hashPrefix', (req, res) => {
      try {
        const { hashPrefix } = req.params;
        
        if (hashPrefix.length !== 5) {
          return res.status(400).json({ 
            error: 'Hash prefix must be exactly 5 characters' 
          });
        }
        
        const normalizedPrefix = hashPrefix.toUpperCase();
        
        if (!/^[0-9A-F]{5}$/.test(normalizedPrefix)) {
          return res.status(400).json({ 
            error: 'Invalid hash prefix format. Must be hexadecimal.' 
          });
        }
        
        const stmt = this.database.prepare(`
          SELECT hash_suffix, count 
          FROM leaked_passwords 
          WHERE hash_prefix = ?
          ORDER BY count DESC
        `);
        
        const matches = stmt.all(normalizedPrefix).map(row => ({
          suffix: row.hash_suffix,
          count: row.count
        }));
        
        res.json({ 
          hash_prefix: normalizedPrefix,
          matches_count: matches.length,
          matches 
        });
      } catch (error) {
        console.error('Search query error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Serve React app for all other routes
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });

    // Error handler
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      res.status(500).json({ 
        error: 'Something went wrong!',
        message: config.env === 'development' ? error.message : 'Internal server error'
      });
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`
🔐 Password Leak Checker v2.0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server running on http://localhost:${this.port}
📊 Database: ${this.database ? 'Connected' : 'Disconnected'}
🌍 Environment: ${config.env}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  }
}

// Start the application
new PasswordCheckerApp().start();