import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'reviewer' | 'admin';
  team: string;
}

export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(payload: TokenPayload & { familyId: string }): string {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('TOKEN_EXPIRED', 401, 'Access token has expired');
    }
    throw new AppError('TOKEN_INVALID', 401, 'Invalid access token');
  }
}

export function verifyRefreshToken(token: string): TokenPayload & { familyId: string } {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload & { familyId: string };
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('REFRESH_TOKEN_INVALID', 401, 'Refresh token has expired');
    }
    throw new AppError('REFRESH_TOKEN_INVALID', 401, 'Invalid refresh token');
  }
}
