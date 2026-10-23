import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Robustly find .env file whether running from root or backend directory
const baseDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(baseDir, '../../.env'),
  path.resolve(baseDir, '../.env'),
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/caresure'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL').default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(10),
  AI_SERVICE_URL: z.string().url('AI_SERVICE_URL must be a valid URL').default('http://localhost:8000'),
  AI_SERVICE_TOKEN: z.string().min(16, 'AI_SERVICE_TOKEN must be at least 16 characters'),
  AI_TIMEOUT_MS: z.coerce.number().default(5000),
  DEMO_USER_PASSWORD: z.string().default('CareSureDemo2026!'),
  LOG_LEVEL: z.string().default('info'),
  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
