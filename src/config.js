import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT, 10) || 5000,
  host: process.env.HOST || 'localhost',
  
  // Environment
  env: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    path: process.env.DB_PATH || './data/passwords.db',
    backup: process.env.DB_BACKUP || './backups'
  },
  
  // Security settings
  security: {
    rateLimiting: {
      enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100 // limit each IP to 100 requests per windowMs
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: process.env.CORS_CREDENTIALS === 'true'
    }
  },
  
  // API configuration
  api: {
    version: 'v2',
    prefix: '/api',
    timeout: parseInt(process.env.API_TIMEOUT, 10) || 10000, // 10 seconds
    maxPayloadSize: process.env.MAX_PAYLOAD_SIZE || '1mb'
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },
  
  // Feature flags
  features: {
    staticMode: process.env.STATIC_MODE === 'true',
    demoMode: process.env.DEMO_MODE !== 'false',
    statistics: process.env.STATISTICS_ENABLED !== 'false',
    passwordAddition: process.env.PASSWORD_ADDITION_ENABLED === 'true',
    exportData: process.env.EXPORT_DATA_ENABLED === 'true'
  }
};