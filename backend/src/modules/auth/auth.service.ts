import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../../models/User.js';
import { RefreshToken } from '../../models/RefreshToken.js';
import { AppError } from '../../utils/errors.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { logAudit } from '../../services/audit.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  static async login(email: string, passwordPlain: string) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      await bcrypt.compare(passwordPlain, '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr');
      throw new AppError('UNAUTHORIZED', 401, 'Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      throw new AppError(
        'ACCOUNT_LOCKED',
        423,
        `Account locked due to 5 failed attempts. Please try again in ${remainingMinutes} minutes.`
      );
    }

    const passwordMatch = await bcrypt.compare(passwordPlain, user.passwordHash);

    if (!passwordMatch) {
      const updatedFailed = user.failedLogins + 1;
      const shouldLock = updatedFailed >= 5;
      const lockUntil = shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null;

      user.failedLogins = shouldLock ? 0 : updatedFailed;
      user.lockedUntil = lockUntil;
      await user.save();

      if (shouldLock) {
        await logAudit({
          actorId: user._id.toString(),
          actorEmail: user.email,
          action: 'auth.account_locked',
          entity: 'User',
          entityId: user._id.toString(),
          meta: { reason: '5 failed login attempts', lockedMinutes: 15 },
        });

        throw new AppError(
          'ACCOUNT_LOCKED',
          423,
          'Account locked due to 5 consecutive failed attempts. Please wait 15 minutes.'
        );
      }

      throw new AppError('UNAUTHORIZED', 401, 'Invalid email or password');
    }

    if (user.failedLogins > 0 || user.lockedUntil) {
      user.failedLogins = 0;
      user.lockedUntil = null;
      await user.save();
    }

    const familyId = crypto.randomUUID();
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      team: user.team,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ ...tokenPayload, familyId });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      userId: user._id,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    await logAudit({
      actorId: user._id.toString(),
      actorEmail: user.email,
      action: 'auth.login',
      entity: 'User',
      entityId: user._id.toString(),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        team: user.team,
      },
    };
  }

  static async register(name: string, email: string, passwordPlain: string, role = 'reviewer', team = 'Claims Team') {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      throw new AppError('CONFLICT', 409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role === 'admin' ? 'admin' : 'reviewer',
      team: team || 'Claims Team',
      passwordHash,
    });

    const familyId = crypto.randomUUID();
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      team: user.team,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ ...tokenPayload, familyId });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      userId: user._id,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    await logAudit({
      actorId: user._id.toString(),
      actorEmail: user.email,
      action: 'auth.register',
      entity: 'User',
      entityId: user._id.toString(),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        team: user.team,
      },
    };
  }

  static async refresh(incomingToken: string) {
    if (!incomingToken) {
      throw new AppError('UNAUTHORIZED', 401, 'Refresh token required');
    }

    const payload = verifyRefreshToken(incomingToken);
    const incomingHash = hashToken(incomingToken);

    const storedToken = await RefreshToken.findOne({
      tokenHash: incomingHash,
    }).populate<{ userId: any }>('userId');

    // Breach detection: if token is already revoked, invalidate entire family!
    if (storedToken && storedToken.revokedAt !== null) {
      await RefreshToken.updateMany(
        { familyId: payload.familyId },
        { revokedAt: new Date() }
      );

      await logAudit({
        actorId: payload.userId,
        actorEmail: payload.email,
        action: 'auth.refresh_breach_detected',
        entity: 'RefreshToken',
        meta: { familyId: payload.familyId },
      });

      throw new AppError(
        'REFRESH_TOKEN_INVALID',
        401,
        'Compromised refresh token detected. All sessions in this family revoked.'
      );
    }

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError('REFRESH_TOKEN_INVALID', 401, 'Invalid or expired refresh token');
    }

    storedToken.revokedAt = new Date();
    await storedToken.save();

    const user = storedToken.userId;
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      team: user.team,
    };

    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken({ ...tokenPayload, familyId: payload.familyId });

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      userId: user._id,
      familyId: payload.familyId,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: newExpiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async logout(incomingToken?: string, userId?: string) {
    if (incomingToken) {
      const incomingHash = hashToken(incomingToken);
      await RefreshToken.updateMany(
        { tokenHash: incomingHash, revokedAt: null },
        { revokedAt: new Date() }
      );
    }

    if (userId) {
      await logAudit({
        actorId: userId,
        action: 'auth.logout',
        entity: 'User',
        entityId: userId,
      });
    }
  }
}
