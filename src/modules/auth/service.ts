import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '@/db/postgres';
import { hashPassword, verifyPassword } from '@/security/argon';
import { generateTotpSecret, generateTotpKeyUri, verifyTotpToken } from '@/security/totp';
import { AppError } from '@/lib/errors';
import { SystemRole, User, UserJurisdiction, JurisdictionScope } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'ssd_prod_secret_key_change_in_production_1927_2027';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthSessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: SystemRole;
  jurisdiction: JurisdictionScope;
  sessionId: string;
  mfaAuthenticated: boolean;
  iat?: number;
  exp?: number;
}

export interface LoginResult {
  requiresMfa?: boolean;
  user?: Omit<User, 'mfaSecret'>;
  token?: string;
  jurisdiction?: JurisdictionScope;
}

export class AuthService {
  /**
   * Generates a signed JWT session token
   */
  static createSessionToken(payload: Omit<AuthSessionPayload, 'sessionId' | 'iat' | 'exp'>): string {
    const sessionId = `sess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    return jwt.sign(
      {
        ...payload,
        sessionId,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verifies and decodes a session token
   */
  static verifySessionToken(token: string): AuthSessionPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthSessionPayload;
      return decoded;
    } catch {
      throw new AppError('Invalid or expired authentication session', 'UNAUTHORIZED', 401);
    }
  }

  /**
   * Authenticates an administrative official using Argon2id and optional TOTP MFA
   */
  static async login(
    email: string,
    plainPassword: string,
    totpToken?: string,
    metadata: { ip?: string; userAgent?: string; requestId?: string } = {}
  ): Promise<LoginResult> {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Fetch user by email
    const userRes = await query<User & { password_hash: string; mfa_secret?: string; mfa_enabled?: boolean }>(
      `SELECT id, email, password_hash, full_name as "fullName", phone, role_id as "roleId",
              department, status, mfa_enabled as "mfaEnabled", mfa_secret as "mfaSecret",
              last_login as "lastLogin", created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [normalizedEmail]
    );

    if (userRes.rowCount === 0) {
      // Record failed security event
      await query(
        `INSERT INTO security_events (event_type, severity, actor_identifier, ip_address, endpoint, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['LOGIN_FAILED', 'MEDIUM', normalizedEmail, metadata.ip || null, '/api/auth/login', JSON.stringify({ reason: 'USER_NOT_FOUND' })]
      );
      throw new AppError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    const user = userRes.rows[0];

    // 2. Status verification
    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is suspended or inactive. Please contact Central Command.', 'ACCOUNT_INACTIVE', 403);
    }

    // 3. Argon2id password verification
    const isPasswordValid = await verifyPassword(user.password_hash, plainPassword);
    if (!isPasswordValid) {
      await query(
        `INSERT INTO security_events (event_type, severity, actor_identifier, ip_address, endpoint, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['LOGIN_FAILED', 'HIGH', normalizedEmail, metadata.ip || null, '/api/auth/login', JSON.stringify({ reason: 'INVALID_PASSWORD' })]
      );
      throw new AppError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    // 4. TOTP MFA enforcement for privileged accounts
    if (user.mfaEnabled && user.mfaSecret) {
      if (!totpToken) {
        return { requiresMfa: true };
      }

      const isTotpValid = verifyTotpToken(totpToken, user.mfaSecret);
      if (!isTotpValid) {
        await query(
          `INSERT INTO security_events (event_type, severity, actor_identifier, ip_address, endpoint, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          ['MFA_FAILED', 'HIGH', normalizedEmail, metadata.ip || null, '/api/auth/login', JSON.stringify({ reason: 'INVALID_TOTP' })]
        );
        throw new AppError('Invalid MFA verification code', 'INVALID_MFA_TOKEN', 401);
      }
    }

    // 5. Fetch assigned jurisdiction
    const jurRes = await query<UserJurisdiction & { state_name?: string; district_name?: string }>(
      `SELECT uj.id, uj.user_id as "userId", uj.role_id as "roleId",
              uj.state_id as "stateId", s.name as "stateName",
              uj.region_id as "regionId",
              uj.district_id as "districtId", d.name as "districtName",
              uj.taluka_id as "talukaId",
              uj.chapter_id as "chapterId"
       FROM user_jurisdictions uj
       LEFT JOIN states s ON uj.state_id = s.id
       LEFT JOIN districts d ON uj.district_id = d.id
       WHERE uj.user_id = $1 AND uj.is_primary = true
       LIMIT 1`,
      [user.id]
    );

    const jurisdiction: JurisdictionScope = jurRes.rows[0] || {
      stateId: null,
      districtId: null,
    };

    // 6. Generate signed session token
    const token = this.createSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.roleId,
      jurisdiction,
      mfaAuthenticated: !!user.mfaEnabled,
    });

    // 7. Update last_login
    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // 8. Record audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, jurisdiction_summary, ip_address, user_agent, request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        user.id,
        user.fullName,
        user.roleId,
        'LOGIN_SUCCESS',
        'users',
        user.id,
        `${jurisdiction.stateName || 'National'} / ${jurisdiction.districtName || 'All'}`,
        metadata.ip || null,
        metadata.userAgent || null,
        metadata.requestId || `req_${Date.now()}`,
      ]
    );

    const { mfaSecret, ...safeUser } = user;

    return {
      requiresMfa: false,
      user: safeUser,
      token,
      jurisdiction,
    };
  }

  /**
   * Initializes TOTP MFA setup for an official
   */
  static async setupMfa(userId: string): Promise<{ secret: string; keyUri: string }> {
    const userRes = await query<{ email: string }>('SELECT email FROM users WHERE id = $1', [userId]);
    if (userRes.rowCount === 0) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }
    const secret = generateTotpSecret();
    const keyUri = generateTotpKeyUri(userRes.rows[0].email, secret);
    return { secret, keyUri };
  }

  /**
   * Verifies TOTP token and enables MFA for the user
   */
  static async verifyAndEnableMfa(userId: string, token: string, secret: string): Promise<boolean> {
    const isValid = verifyTotpToken(token, secret);
    if (!isValid) {
      throw new AppError('Invalid verification token. MFA was not enabled.', 'INVALID_TOTP', 400);
    }

    await query(
      'UPDATE users SET mfa_enabled = true, mfa_secret = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [secret, userId]
    );

    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, request_id)
       VALUES ($1, 'MFA_ENABLED', 'users', $1, $2)`,
      [userId, `mfa_${Date.now()}`]
    );

    return true;
  }
}
