/**
 * database.js — MongoDB Connection Configuration
 *
 * Responsibility:
 *   Manages the connection lifecycle to MongoDB using Mongoose.
 *   - Reads the MONGODB_URI from environment variables (falls back to localhost).
 *   - Creates required TTL (Time-To-Live) indexes on startup so old audit logs
 *     and alert cooldowns are automatically deleted by MongoDB.
 *   - Exports connectDB() and disconnectDB() for use in app.js.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * connectDB
 * Establishes a connection to the MongoDB database.
 * Called once on server startup. Crashes the process if connection fails.
 */
const connectDB = async () => {
  try {
    // Use Atlas URI from .env, or fall back to local MongoDB instance
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistic18';

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,       // Use new URL parser (avoids deprecation warning)
      useUnifiedTopology: true,    // Use new server discovery engine
      serverSelectionTimeoutMS: 5000, // Fail fast if DB is unreachable (5 seconds)
    });

    console.log('✓ MongoDB connected successfully');

    // Set up TTL indexes after connection is established
    await createIndexes();

    return mongoose.connection;
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1); // Stop the server — no point running without a database
  }
};

/**
 * createIndexes
 * Creates TTL (Time-To-Live) indexes that make MongoDB automatically
 * delete documents after a set period, keeping the database lean.
 *
 * - audit_logs: deleted after 90 days (7,776,000 seconds)
 * - alert_cooldowns: deleted when cooldownExpiresAt is reached
 */
const createIndexes = async () => {
  try {
    // TTL index: audit log entries auto-expire after 90 days
    await mongoose.connection.db
      .collection('audit_logs')
      .createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

    // TTL index: alert cooldown records auto-expire at their cooldownExpiresAt timestamp
    await mongoose.connection.db
      .collection('alert_cooldowns')
      .createIndex({ cooldownExpiresAt: 1 }, { expireAfterSeconds: 0 });

    console.log('✓ Database indexes created');
  } catch (error) {
    // Indexes likely already exist — safe to continue
    console.warn('⚠ Index creation warning (may already exist):', error.message);
  }
};

/**
 * disconnectDB
 * Gracefully closes the MongoDB connection.
 * Called during graceful shutdown (SIGTERM/SIGINT signals).
 */
const disconnectDB = async () => {
  await mongoose.disconnect();
  console.log('✓ MongoDB disconnected');
};

export { connectDB, disconnectDB };
