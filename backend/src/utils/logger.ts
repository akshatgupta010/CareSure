import winston from 'winston';
import { env } from '../config/env.js';

// Sensitive keys to redact from logs to protect patient health information (PHI) and secrets
const REDACTED_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'patientname',
  'policynumber',
]);

function redactObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactObject);
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      result[key] = redactObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const redactFormat = winston.format((info) => {
  if (typeof info.message === 'object' && info.message !== null) {
    info.message = redactObject(info.message);
  }
  for (const key of Object.keys(info)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      info[key] = '[REDACTED]';
    } else if (typeof info[key] === 'object' && info[key] !== null && key !== Symbol.for('level') as any) {
      info[key] = redactObject(info[key]);
    }
  }
  return info;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    redactFormat(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, stack, requestId, ...meta }) => {
            const req = requestId ? ` [${requestId}]` : '';
            const logMsg = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
            const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} ${level}${req}: ${logMsg}${stack ? `\n${stack}` : ''}${extra}`;
          })
        )
  ),
  transports: [
    new winston.transports.Console(),
  ],
});
