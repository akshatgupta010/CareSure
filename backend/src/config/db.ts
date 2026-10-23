import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let mongodInstance: any = null;

export async function connectDB(customUri?: string): Promise<string> {
  const targetUri = customUri || env.MONGODB_URI;

  try {
    if (targetUri === 'memory') {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memUri = mongodInstance.getUri();
      await mongoose.connect(memUri);
      logger.info('Connected to In-Memory MongoDB instance');
      return memUri;
    }

    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 3000,
    });

    const sanitizedUri = targetUri.replace(/:([^:@]{4})[^:@]*@/, ':****@');
    logger.info(`Connected to MongoDB successfully at ${sanitizedUri}`);
    return targetUri;
  } catch (error: any) {
    logger.warn(`Could not connect to MongoDB at ${targetUri} (${error.message}). Starting In-Memory MongoDB fallback...`);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memUri = mongodInstance.getUri();
      await mongoose.connect(memUri);
      logger.info('Connected to In-Memory MongoDB fallback successfully');
      return memUri;
    } catch (fallbackError: any) {
      logger.error('Failed to initialize MongoDB or memory fallback:', fallbackError);
      process.exit(1);
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
  logger.info('MongoDB disconnected');
}

export { mongoose };
