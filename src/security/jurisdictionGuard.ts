import { NextRequest } from 'next/server';
import { AuthService, AuthSessionPayload } from '@/modules/auth/service';
import { validateJurisdictionAccess } from '@/security/jurisdiction';
import { hasPermission, Permission } from '@/security/rbac';
import { AppError } from '@/lib/errors';
import { JurisdictionScope, SystemRole } from '@/types';
import { query } from '@/db/postgres';

export interface AuthenticatedRequestContext {
  session: AuthSessionPayload;
  requestId: string;
}

/**
 * Extracts and verifies the authenticated official from request cookies or Authorization header
 */
export function authenticateRequest(req: NextRequest): AuthSessionPayload {
  const cookieToken = req.cookies.get('ssd_session')?.value;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const token = cookieToken || bearerToken;

  if (!token) {
    throw new AppError('Authentication session required for this operation', 'UNAUTHORIZED', 401);
  }

  return AuthService.verifySessionToken(token);
}

/**
 * Enforces that the authenticated user possesses the required permission
 */
export function requirePermission(session: AuthSessionPayload, permission: Permission): void {
  if (!hasPermission(session.role, permission)) {
    throw new AppError(
      `Access denied: Role '${session.role}' lacks permission '${permission}'`,
      'FORBIDDEN_PERMISSION',
      403
    );
  }
}

/**
 * Enforces multi-tier jurisdiction scoping between the official and the target resource
 */
export async function enforceJurisdictionGuard(
  session: AuthSessionPayload,
  resourceJurisdiction: JurisdictionScope,
  req?: NextRequest
): Promise<void> {
  const evaluation = validateJurisdictionAccess(
    session.role,
    session.jurisdiction,
    resourceJurisdiction
  );

  if (!evaluation.isAuthorized) {
    // Record security violation event
    const ip = req ? req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1' : null;
    await query(
      `INSERT INTO security_events (event_type, severity, actor_identifier, ip_address, endpoint, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'UNAUTHORIZED_JURISDICTION_ACCESS',
        'HIGH',
        session.email,
        ip,
        req?.nextUrl.pathname || 'unknown',
        JSON.stringify({
          role: session.role,
          assignedJurisdiction: session.jurisdiction,
          targetJurisdiction: resourceJurisdiction,
          reason: evaluation.reason,
        }),
      ]
    );

    throw new AppError(
      evaluation.reason || 'You do not have administrative jurisdiction over this territorial resource',
      'FORBIDDEN_JURISDICTION',
      403
    );
  }
}
