import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';
import { User } from '../models/User.js';

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 401, 'Authentication token missing or invalid'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.userId).select('id email name role team lockedUntil');

    if (!user) {
      return next(new AppError('UNAUTHORIZED', 401, 'User account no longer exists'));
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return next(
        new AppError(
          'ACCOUNT_LOCKED',
          423,
          `Account is temporarily locked. Try again in ${waitMinutes} minutes.`
        )
      );
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role as 'reviewer' | 'admin',
      team: user.team,
    };

    next();
  } catch (err) {
    next(err);
  }
}
