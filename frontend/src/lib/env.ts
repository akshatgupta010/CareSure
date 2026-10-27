import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:5000'),
  VITE_APP_NAME: z.string().default('CareSure'),
});

export const env = envSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME || 'CareSure',
});
