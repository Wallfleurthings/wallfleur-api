const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Ensure the logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Check if the environment is production
const isProduction = process.env.NODE_ENV === 'production';

// Create the logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple() // Simple log format (can be replaced with more complex formats)
  ),
  transports: [
    // Transport for error logs (always active)
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error', // Only log errors to this file
    }),

    // Transport for combined logs (only in non-production)
    isProduction ? null : new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      level: 'info', // Log info level and higher to this file
    }),

    // Transport for console logs (always active)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Colorize console output for better readability
        winston.format.simple(),   // Simple format
      ),
    }),
  ].filter(Boolean), // Removes any `null` value from the array, which helps in production
});

module.exports = logger;
