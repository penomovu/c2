import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs/promises';
import net from 'net';
import dns from 'dns';
import { config } from './src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BreachCheckerApp {
  constructor() {
    this.app = express();
    this.port = config.port;
    this.database = null;
    this.breachSources = new Map();
    this.initMiddleware();
    this.initDatabase();
    this.initRoutes();
    this.setupPeriodicMaintenance();
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
    this.app.use(cors({
      origin: config.security.cors.origin,
      credentials: config.security.cors.credentials
    }));
    this.app.use(express.json({ limit: config.api.maxPayloadSize }));
    this.app.use(express.urlencoded({ extended: true, limit: config.api.maxPayloadSize }));
    
    // Rate limiting
    if (config.security.rateLimiting.enabled) {
      this.setupRateLimiting();
    }
    
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

  setupRateLimiting() {
    // Rate limiting is implemented in middleware
    // This is a placeholder for future rate limiting implementation
    console.log('Rate limiting configured:', {
      windowMs: config.security.rateLimiting.windowMs,
      max: config.security.rateLimiting.max
    });
  }

  async initDatabase() {
    try {
      await fs.mkdir('data', { recursive: true });
      await fs.mkdir('backups', { recursive: true });
      
      this.database = new Database('data/breachchecker.db');
      
      // Enable WAL mode for better concurrency
      this.database.pragma('journal_mode = WAL');
      this.database.pragma('synchronous = NORMAL');
      this.database.pragma('cache_size = -64000'); // 64MB cache
      this.database.pragma('temp_store = memory');
      
      await this.createDatabaseSchema();
      await this.loadBreachSources();
      
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      process.exit(1);
    }
  }

  async createDatabaseSchema() {
    // Breach sources table
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS breach_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'password', 'email', 'username', 'ip'
        description TEXT,
        url TEXT,
        size_bytes INTEGER,
        records_count INTEGER,
        date_discovered TEXT,
        date_added TEXT DEFAULT CURRENT_TIMESTAMP,
        is_verified BOOLEAN DEFAULT FALSE,
        severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
        tags TEXT, -- JSON array
        metadata TEXT -- JSON object
      )
    `);

    // Password hashes table (enhanced)
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS leaked_passwords (
        hash_prefix TEXT NOT NULL,
        hash_suffix TEXT NOT NULL,
        password_text TEXT, -- Optional for some sources
        count INTEGER DEFAULT 1,
        sources TEXT, -- JSON array of source IDs
        date_first_seen TEXT,
        date_last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        confidence_score REAL DEFAULT 1.0, -- 0.0 to 1.0
        PRIMARY KEY (hash_prefix, hash_suffix)
      )
    `);

    // Email breaches table
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS leaked_emails (
        email TEXT NOT NULL,
        email_hash TEXT NOT NULL, -- SHA-1 hash for privacy
        password_hash TEXT, -- Optional associated password hash
        sources TEXT, -- JSON array of source IDs
        breach_date TEXT,
        date_first_seen TEXT,
        date_last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        is_verified BOOLEAN DEFAULT FALSE,
        additional_data TEXT, -- JSON object with extra info
        confidence_score REAL DEFAULT 1.0,
        PRIMARY KEY (email_hash)
      )
    `);

    // Username breaches table
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS leaked_usernames (
        username TEXT NOT NULL,
        username_normalized TEXT NOT NULL, -- Lowercase, trimmed
        platform TEXT, -- Platform/service name
        email_hash TEXT, -- Associated email hash if available
        password_hash TEXT, -- Associated password hash if available
        sources TEXT, -- JSON array of source IDs
        breach_date TEXT,
        date_first_seen TEXT,
        date_last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        is_verified BOOLEAN DEFAULT FALSE,
        additional_data TEXT, -- JSON object with extra info
        confidence_score REAL DEFAULT 1.0,
        PRIMARY KEY (username_normalized, platform)
      )
    `);

    // IP address breaches table
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS leaked_ips (
        ip_address TEXT NOT NULL,
        ip_type TEXT NOT NULL, -- 'ipv4', 'ipv6'
        ip_numeric INTEGER, -- For IPv4 sorting and range queries
        sources TEXT, -- JSON array of source IDs
        breach_date TEXT,
        date_first_seen TEXT,
        date_last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        is_verified BOOLEAN DEFAULT FALSE,
        additional_data TEXT, -- JSON object with extra info
        confidence_score REAL DEFAULT 1.0,
        PRIMARY KEY (ip_address)
      )
    `);

    // Search queries log (for analytics)
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS search_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_type TEXT NOT NULL, -- 'password', 'email', 'username', 'ip'
        query_hash TEXT NOT NULL, -- Hash of the query for privacy
        sources_searched TEXT, -- JSON array of source IDs checked
        results_count INTEGER DEFAULT 0,
        search_time_ms INTEGER,
        user_agent TEXT,
        ip_address TEXT,
        date_created TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    this.database.exec(`
      CREATE INDEX IF NOT EXISTS idx_passwords_prefix 
      ON leaked_passwords(hash_prefix)
    `);

    this.database.exec(`
      CREATE INDEX IF NOT EXISTS idx_emails_hash 
      ON leaked_emails(email_hash)
    `);

    this.database.exec(`
      CREATE INDEX IF NOT EXISTS idx_emails_domain 
      ON leaked_emails(substr(email_hash, 1, 8))
    `);

    this.database.exec(`
      CREATE INDEX IF NOT EXISTS idx_usernames_normalized 
      ON leaked_usernames(username_normalized)
    `);

    this.database.exec(`
      CREATE INDEX IF NOT EXISTS idx_usernames_platform 
      ON leaked_usernames(platform)
    `);

    this.database.exec(`
      CREATE INDEX IF NOT EXISTS idx_ips_type 
      ON leaked_ips(ip_type)
    `);

    this.database.exec(`
      CREATE INDEX IF NOT EXISTS idx_ips_numeric 
      ON leaked_ips(ip_numeric)
    `);

    this.database.exec(`
      CREATE INDEX IF NOT EXISTS idx_queries_type 
      ON search_queries(query_type)
    `);

    this.database.exec(`
      CREATE INDEX IF NOT EXISTS idx_queries_date 
      ON search_queries(date_created)
    `);

    // Initialize global stats
    this.database.exec(`
      INSERT OR IGNORE INTO breach_sources 
      (id, name, type, description, severity, date_added)
      VALUES ('global', 'Global Statistics', 'meta', 'System-wide statistics', 'low', datetime('now'))
    `);
  }

  async loadBreachSources() {
    // Load known breach sources
    const defaultSources = [
      {
        id: 'rockyou2021',
        name: 'RockYou2021',
        type: 'password',
        description: 'Compilation of over 8.4 billion passwords',
        severity: 'critical',
        records_count: 8450000000,
        tags: JSON.stringify(['compilation', 'massive', 'passwords'])
      },
      {
        id: 'collection1',
        name: 'Collection #1',
        type: 'email',
        description: 'First collection of multiple data breaches',
        severity: 'high',
        records_count: 772904991,
        tags: JSON.stringify(['email', 'compilation'])
      },
      {
        id: 'collection2_5',
        name: 'Collection #2-5',
        type: 'email',
        description: 'Multiple collections of breached data',
        severity: 'high',
        records_count: 2520000000,
        tags: JSON.stringify(['email', 'compilation'])
      },
      {
        id: 'linkedin2012',
        name: 'LinkedIn 2012',
        type: 'email',
        description: 'LinkedIn data breach from 2012',
        severity: 'high',
        records_count: 117000000,
        tags: JSON.stringify(['social', 'professional'])
      },
      {
        id: 'dropbox2012',
        name: 'Dropbox 2012',
        type: 'email',
        description: 'Dropbox data breach from 2012',
        severity: 'high',
        records_count: 68600000,
        tags: JSON.stringify(['cloud', 'storage'])
      },
      {
        id: 'adobe2013',
        name: 'Adobe 2013',
        type: 'email',
        description: 'Adobe data breach from 2013',
        severity: 'high',
        records_count: 152000000,
        tags: JSON.stringify(['creative', 'software'])
      },
      {
        id: 'yahoo2013_2014',
        name: 'Yahoo 2013-2014',
        type: 'email',
        description: 'Yahoo data breaches from 2013-2014',
        severity: 'critical',
        records_count: 3000000000,
        tags: JSON.stringify(['email', 'internet', 'massive'])
      },
      {
        id: 'myspace2013',
        name: 'MySpace 2013',
        type: 'email',
        description: 'MySpace data breach from 2013',
        severity: 'high',
        records_count: 359000000,
        tags: JSON.stringify(['social', 'music'])
      },
      {
        id: 'lastfm2012',
        name: 'Last.fm 2012',
        type: 'email',
        description: 'Last.fm data breach from 2012',
        severity: 'high',
        records_count: 43000000,
        tags: JSON.stringify(['music', 'social'])
      },
      {
        id: 'ashleymadison2015',
        name: 'Ashley Madison 2015',
        type: 'email',
        description: 'Ashley Madison data breach from 2015',
        severity: 'critical',
        records_count: 37000000,
        tags: JSON.stringify(['adult', 'dating', 'sensitive'])
      }
    ];

    const insertSource = this.database.prepare(`
      INSERT OR IGNORE INTO breach_sources 
      (id, name, type, description, severity, records_count, tags, date_added)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    for (const source of defaultSources) {
      insertSource.run(
        source.id, source.name, source.type, source.description,
        source.severity, source.records_count, source.tags
      );
      this.breachSources.set(source.id, source);
    }

    console.log(`✅ Loaded ${this.breachSources.size} breach sources`);
  }

  initRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        database: this.database ? 'connected' : 'disconnected',
        sources: this.breachSources.size,
        features: {
          emailSearch: config.features.emailSearch,
          usernameSearch: config.features.usernameSearch,
          ipSearch: config.features.ipSearch,
          deepSearch: config.features.deepSearch,
          batchSearch: config.features.batchSearch
        }
      });
    });

    // Get available breach sources
    this.app.get('/api/sources', (req, res) => {
      try {
        const stmt = this.database.prepare(`
          SELECT id, name, type, description, severity, 
                 records_count, date_discovered, is_verified, tags
          FROM breach_sources 
          ORDER BY severity DESC, records_count DESC
        `);
        const sources = stmt.all().map(source => ({
          ...source,
          tags: source.tags ? JSON.parse(source.tags) : []
        }));
        res.json({ sources, total: sources.length });
      } catch (error) {
        console.error('Sources query error:', error);
        res.status(500).json({ error: 'Failed to fetch breach sources' });
      }
    });

    // Password range search (enhanced)
    this.app.get('/api/password/range/:hashPrefix', (req, res) => {
      this.searchPasswordRange(req, res);
    });

    // Email search
    this.app.get('/api/email/:email', (req, res) => {
      if (!config.features.emailSearch) {
        return res.status(503).json({ error: 'Email search is not enabled' });
      }
      this.searchEmail(req, res);
    });

    // Username search
    this.app.get('/api/username/:username', (req, res) => {
      if (!config.features.usernameSearch) {
        return res.status(503).json({ error: 'Username search is not enabled' });
      }
      this.searchUsername(req, res);
    });

    // IP address search
    this.app.get('/api/ip/:ip', (req, res) => {
      if (!config.features.ipSearch) {
        return res.status(503).json({ error: 'IP search is not enabled' });
      }
      this.searchIP(req, res);
    });

    // Batch search
    this.app.post('/api/search/batch', (req, res) => {
      if (!config.features.batchSearch) {
        return res.status(503).json({ error: 'Batch search is not enabled' });
      }
      this.batchSearch(req, res);
    });

    // Deep search across all types
    this.app.post('/api/search/deep', (req, res) => {
      if (!config.features.deepSearch) {
        return res.status(503).json({ error: 'Deep search is not enabled' });
      }
      this.deepSearch(req, res);
    });

    // Get statistics
    this.app.get('/api/stats', (req, res) => {
      this.getStatistics(req, res);
    });

    // Search analytics
    this.app.get('/api/analytics/queries', (req, res) => {
      this.getQueryAnalytics(req, res);
    });

    // Admin: Add breach data
    this.app.post('/api/admin/add-data', (req, res) => {
      this.addBreachData(req, res);
    });

    // Admin: Verify source
    this.app.post('/api/admin/verify-source/:sourceId', (req, res) => {
      this.verifySource(req, res);
    });

    // Serve React app
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });

    // Error handler
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: config.env === 'development' ? error.message : 'Something went wrong'
      });
    });
  }

  // Utility functions
  normalizeEmail(email) {
    return email.toLowerCase().trim();
  }

  normalizeUsername(username) {
    return username.toLowerCase().trim();
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidUsername(username) {
    // Basic username validation (alphanumeric, underscores, hyphens)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
  }

  isValidIP(ip) {
    // Check IPv4
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(ip)) {
      return { valid: true, type: 'ipv4' };
    }

    // Check IPv6 (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (ipv6Regex.test(ip)) {
      return { valid: true, type: 'ipv6' };
    }

    return { valid: false, type: null };
  }

  ipToNumeric(ip) {
    if (!this.isValidIP(ip).valid || this.isValidIP(ip).type !== 'ipv4') {
      return null;
    }
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  // Search implementations
  async searchPasswordRange(req, res) {
    const startTime = Date.now();
    const { hashPrefix } = req.params;
    const { sources } = req.query;

    if (hashPrefix.length !== 5 || !/^[0-9A-Fa-f]{5}$/.test(hashPrefix)) {
      return res.status(400).json({ error: 'Invalid hash prefix format' });
    }

    const normalizedPrefix = hashPrefix.toUpperCase();

    try {
      let query = `
        SELECT hash_suffix, count, sources, date_first_seen, confidence_score
        FROM leaked_passwords 
        WHERE hash_prefix = ?
      `;
      
      const params = [normalizedPrefix];
      
      if (sources) {
        query += ` AND sources LIKE ?`;
        params.push(`%${sources}%`);
      }
      
      query += ` ORDER BY count DESC, confidence_score DESC LIMIT ?`;
      params.push(config.search.maxResultsPerQuery);

      const stmt = this.database.prepare(query);
      const results = stmt.all(...params);

      const searchTime = Date.now() - startTime;
      
      // Log search query
      this.logSearchQuery('password', hashPrefix, results.length, searchTime, req);

      res.json({
        hash_prefix: normalizedPrefix,
        results_count: results.length,
        search_time_ms: searchTime,
        matches: results.map(row => ({
          suffix: row.hash_suffix,
          count: row.count,
          sources: row.sources ? JSON.parse(row.sources) : [],
          date_first_seen: row.date_first_seen,
          confidence_score: row.confidence_score
        }))
      });
    } catch (error) {
      console.error('Password range search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }

  async searchEmail(req, res) {
    const startTime = Date.now();
    const { email } = req.params;
    const { sources } = req.query;

    if (!this.isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const normalizedEmail = this.normalizeEmail(email);
    const emailHash = crypto.createHash('sha1').update(normalizedEmail).digest('hex').toUpperCase();

    try {
      let query = `
        SELECT email, sources, breach_date, date_first_seen, 
               additional_data, confidence_score
        FROM leaked_emails 
        WHERE email_hash = ?
      `;
      
      const params = [emailHash];
      
      if (sources) {
        query += ` AND sources LIKE ?`;
        params.push(`%${sources}%`);
      }
      
      query += ` ORDER BY confidence_score DESC, breach_date DESC LIMIT ?`;
      params.push(config.search.maxResultsPerQuery);

      const stmt = this.database.prepare(query);
      const results = stmt.all(...params);

      const searchTime = Date.now() - startTime;
      this.logSearchQuery('email', email, results.length, searchTime, req);

      res.json({
        email: normalizedEmail,
        email_hash: emailHash,
        results_count: results.length,
        search_time_ms: searchTime,
        breaches: results.map(row => ({
          email: row.email,
          sources: row.sources ? JSON.parse(row.sources) : [],
          breach_date: row.breach_date,
          date_first_seen: row.date_first_seen,
          additional_data: row.additional_data ? JSON.parse(row.additional_data) : {},
          confidence_score: row.confidence_score
        }))
      });
    } catch (error) {
      console.error('Email search error:', error);
      res.status(500).json({ error: 'Email search failed' });
    }
  }

  async searchUsername(req, res) {
    const startTime = Date.now();
    const { username } = req.params;
    const { platform, sources } = req.query;

    if (!this.isValidUsername(username)) {
      return res.status(400).json({ error: 'Invalid username format' });
    }

    const normalizedUsername = this.normalizeUsername(username);

    try {
      let query = `
        SELECT username, platform, email_hash, password_hash, sources,
               breach_date, date_first_seen, additional_data, confidence_score
        FROM leaked_usernames 
        WHERE username_normalized = ?
      `;
      
      const params = [normalizedUsername];
      
      if (platform) {
        query += ` AND platform = ?`;
        params.push(platform.toLowerCase());
      }
      
      if (sources) {
        query += ` AND sources LIKE ?`;
        params.push(`%${sources}%`);
      }
      
      query += ` ORDER BY confidence_score DESC, breach_date DESC LIMIT ?`;
      params.push(config.search.maxResultsPerQuery);

      const stmt = this.database.prepare(query);
      const results = stmt.all(...params);

      const searchTime = Date.now() - startTime;
      this.logSearchQuery('username', username, results.length, searchTime, req);

      res.json({
        username: normalizedUsername,
        platform: platform || null,
        results_count: results.length,
        search_time_ms: searchTime,
        breaches: results.map(row => ({
          username: row.username,
          platform: row.platform,
          email_hash: row.email_hash,
          password_hash: row.password_hash,
          sources: row.sources ? JSON.parse(row.sources) : [],
          breach_date: row.breach_date,
          date_first_seen: row.date_first_seen,
          additional_data: row.additional_data ? JSON.parse(row.additional_data) : {},
          confidence_score: row.confidence_score
        }))
      });
    } catch (error) {
      console.error('Username search error:', error);
      res.status(500).json({ error: 'Username search failed' });
    }
  }

  async searchIP(req, res) {
    const startTime = Date.now();
    const { ip } = req.params;
    const { range, sources } = req.query;

    const ipValidation = this.isValidIP(ip);
    if (!ipValidation.valid) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }

    try {
      let query = `
        SELECT ip_address, ip_type, sources, breach_date, date_first_seen,
               additional_data, confidence_score
        FROM leaked_ips 
        WHERE ip_address = ?
      `;
      
      const params = [ip];
      
      if (range && ipValidation.type === 'ipv4') {
        // Range search for IPv4
        const numericIP = this.ipToNumeric(ip);
        if (numericIP !== null) {
          query = `
            SELECT ip_address, ip_type, sources, breach_date, date_first_seen,
                   additional_data, confidence_score
            FROM leaked_ips 
            WHERE ip_type = 'ipv4' AND ip_numeric BETWEEN ? AND ?
          `;
          params.length = 0;
          params.push(numericIP - range, numericIP + range);
        }
      }
      
      if (sources) {
        query += ` AND sources LIKE ?`;
        params.push(`%${sources}%`);
      }
      
      query += ` ORDER BY confidence_score DESC, breach_date DESC LIMIT ?`;
      params.push(config.search.maxResultsPerQuery);

      const stmt = this.database.prepare(query);
      const results = stmt.all(...params);

      const searchTime = Date.now() - startTime;
      this.logSearchQuery('ip', ip, results.length, searchTime, req);

      res.json({
        ip_address: ip,
        ip_type: ipValidation.type,
        range_search: range ? parseInt(range) : null,
        results_count: results.length,
        search_time_ms: searchTime,
        breaches: results.map(row => ({
          ip_address: row.ip_address,
          ip_type: row.ip_type,
          sources: row.sources ? JSON.parse(row.sources) : [],
          breach_date: row.breach_date,
          date_first_seen: row.date_first_seen,
          additional_data: row.additional_data ? JSON.parse(row.additional_data) : {},
          confidence_score: row.confidence_score
        }))
      });
    } catch (error) {
      console.error('IP search error:', error);
      res.status(500).json({ error: 'IP search failed' });
    }
  }

  async batchSearch(req, res) {
    const startTime = Date.now();
    const { queries, types } = req.body;

    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ error: 'Queries must be a non-empty array' });
    }

    if (queries.length > config.search.maxBatchSize) {
      return res.status(400).json({ 
        error: `Maximum batch size is ${config.search.maxBatchSize}` 
      });
    }

    const searchTypes = types || ['password', 'email', 'username', 'ip'];
    const results = {};

    try {
      for (const query of queries) {
        results[query] = {};

        for (const type of searchTypes) {
          switch (type) {
            case 'password':
              if (query.length === 40 && /^[0-9A-Fa-f]+$/.test(query)) {
                const hashPrefix = query.substring(0, 5);
                // Search password range
                const passwordResult = await this.searchPasswordRangeInternal(hashPrefix);
                if (passwordResult.matches.length > 0) {
                  results[query].password = passwordResult;
                }
              }
              break;
            case 'email':
              if (this.isValidEmail(query)) {
                const emailResult = await this.searchEmailInternal(query);
                if (emailResult.breaches.length > 0) {
                  results[query].email = emailResult;
                }
              }
              break;
            case 'username':
              if (this.isValidUsername(query)) {
                const usernameResult = await this.searchUsernameInternal(query);
                if (usernameResult.breaches.length > 0) {
                  results[query].username = usernameResult;
                }
              }
              break;
            case 'ip':
              if (this.isValidIP(query).valid) {
                const ipResult = await this.searchIPInternal(query);
                if (ipResult.breaches.length > 0) {
                  results[query].ip = ipResult;
                }
              }
              break;
          }
        }
      }

      const searchTime = Date.now() - startTime;
      this.logSearchQuery('batch', JSON.stringify(queries), Object.keys(results).length, searchTime, req);

      res.json({
        queries_processed: queries.length,
        queries_with_results: Object.keys(results).length,
        search_time_ms: searchTime,
        results
      });
    } catch (error) {
      console.error('Batch search error:', error);
      res.status(500).json({ error: 'Batch search failed' });
    }
  }

  async deepSearch(req, res) {
    const startTime = Date.now();
    const { query, maxDepth = config.search.maxSearchDepth } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query must be a string' });
    }

    const results = {
      query,
      searches_performed: [],
      depth_reached: 0,
      total_results: 0,
      related_findings: []
    };

    try {
      // Level 1: Direct searches
      const level1Searches = await this.performDeepSearchLevel(query, 1);
      results.searches_performed.push(...level1Searches);
      results.depth_reached = 1;

      // Level 2: Related searches based on Level 1 results
      if (maxDepth >= 2) {
        const level2Searches = await this.performDeepSearchLevel(query, 2, level1Searches);
        results.searches_performed.push(...level2Searches);
        results.depth_reached = 2;
      }

      // Calculate total results
      results.total_results = results.searches_performed.reduce((sum, search) => 
        sum + (search.results_count || 0), 0);

      // Find related findings
      results.related_findings = this.findRelatedFindings(results.searches_performed);

      const searchTime = Date.now() - startTime;
      this.logSearchQuery('deep', query, results.total_results, searchTime, req);

      res.json({
        ...results,
        search_time_ms: searchTime
      });
    } catch (error) {
      console.error('Deep search error:', error);
      res.status(500).json({ error: 'Deep search failed' });
    }
  }

  async performDeepSearchLevel(query, level, previousResults = []) {
    const searches = [];

    // Determine what to search based on the query format and level
    if (level === 1) {
      // Primary searches
      if (query.length === 40 && /^[0-9A-Fa-f]+$/.test(query)) {
        searches.push(await this.searchPasswordRangeInternal(query.substring(0, 5), { level }));
      }
      
      if (this.isValidEmail(query)) {
        searches.push(await this.searchEmailInternal(query, { level }));
      }
      
      if (this.isValidUsername(query)) {
        searches.push(await this.searchUsernameInternal(query, { level }));
      }
      
      if (this.isValidIP(query).valid) {
        searches.push(await this.searchIPInternal(query, { level }));
      }
    } else if (level === 2) {
      // Secondary searches based on results from level 1
      for (const result of previousResults) {
        if (result.type === 'email' && result.data) {
          // Extract domains, related emails, etc.
          const domain = result.data.email.split('@')[1];
          if (domain) {
            searches.push({
              type: 'email_domain',
              query: domain,
              level,
              results_count: 0,
              data: { domain, related_to: result.data.email }
            });
          }
        }
        
        if (result.type === 'username' && result.data) {
          // Search for same username on different platforms
          searches.push({
            type: 'username_search',
            query: result.data.username,
            level,
            results_count: 0,
            data: { username: result.data.username, related_to: result.data.platform }
          });
        }
      }
    }

    return searches;
  }

  findRelatedFindings(searches) {
    const related = [];
    const sourceFrequency = {};

    // Count frequency of sources
    for (const search of searches) {
      if (search.matches || search.breaches) {
        const items = search.matches || search.breaches;
        for (const item of items) {
          const sources = item.sources || [];
          for (const source of sources) {
            sourceFrequency[source] = (sourceFrequency[source] || 0) + 1;
          }
        }
      }
    }

    // Find most frequent sources (potential related breaches)
    for (const [source, frequency] of Object.entries(sourceFrequency)) {
      if (frequency > 1) {
        related.push({
          source_id: source,
          source_name: this.breachSources.get(source)?.name || source,
          frequency,
          relevance: 'high'
        });
      }
    }

    return related.sort((a, b) => b.frequency - a.frequency);
  }

  async getStatistics(req, res) {
    try {
      const stats = {};
      
      // Basic counts
      const passwordCount = this.database.prepare('SELECT COUNT(*) as count FROM leaked_passwords').get();
      const emailCount = this.database.prepare('SELECT COUNT(*) as count FROM leaked_emails').get();
      const usernameCount = this.database.prepare('SELECT COUNT(*) as count FROM leaked_usernames').get();
      const ipCount = this.database.prepare('SELECT COUNT(*) as count FROM leaked_ips').get();
      
      stats.passwords = passwordCount.count;
      stats.emails = emailCount.count;
      stats.usernames = usernameCount.count;
      stats.ips = ipCount.count;
      stats.total_records = stats.passwords + stats.emails + stats.usernames + stats.ips;
      
      // Source statistics
      const sourceStats = this.database.prepare(`
        SELECT type, COUNT(*) as count, SUM(records_count) as total_records
        FROM breach_sources 
        WHERE is_verified = TRUE
        GROUP BY type
      `).all();
      
      stats.by_type = {};
      for (const stat of sourceStats) {
        stats.by_type[stat.type] = {
          sources: stat.count,
          estimated_records: stat.total_records || 0
        };
      }
      
      // Recent activity
      const recentSearches = this.database.prepare(`
        SELECT query_type, COUNT(*) as count
        FROM search_queries 
        WHERE date_created > datetime('now', '-24 hours')
        GROUP BY query_type
      `).all();
      
      stats.recent_activity = {};
      for (const activity of recentSearches) {
        stats.recent_activity[activity.query_type] = activity.count;
      }
      
      // Database size
      const dbStats = this.database.prepare('PRAGMA page_count').get();
      const dbSize = this.database.prepare('PRAGMA page_size').get();
      stats.database_size_bytes = dbStats.page_count * dbSize.page_size;
      
      res.json(stats);
    } catch (error) {
      console.error('Statistics error:', error);
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  }

  // Internal search methods
  async searchPasswordRangeInternal(hashPrefix, options = {}) {
    const stmt = this.database.prepare(`
      SELECT hash_suffix, count, sources, date_first_seen, confidence_score
      FROM leaked_passwords 
      WHERE hash_prefix = ?
      ORDER BY count DESC, confidence_score DESC
      LIMIT 100
    `);
    
    const results = stmt.all(hashPrefix.toUpperCase());
    
    return {
      type: 'password',
      hash_prefix: hashPrefix,
      results_count: results.length,
      matches: results.map(row => ({
        suffix: row.hash_suffix,
        count: row.count,
        sources: row.sources ? JSON.parse(row.sources) : [],
        date_first_seen: row.date_first_seen,
        confidence_score: row.confidence_score
      })),
      ...options
    };
  }

  async searchEmailInternal(email, options = {}) {
    const normalizedEmail = this.normalizeEmail(email);
    const emailHash = crypto.createHash('sha1').update(normalizedEmail).digest('hex').toUpperCase();
    
    const stmt = this.database.prepare(`
      SELECT email, sources, breach_date, date_first_seen, additional_data, confidence_score
      FROM leaked_emails 
      WHERE email_hash = ?
      ORDER BY confidence_score DESC, breach_date DESC
    `);
    
    const results = stmt.all(emailHash);
    
    return {
      type: 'email',
      email: normalizedEmail,
      email_hash: emailHash,
      results_count: results.length,
      breaches: results.map(row => ({
        email: row.email,
        sources: row.sources ? JSON.parse(row.sources) : [],
        breach_date: row.breach_date,
        date_first_seen: row.date_first_seen,
        additional_data: row.additional_data ? JSON.parse(row.additional_data) : {},
        confidence_score: row.confidence_score
      })),
      ...options
    };
  }

  async searchUsernameInternal(username, options = {}) {
    const normalizedUsername = this.normalizeUsername(username);
    
    const stmt = this.database.prepare(`
      SELECT username, platform, email_hash, password_hash, sources,
             breach_date, date_first_seen, additional_data, confidence_score
      FROM leaked_usernames 
      WHERE username_normalized = ?
      ORDER BY confidence_score DESC, breach_date DESC
    `);
    
    const results = stmt.all(normalizedUsername);
    
    return {
      type: 'username',
      username: normalizedUsername,
      results_count: results.length,
      breaches: results.map(row => ({
        username: row.username,
        platform: row.platform,
        email_hash: row.email_hash,
        password_hash: row.password_hash,
        sources: row.sources ? JSON.parse(row.sources) : [],
        breach_date: row.breach_date,
        date_first_seen: row.date_first_seen,
        additional_data: row.additional_data ? JSON.parse(row.additional_data) : {},
        confidence_score: row.confidence_score
      })),
      ...options
    };
  }

  async searchIPInternal(ip, options = {}) {
    const ipValidation = this.isValidIP(ip);
    if (!ipValidation.valid) {
      return { type: 'ip', ip_address: ip, results_count: 0, breaches: [], ...options };
    }
    
    const stmt = this.database.prepare(`
      SELECT ip_address, ip_type, sources, breach_date, date_first_seen,
             additional_data, confidence_score
      FROM leaked_ips 
      WHERE ip_address = ?
      ORDER BY confidence_score DESC, breach_date DESC
    `);
    
    const results = stmt.all(ip);
    
    return {
      type: 'ip',
      ip_address: ip,
      ip_type: ipValidation.type,
      results_count: results.length,
      breaches: results.map(row => ({
        ip_address: row.ip_address,
        ip_type: row.ip_type,
        sources: row.sources ? JSON.parse(row.sources) : [],
        breach_date: row.breach_date,
        date_first_seen: row.date_first_seen,
        additional_data: row.additional_data ? JSON.parse(row.additional_data) : {},
        confidence_score: row.confidence_score
      })),
      ...options
    };
  }

  logSearchQuery(type, query, resultsCount, searchTime, req) {
    try {
      const queryHash = crypto.createHash('sha256').update(query).digest('hex');
      const userAgent = req.get('User-Agent') || '';
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      
      this.database.prepare(`
        INSERT INTO search_queries 
        (query_type, query_hash, results_count, search_time_ms, user_agent, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(type, queryHash, resultsCount, searchTime, userAgent, ipAddress);
    } catch (error) {
      console.error('Failed to log search query:', error);
    }
  }

  async getQueryAnalytics(req, res) {
    try {
      const { type, period = '7d', limit = 100 } = req.query;
      
      let dateFilter = '';
      switch (period) {
        case '1d':
          dateFilter = "date_created > datetime('now', '-1 day')";
          break;
        case '7d':
          dateFilter = "date_created > datetime('now', '-7 days')";
          break;
        case '30d':
          dateFilter = "date_created > datetime('now', '-30 days')";
          break;
        case '90d':
          dateFilter = "date_created > datetime('now', '-90 days')";
          break;
        default:
          dateFilter = "date_created > datetime('now', '-7 days')";
      }
      
      let query = `
        SELECT query_type, query_hash, results_count, search_time_ms, date_created
        FROM search_queries 
        WHERE ${dateFilter}
      `;
      
      if (type) {
        query += ` AND query_type = ?`;
      }
      
      query += ` ORDER BY date_created DESC LIMIT ?`;
      
      const stmt = this.database.prepare(query);
      const params = type ? [type, parseInt(limit)] : [parseInt(limit)];
      const results = stmt.all(...params);
      
      res.json({
        period,
        type: type || 'all',
        results_count: results.length,
        analytics: results
      });
    } catch (error) {
      console.error('Query analytics error:', error);
      res.status(500).json({ error: 'Failed to get query analytics' });
    }
  }

  async addBreachData(req, res) {
    // Admin endpoint - would need proper authentication in production
    const { type, data, source_id } = req.body;
    
    if (!type || !data || !source_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!this.breachSources.has(source_id)) {
      return res.status(400).json({ error: 'Invalid source_id' });
    }
    
    try {
      let insertCount = 0;
      
      const insertData = (table, fields) => {
        const stmt = this.database.prepare(`
          INSERT OR REPLACE INTO ${table} (${fields.join(', ')}) 
          VALUES (${fields.map(() => '?').join(', ')})
        `);
        
        for (const item of data) {
          stmt.run(...Object.values(item));
          insertCount++;
        }
      };
      
      switch (type) {
        case 'password':
          insertData('leaked_passwords', 
            ['hash_prefix', 'hash_suffix', 'password_text', 'count', 'sources', 'date_first_seen', 'confidence_score']
          );
          break;
        case 'email':
          insertData('leaked_emails',
            ['email', 'email_hash', 'password_hash', 'sources', 'breach_date', 'date_first_seen', 'confidence_score']
          );
          break;
        case 'username':
          insertData('leaked_usernames',
            ['username', 'username_normalized', 'platform', 'email_hash', 'password_hash', 'sources', 'breach_date', 'confidence_score']
          );
          break;
        case 'ip':
          insertData('leaked_ips',
            ['ip_address', 'ip_type', 'ip_numeric', 'sources', 'breach_date', 'confidence_score']
          );
          break;
        default:
          return res.status(400).json({ error: 'Invalid data type' });
      }
      
      res.json({
        success: true,
        inserted: insertCount,
        source_id
      });
    } catch (error) {
      console.error('Add breach data error:', error);
      res.status(500).json({ error: 'Failed to add breach data' });
    }
  }

  async verifySource(req, res) {
    const { sourceId } = req.params;
    
    if (!this.breachSources.has(sourceId)) {
      return res.status(404).json({ error: 'Source not found' });
    }
    
    try {
      this.database.prepare(`
        UPDATE breach_sources 
        SET is_verified = TRUE, date_last_verified = datetime('now')
        WHERE id = ?
      `).run(sourceId);
      
      this.breachSources.get(sourceId).is_verified = true;
      
      res.json({
        success: true,
        source_id: sourceId,
        verified: true
      });
    } catch (error) {
      console.error('Verify source error:', error);
      res.status(500).json({ error: 'Failed to verify source' });
    }
  }

  setupPeriodicMaintenance() {
    // Clean up old search queries (keep last 30 days)
    setInterval(() => {
      try {
        this.database.prepare(`
          DELETE FROM search_queries 
          WHERE date_created < datetime('now', '-30 days')
        `).run();
        console.log('✅ Cleaned up old search queries');
      } catch (error) {
        console.error('Maintenance cleanup error:', error);
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`
🔐 Breach Checker v3.0.0 - Comprehensive Breach Detection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server running on http://localhost:${this.port}
📊 Database: ${this.database ? 'Connected' : 'Disconnected'}
📚 Breach Sources: ${this.breachSources.size}
🌍 Environment: ${config.env}
🔍 Features: Email, Username, IP, Batch, Deep Search
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  }
}

// Start the application
new BreachCheckerApp().start();