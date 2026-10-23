import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

export function roleGuard(...allowedRoles: Array<'reviewer' | 'admin'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          'FORBIDDEN',
          403,
          `Access forbidden: requires one of the following roles: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
}
