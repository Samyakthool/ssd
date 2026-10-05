import { AuthService, AuthSessionPayload } from '../modules/auth/service.js';
import { generateTotpSecret, generateTotpKeyUri, verifyTotpToken } from '../security/totp.js';
import { loginSchema, mfaSetupSchema } from '../validation/auth.schema.js';
import { hasPermission } from '../security/rbac.js';
import { generateSync } from 'otplib';

let passed = 0;
let failed = 0;

async function assert(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(` ✅ PASS: ${name}`);
    passed++;
  } catch (err: unknown) {
    const error = err as Error;
    console.error(` ❌ FAIL: ${name} ->`, error.message);
    failed++;
  }
}

async function runAuthSuite() {
  console.log('\n==========================================================================');
  console.log(' 🔑  PHASE 4: AUTHENTICATION, RBAC & MFA TEST SUITE');
  console.log('==========================================================================\n');

  // 1. JWT Session Generation & Cryptographic Verification
  await assert('AuthService creates signed session token with embedded jurisdiction and role', () => {
    const payload = {
      userId: 'usr_test_1927',
      email: 'officer.nagpur@samatasainikdal.org',
      fullName: 'Siddharth Meshram',
      role: 'district_official' as const,
      jurisdiction: {
        stateId: 'state_mh',
        stateName: 'Maharashtra',
        districtId: 'dist_nagpur',
        districtName: 'Nagpur',
      },
      mfaAuthenticated: true,
    };

    const token = AuthService.createSessionToken(payload);
    if (!token || typeof token !== 'string') throw new Error('Expected string token');

    const decoded = AuthService.verifySessionToken(token);
    if (decoded.userId !== payload.userId) throw new Error('User ID mismatch in decoded session');
    if (decoded.role !== 'district_official') throw new Error('Role mismatch in decoded session');
    if (decoded.jurisdiction.districtId !== 'dist_nagpur') throw new Error('Jurisdiction mismatch');
    if (!decoded.sessionId || !decoded.sessionId.startsWith('sess_')) throw new Error('Invalid session ID prefix');
  });

  // 2. Tampered / Corrupted Token Rejection
  await assert('AuthService rejects tampered or forged session tokens', () => {
    const validToken = AuthService.createSessionToken({
      userId: 'usr_1',
      email: 'test@ssd.org',
      fullName: 'Test User',
      role: 'chapter_official',
      jurisdiction: {},
      mfaAuthenticated: false,
    });

    const forgedToken = validToken.substring(0, validToken.length - 6) + 'FORGED';
    let rejected = false;
    try {
      AuthService.verifySessionToken(forgedToken);
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error('Forged token was accepted!');
  });

  // 3. Session Rotation & Unique Session ID Generation
  await assert('Successive session generation yields unique session identifiers (Session Rotation)', () => {
    const payload = {
      userId: 'usr_rotate',
      email: 'rotate@ssd.org',
      fullName: 'Rotate Officer',
      role: 'central_admin' as const,
      jurisdiction: {},
      mfaAuthenticated: true,
    };

    const token1 = AuthService.createSessionToken(payload);
    const token2 = AuthService.createSessionToken(payload);

    const dec1 = AuthService.verifySessionToken(token1);
    const dec2 = AuthService.verifySessionToken(token2);

    if (dec1.sessionId === dec2.sessionId) {
      throw new Error('Expected different session IDs for session rotation');
    }
  });

  // 4. TOTP MFA Challenge & Verification Flow
  await assert('TOTP MFA generates Base32 secret and verifies live time-step tokens', () => {
    const secret = generateTotpSecret();
    const uri = generateTotpKeyUri('admin@ssd.org', secret);

    if (!uri.includes('secret=' + secret)) throw new Error('Secret not encoded in key URI');

    // Generate live token using otplib
    const token = generateSync({ secret });
    const isValid = verifyTotpToken(token, secret);
    if (!isValid) throw new Error('Valid live TOTP token rejected');

    const isInvalidValid = verifyTotpToken('000000', secret);
    if (isInvalidValid) throw new Error('Bogus TOTP token accepted');
  });

  // 5. Input Schema Validations
  await assert('Login validation schema enforces email validity and minimum password length', () => {
    const shortPass = { email: 'admin@ssd.org', password: '123' };
    const res = loginSchema.safeParse(shortPass);
    if (res.success) throw new Error('Expected validation failure for short password');

    const invalidEmail = { email: 'not-an-email', password: 'StrongPassword123' };
    const emailRes = loginSchema.safeParse(invalidEmail);
    if (emailRes.success) throw new Error('Expected validation failure for invalid email');

    const validLogin = { email: 'admin@samatasainikdal.org', password: 'StrongPassword123', totpToken: '123456' };
    const validRes = loginSchema.safeParse(validLogin);
    if (!validRes.success) throw new Error('Expected valid login input to pass validation');
  });

  await assert('MFA setup schema requires exact 6-digit TOTP token', () => {
    const badToken = { totpToken: '1234' };
    const res = mfaSetupSchema.safeParse(badToken);
    if (res.success) throw new Error('Expected validation failure for 4-digit token');

    const goodToken = { totpToken: '654321' };
    const goodRes = mfaSetupSchema.safeParse(goodToken);
    if (!goodRes.success) throw new Error('Expected 6-digit token to pass validation');
  });

  // 6. RBAC Guard Verification for Privileged Operations
  await assert('Privileged operations are restricted to authorized roles', () => {
    // Final commissioning only allowed for central/super admin
    if (!hasPermission('super_admin', 'membership.final_approve')) throw new Error('Super admin must have final approval');
    if (!hasPermission('central_admin', 'membership.final_approve')) throw new Error('Central admin must have final approval');
    if (hasPermission('state_official', 'membership.final_approve')) throw new Error('State official must not have final approval');
    if (hasPermission('district_official', 'membership.final_approve')) throw new Error('District official must not have final approval');

    // Refund only allowed for finance admin & super admin
    if (!hasPermission('finance_admin', 'finance.refund')) throw new Error('Finance admin must have refund permission');
    if (hasPermission('media_admin', 'finance.refund')) throw new Error('Media admin must not have refund permission');
  });

  console.log('\n==========================================================================');
  console.log(` 🏁 AUTH & MFA TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthSuite();
