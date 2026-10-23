import { Request, Response, NextFunction } from 'express';

/**
 * In-place NoSQL injection sanitizer compatible with Express 5 (where req.query is read-only).
 * Recursively strips keys starting with '$' or containing '.' from req.body, req.params, and req.query.
 */
function sanitizeInPlace(target: any): void {
  if (!target || typeof target !== 'object') return;

  for (const key of Object.keys(target)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
    } else if (typeof target[key] === 'object' && target[key] !== null) {
      sanitizeInPlace(target[key]);
    }
  }
}

export function sanitizeNoSql(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) sanitizeInPlace(req.body);
  if (req.params) sanitizeInPlace(req.params);
  if (req.query) sanitizeInPlace(req.query);
  next();
}
