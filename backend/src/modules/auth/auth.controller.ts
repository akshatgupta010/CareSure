import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { env } from '../../config/env.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

function getCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'strict' : 'lax') as 'strict' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken, user } = await AuthService.login(email, password);

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

      res.status(200).json({
        success: true,
        data: {
          accessToken,
          user,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];
      const { accessToken, refreshToken } = await AuthService.refresh(incomingToken);

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

      res.status(200).json({
        success: true,
        data: {
          accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];
      const userId = req.user?.id;

      await AuthService.logout(incomingToken, userId);

      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: (env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
        path: '/',
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: req.user,
      });
    } catch (err) {
      next(err);
    }
  }
}
