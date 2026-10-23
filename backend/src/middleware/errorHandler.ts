import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    return _next(err);
  }

  const statusCode = err.statusCode || (err instanceof AppError ? err.statusCode : 500);
  const code = err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST');
  const message = err.message || 'An unexpected internal error occurred';

  // Log error (stack trace in dev, error info in prod)
  if (statusCode >= 500) {
    logger.error('Unhandled server error', {
      requestId: req.requestId,
      code,
      message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn('Client request error', {
      requestId: req.requestId,
      code,
      message,
      statusCode,
      url: req.originalUrl,
    });
  }

  const responseBody: Record<string, any> = {
    success: false,
    error: {
      code,
      message: statusCode >= 500 && env.NODE_ENV === 'production'
        ? 'Internal server error'
        : message,
    },
  };

  if (err.fields && Object.keys(err.fields).length > 0) {
    responseBody.error.fields = err.fields;
  }

  res.status(statusCode).json(responseBody);
}
