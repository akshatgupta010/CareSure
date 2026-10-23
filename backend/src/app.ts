import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

import { env } from './config/env.js';
import { mongoose } from './config/db.js';
import { AIClient } from './services/aiClient.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sanitizeNoSql } from './middleware/mongoSanitize.js';
import { AppError } from './utils/errors.js';
import { logger } from './utils/logger.js';

import { authRouter } from './modules/auth/auth.routes.js';
import { claimsRouter } from './modules/claims/claims.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { reviewRouter } from './modules/review/review.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export const app = express();

// ── 0. Health & Readiness (Production probes; bypass rate limiting & auth) ──
app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.status(204).end();
});

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'CareSure API',
    description: 'AI-Assisted Hospital Revenue Assurance and Claim Verification Backend (MongoDB)',
    version: '1.0.0',
    status: 'online',
    database: 'MongoDB',
    endpoints: {
      health: '/health',
      ready: '/ready',
      apiBase: '/api/v1',
    },
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', async (_req: Request, res: Response) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    const aiAvailable = await AIClient.checkHealth();

    if (!isDbConnected) {
      res.status(503).json({
        status: 'unready',
        database: 'disconnected',
      });
      return;
    }

    res.status(200).json({
      status: 'ready',
      database: 'connected (MongoDB)',
      aiService: aiAvailable ? 'connected' : 'offline (fallback enabled)',
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'unready',
      error: err.message,
    });
  }
});

// ── 1. Security Headers ──
app.use(helmet());

// ── 2. CORS (Explicit origin allowlist only) ──
const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new AppError('FORBIDDEN', 403, `CORS origin '${origin}' not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── 3. Cookie & Body Parsing ──
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ── 4. NoSQL Injection Prevention (Strips $ and . from req.body/query/params) ──
app.use(sanitizeNoSql);

// ── 5. Request Correlation ID & Logging ──
app.use((req: Request, res: Response, next) => {
  req.requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/health' && req.path !== '/ready' && req.path !== '/') {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} [${duration}ms]`, {
        requestId: req.requestId,
        ip: req.ip,
        status: res.statusCode,
      });
    }
  });

  next();
});

// ── 6. Rate Limiting ──
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again in a minute.',
    },
  },
});
app.use('/api', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many failed authentication attempts. Please wait 1 minute.',
    },
  },
});
app.use('/api/v1/auth', authLimiter);

// ── 7. Domain Route Mounts (/api/v1) ──
const apiV1 = express.Router();

apiV1.use('/auth', authRouter);
apiV1.use('/claims', claimsRouter);
apiV1.use('/dashboard', dashboardRouter);
apiV1.use('/review-queue', reviewRouter);
apiV1.use('/analytics', analyticsRouter);
apiV1.use('/settings', settingsRouter);
apiV1.use('/audit-logs', auditRouter);
apiV1.use('/users', usersRouter);

app.use('/api/v1', apiV1);

// ── 8. 404 Handler ──
app.use((req: Request, _res: Response, next) => {
  next(new AppError('NOT_FOUND', 404, `Endpoint ${req.method} ${req.originalUrl} not found`));
});

// ── 9. Central Error Handler (Always last) ──
app.use(errorHandler);
