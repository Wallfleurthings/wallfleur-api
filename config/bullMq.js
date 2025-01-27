const Redis = require('ioredis');

const connection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',    // Default to local Redis for development
  port: process.env.REDIS_PORT || 6379,            // Default to port 6379
  password: process.env.REDIS_PASSWORD || null,    // Add password for AWS Redis if needed
  db: process.env.REDIS_DB || 0,                   // Optional, if you are using specific Redis DB
  tls: process.env.REDIS_USE_TLS === 'true' ? {} : undefined,  // Use TLS if AWS Redis requires it
  maxRetriesPerRequest: null, // Ensure this is set to null
});

module.exports = { connection };
