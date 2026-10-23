import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

interface ValidationSchema {
  body?: ZodType<any>;
  query?: ZodType<any>;
  params?: ZodType<any>;
}

export function validate(schema: ValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const fields: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const path = issue.path.join('.') || 'root';
          if (!fields[path]) {
            fields[path] = [];
          }
          fields[path].push(issue.message);
        }
        return next(new AppError('VALIDATION_ERROR', 400, 'Validation failed', fields));
      }
      next(err);
    }
  };
}
