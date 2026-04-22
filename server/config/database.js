/**
 * MongoDB Atlas Connection Configuration
 * Uses Mongoose ODM with connection pooling and retry logic
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGODB_OPTIONS = {
  maxPoolSize: 10,        // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');

  try {
    await mongoose.connect(uri, MONGODB_OPTIONS);
    logger.info('✅ MongoDB Atlas connected successfully');

    mongoose.connection.on('error', err => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (err) {
    logger.error('MongoDB connection failed:', err.message);
    throw err;
  }
}

module.exports = connectDB;
