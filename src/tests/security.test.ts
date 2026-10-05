import { hashPassword, verifyPassword } from '../security/argon.js';
import { generateTotpSecret, generateTotpKeyUri, verifyTotpToken } from '../security/totp.js';
import { hasPermission, ROLE_PERMISSIONS } from '../security/rbac.js';
import { validateJurisdictionAccess } from '../security/jurisdiction.js';
import { membershipApplicationSchema } from '../validation/membership.schema.js';
import { createDonationOrderSchema } from '../validation/finance.schema.js';
import { AppError, formatErrorResponse } from '../lib/errors.js';

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

async function runSecuritySuite() {
  console.log('\n==========================================================================');
  console.log(' 🛡️  PHASE 2: TYPESCRIPT SECURITY & JURISDICTION SUITE');
  console.log('==========================================================================\n');

  // 1. Argon2id Password Hashing Tests
  await assert('Argon2id hashes password with OWASP parameters and verifies correctly', async () => {
    const plain = 'StrongSSDPass#2026';
    const hash = await hashPassword(plain);
    if (!hash.startsWith('$argon2id$')) throw new Error('Expected argon2id prefix');
    const valid = await verifyPassword(hash, plain);
    if (!valid) throw new Error('Password verification failed for valid password');
    const invalid = await verifyPassword(hash, 'WrongPassword');
    if (invalid) throw new Error('Password verification returned true for invalid password');
  });

  // 2. TOTP MFA Tests
  await assert('TOTP generates Base32 secret and valid otpauth URI', () => {
    const secret = generateTotpSecret();
    if (!secret || secret.length < 16) throw new Error('Invalid secret generated');
    const uri = generateTotpKeyUri('commander@ssd.org', secret);
    if (!uri.startsWith('otpauth://totp/')) throw new Error('Invalid otpauth URI prefix');
    if (!uri.includes('Samata%20Sainik%20Dal')) throw new Error('Expected issuer in URI');
  });

  // 3. RBAC Permission Isolation Tests
  await assert('RBAC isolates permissions accurately across administrative roles', () => {
    // District Official
    if (!hasPermission('district_official', 'membership.recommend')) throw new Error('District Official should have membership.recommend');
    if (hasPermission('district_official', 'membership.final_approve')) throw new Error('District Official must NOT have membership.final_approve');
    if (hasPermission('district_official', 'finance.manage')) throw new Error('District Official must NOT have finance.manage');

    // Finance Admin
    if (!hasPermission('finance_admin', 'finance.manage')) throw new Error('Finance Admin should have finance.manage');
    if (hasPermission('finance_admin', 'membership.recommend')) throw new Error('Finance Admin must NOT have membership.recommend');

    // Super Admin
    if (!hasPermission('super_admin', 'membership.final_approve')) throw new Error('Super Admin must have membership.final_approve');
    if (!hasPermission('super_admin', 'admin.role.manage')) throw new Error('Super Admin must have admin.role.manage');
  });

  // 4. Multi-Tier Jurisdiction Authorization Matrix Tests
  await assert('District Official access is strictly confined to assigned district', () => {
    const nagpurOfficial = { districtId: 'dist_nagpur', districtName: 'Nagpur', stateId: 'state_mh', stateName: 'Maharashtra' };
    const nagpurApp = { districtId: 'dist_nagpur', districtName: 'Nagpur', stateId: 'state_mh', stateName: 'Maharashtra' };
    const puneApp = { districtId: 'dist_pune', districtName: 'Pune', stateId: 'state_mh', stateName: 'Maharashtra' };

    // Own District -> ALLOW
    const allowRes = validateJurisdictionAccess('district_official', nagpurOfficial, nagpurApp);
    if (!allowRes.isAuthorized) throw new Error(`Expected ALLOW for same district, got: ${allowRes.reason}`);

    // Other District -> DENY
    const denyRes = validateJurisdictionAccess('district_official', nagpurOfficial, puneApp);
    if (denyRes.isAuthorized) throw new Error('Expected DENY for different district');
  });

  await assert('State Official has jurisdiction over all districts in state, but rejected across states', () => {
    const mhOfficial = { stateId: 'state_mh', stateName: 'Maharashtra' };
    const nagpurApp = { districtId: 'dist_nagpur', districtName: 'Nagpur', stateId: 'state_mh', stateName: 'Maharashtra' };
    const ahmedabadApp = { districtId: 'dist_ahmedabad', districtName: 'Ahmedabad', stateId: 'state_gj', stateName: 'Gujarat' };

    const stateAllow = validateJurisdictionAccess('state_official', mhOfficial, nagpurApp);
    if (!stateAllow.isAuthorized) throw new Error('Expected ALLOW for in-state application');

    const stateDeny = validateJurisdictionAccess('state_official', mhOfficial, ahmedabadApp);
    if (stateDeny.isAuthorized) throw new Error('Expected DENY for out-of-state application');
  });

  await assert('Super Admin has unrestricted national jurisdiction', () => {
    const nationalAdmin = {};
    const anyApp = { districtId: 'dist_patna', districtName: 'Patna', stateId: 'state_br', stateName: 'Bihar' };
    const res = validateJurisdictionAccess('super_admin', nationalAdmin, anyApp);
    if (!res.isAuthorized) throw new Error('Super admin must have national jurisdiction');
  });

  // 5. Zod Schema Input Validation Tests
  await assert('Membership Zod schema enforces valid Indian mobile and solemn pledge', () => {
    const invalidMobile = {
      fullName: 'Siddharth Kamble',
      mobile: '12345', // invalid
      email: 'siddharth@example.com',
      stateId: 'mh',
      stateName: 'Maharashtra',
      districtId: 'ngp',
      districtName: 'Nagpur',
      wingId: 'cadet',
      wingName: 'Cadet Corps',
      solemnPledgeAccepted: true,
    };
    const res = membershipApplicationSchema.safeParse(invalidMobile);
    if (res.success) throw new Error('Expected validation failure for invalid mobile');

    const unacceptedPledge = {
      fullName: 'Siddharth Kamble',
      mobile: '9876543210',
      email: 'siddharth@example.com',
      stateId: 'mh',
      stateName: 'Maharashtra',
      districtId: 'ngp',
      districtName: 'Nagpur',
      wingId: 'cadet',
      wingName: 'Cadet Corps',
      solemnPledgeAccepted: false,
    };
    const pledgeRes = membershipApplicationSchema.safeParse(unacceptedPledge);
    if (pledgeRes.success) throw new Error('Expected validation failure for unaccepted pledge');
  });

  await assert('Donation Zod schema validates amount limits and PAN formatting', () => {
    const invalidPan = {
      amount: 500,
      currency: 'INR' as const,
      donorName: 'Dr. Anand Teltumbde',
      email: 'anand@example.com',
      pan: 'INVALID_PAN',
      cause: 'Education Fund',
    };
    const panRes = createDonationOrderSchema.safeParse(invalidPan);
    if (panRes.success) throw new Error('Expected validation failure for malformed PAN');

    const validDonation = {
      amount: 1000,
      currency: 'INR' as const,
      donorName: 'Dr. Anand Teltumbde',
      email: 'anand@example.com',
      pan: 'ABCDE1234F',
      cause: 'Education Fund',
    };
    const validRes = createDonationOrderSchema.safeParse(validDonation);
    if (!validRes.success) throw new Error(`Validation failed for valid donation: ${JSON.stringify(validRes.error)}`);
  });

  // 6. Centralized Error Handling & Request ID Correlation Tests
  await assert('Centralized error formatting attaches correlation request ID and masks sensitive internals', () => {
    const appErr = new AppError('Unauthorized access to district application', 'FORBIDDEN_JURISDICTION', 403);
    const formatted = formatErrorResponse(appErr, 'req_test_1234');
    if (formatted.statusCode !== 403) throw new Error('Expected 403 status code');
    if (formatted.body.error.code !== 'FORBIDDEN_JURISDICTION') throw new Error('Expected error code match');
    if (formatted.body.error.requestId !== 'req_test_1234') throw new Error('Expected request ID to be preserved');

    // Unhandled exception masking
    const unhandled = new Error('FATAL: Database connection postgres://user:secret@db failed');
    const masked = formatErrorResponse(unhandled, 'req_test_5678');
    if (masked.statusCode !== 500) throw new Error('Expected 500 for unhandled error');
    if (masked.body.error.message.includes('postgres://')) throw new Error('Database connection string leaked in error response!');
    if (masked.body.error.code !== 'INTERNAL_SERVER_ERROR') throw new Error('Expected generic internal server error code');
  });

  console.log('\n==========================================================================');
  console.log(` 🏁 SECURITY TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecuritySuite();
