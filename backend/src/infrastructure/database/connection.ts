import mongoose from 'mongoose';
import { logger } from '../logging/logger.js';

const POOL_SIZE = parseInt(process.env.MONGO_POOL_SIZE || '100', 10);
const CONNECT_TIMEOUT_MS = 10000;
const SOCKET_TIMEOUT_MS = 45000;

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/clicker';

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected, attempting reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  try {
    await mongoose.connect(uri, {
      maxPoolSize: POOL_SIZE,
      minPoolSize: 10,
      connectTimeoutMS: CONNECT_TIMEOUT_MS,
      socketTimeoutMS: SOCKET_TIMEOUT_MS,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      retryReads: true,
    });
    logger.info('MongoDB connected', { poolSize: POOL_SIZE });
  } catch (error) {
    logger.error('MongoDB initial connection error', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
