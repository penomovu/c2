import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT, 10) || 5000,
  host: process.env.HOST || "localhost",

  // Environment
  env: process.env.NODE_ENV || "development",

  // Database configuration
  database: {
    // Default database path (matches .env.example and legacy scripts).
    // The server will automatically migrate older schemas and can also be pointed
    // at ./data/breachchecker.db via DB_PATH if desired.
    path: process.env.DB_PATH || "./data/passwords.db",
    backup: process.env.DB_BACKUP || "./backups",
  },

  // Security settings
  security: {
    rateLimiting: {
      enabled: process.env.RATE_LIMIT_ENABLED !== "false",
      windowMs:
        parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // limit each IP to 100 requests per windowMs
    },
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      credentials: process.env.CORS_CREDENTIALS === "true",
    },
  },

  // API configuration
  api: {
    version: "v2",
    prefix: "/api",
    timeout: parseInt(process.env.API_TIMEOUT, 10) || 10000, // 10 seconds
    maxPayloadSize: process.env.MAX_PAYLOAD_SIZE || "1mb",
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
    format: process.env.LOG_FORMAT || "combined",
  },

  // Feature flags
  features: {
    staticMode: process.env.STATIC_MODE === "true",
    demoMode: process.env.DEMO_MODE !== "false",
    statistics: process.env.STATISTICS_ENABLED !== "false",
    passwordAddition: process.env.PASSWORD_ADDITION_ENABLED === "true",
    exportData: process.env.EXPORT_DATA_ENABLED === "true",
    multiSearch: process.env.MULTI_SEARCH_ENABLED === "true",
    emailSearch: process.env.EMAIL_SEARCH_ENABLED === "true",
    usernameSearch: process.env.USERNAME_SEARCH_ENABLED === "true",
    ipSearch: process.env.IP_SEARCH_ENABLED === "true",
    deepSearch: process.env.DEEP_SEARCH_ENABLED === "true",
    batchSearch: process.env.BATCH_SEARCH_ENABLED === "true",
    breachTimeline: process.env.BREACH_TIMELINE_ENABLED === "true",
  },

  // Search configuration
  search: {
    maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE, 10) || 100,
    defaultTimeout: parseInt(process.env.SEARCH_TIMEOUT, 10) || 30000, // 30 seconds
    maxResultsPerQuery: parseInt(process.env.MAX_RESULTS_PER_QUERY, 10) || 1000,
    enableFuzzySearch: process.env.FUZZY_SEARCH_ENABLED === "true",
    maxSearchDepth: parseInt(process.env.MAX_SEARCH_DEPTH, 10) || 10,
  },

  // Database sources configuration
  databases: {
    autoImport: process.env.AUTO_IMPORT_DATABASES === "true",
    validation: process.env.DATABASE_VALIDATION_ENABLED !== "false",
    deduplication: process.env.DATABASE_DEDUPLICATION_ENABLED !== "false",
    maxConcurrentImports: parseInt(process.env.MAX_CONCURRENT_IMPORTS, 10) || 5,
    supportedFormats: ["csv", "json", "txt", "sql"],
    sourceUrls: {
      // Major breach databases (examples - would need real sources)
      rockyou2021: process.env.ROCKYOU_2021_URL || "",
      Collection1: process.env.COLLECTION1_URL || "",
      Collection2_5: process.env.COLLECTION2_5_URL || "",
      breachCompilation: process.env.BREACH_COMPILATION_URL || "",
      linkedin: process.env.LINKEDIN_BREACH_URL || "",
      dropbox: process.env.DROPBOX_BREACH_URL || "",
      adobe: process.env.ADOBE_BREACH_URL || "",
      yahoo: process.env.YAHOO_BREACH_URL || "",
      myspace: process.env.MYSPACE_BREACH_URL || "",
      lastfm: process.env.LASTFM_BREACH_URL || "",
      AshleyMadison: process.env.ASHLEY_MADISON_URL || "",
    },
  },
};
