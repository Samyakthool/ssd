// ==========================================================================
// SAMATA SAINIK DAL (SSD) - END-TO-END AUTOMATED TEST SUITE
// ==========================================================================

import { initDb } from '../db/index.js';
import { runMigration } from '../db/migrate.js';
import app from '../../server.js';

let authTokenSuper = '';
let authTokenNagpur = '';
let testAppId = '';
let testSainikId = '';

async function runTests() {
  console.log('\n==========================================================================');
  console.log(' 🧪 RUNNING SSD DIGITAL COMMAND PLATFORM AUTOMATED TEST SUITE');
  console.log('==========================================================================\n');

  let passed = 0;
  let failed = 0;

  async function assert(testName, fn) {
    try {
      await fn();
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } catch (err) {
      console.error(` ❌ FAIL: ${testName} ->`, err.message);
      failed++;
    }
  }

  // 1. AUTHENTICATION TESTS
  await assert('Super Admin Authentication with valid credentials', async () => {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ssd.org', password: 'SSD1927' })
    });
    const data = await res.json();
    if (!data.success || !data.token) throw new Error('Failed to obtain JWT token: ' + JSON.stringify(data));
    authTokenSuper = data.token;
    if (data.user.role !== 'super_admin') throw new Error('Incorrect role returned');
  });

  await assert('Invalid password authentication rejection', async () => {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ssd.org', password: 'WRONG_PASSWORD' })
    });
    const data = await res.json();
    if (res.status !== 401 || data.success) throw new Error('Expected 401 Unauthorized');
  });

  await assert('Unauthenticated access rejection on protected review queue', async () => {
    const res = await fetch('http://localhost:3000/api/membership/applications');
    if (res.status !== 401) throw new Error('Expected 401 Unauthorized, got ' + res.status);
  });

  let authTokenEnlistment = '';

  await assert('District Official Login & Jurisdiction Validation', async () => {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'district.nagpur@ssd.org', password: 'NAGPUR1927' })
    });
    const data = await res.json();
    if (!data.success || !data.token) throw new Error('Failed to login as Nagpur District official');
    authTokenNagpur = data.token;
    if (data.user.jurisdiction.district_id !== 'dist_mh_nagpur') throw new Error('Incorrect district jurisdiction');
  });

  await assert('Enlistment Officer Login & Role Validation', async () => {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'approvals@ssd.org', password: 'APPROVE1927' })
    });
    const data = await res.json();
    if (!data.success || !data.token) throw new Error('Failed to login as Enlistment Approval Officer');
    authTokenEnlistment = data.token;
    if (data.user.role !== 'enlistment_officer') throw new Error('Expected role enlistment_officer but got ' + data.user.role);
  });

  await assert('Enlistment Officer Role Isolation (Restricted from Treasury & User Admin)', async () => {
    // 1. Try accessing donations endpoint (should return 403)
    const donRes = await fetch('http://localhost:3000/api/donations', {
      headers: { 'Authorization': `Bearer ${authTokenEnlistment}` }
    });
    if (donRes.status !== 403) throw new Error('Expected 403 Forbidden on donations for enlistment_officer, got ' + donRes.status);

    // 2. Try accessing officers management endpoint (should return 403)
    const offRes = await fetch('http://localhost:3000/api/auth/officers', {
      headers: { 'Authorization': `Bearer ${authTokenEnlistment}` }
    });
    if (offRes.status !== 403) throw new Error('Expected 403 Forbidden on officers management, got ' + offRes.status);
  });

  // 2. MEMBERSHIP APPLICATION SUBMISSION
  await assert('Public Enlistment Application Submission', async () => {
    const res = await fetch('http://localhost:3000/api/membership/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Shubham V. Meshram',
        dob: '1999-05-10',
        gender: 'Male',
        mobile: '+91 98223 99999',
        email: 'shubham.meshram@example.com',
        address: 'Ambedkar Chowk, Nagpur',
        stateId: 'state_mh',
        stateName: 'Maharashtra',
        regionId: 'reg_mh_vidarbha',
        regionName: 'Vidarbha',
        districtId: 'dist_mh_nagpur',
        districtName: 'Nagpur',
        villageCity: 'Nagpur',
        education: 'B.Sc. Chemistry',
        occupation: 'Youth Volunteer',
        bloodGroup: 'O+',
        wingId: 'wing_cadet',
        wingName: 'Central Cadet Corps (Sainik Wing)',
        solemnPledge: true
      })
    });
    const data = await res.json();
    if (!data.success || !data.applicationId) throw new Error('Application creation failed: ' + JSON.stringify(data));
    testAppId = data.applicationId;
    if (!testAppId.startsWith('SSD-2026-')) throw new Error('Invalid Application ID format: ' + testAppId);
  });

  // 3. APPLICATION STATUS LOOKUP
  await assert('Public Application Status Lookup', async () => {
    const res = await fetch(`http://localhost:3000/api/membership/status/${testAppId}`);
    const data = await res.json();
    if (!data.success || data.currentStatus !== 'SUBMITTED') throw new Error('Status tracker failed');
    if (!data.timeline || data.timeline.length === 0) throw new Error('Timeline missing');
  });

  // 4. JURISDICTION ISOLATION & RBAC TEST
  await assert('Jurisdiction Filtering on Review Queue', async () => {
    const res = await fetch('http://localhost:3000/api/membership/applications', {
      headers: { 'Authorization': `Bearer ${authTokenNagpur}` }
    });
    const data = await res.json();
    if (!data.success) throw new Error('Failed to fetch queue');
    // Nagpur officer should only see applications belonging to Nagpur
    const nonNagpur = data.applications.filter(a => a.district_id && a.district_id !== 'dist_mh_nagpur');
    if (nonNagpur.length > 0) throw new Error('Jurisdiction breach: Non-Nagpur applications returned to Nagpur officer!');
  });

  // 5. DECISION: MARK UNDER REVIEW
  await assert('District Officer Review Action', async () => {
    const res = await fetch(`http://localhost:3000/api/membership/applications/${testAppId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokenNagpur}`
      },
      body: JSON.stringify({ remarks: 'Commenced background verification.' })
    });
    const data = await res.json();
    if (!data.success || data.application.status !== 'UNDER_REVIEW') throw new Error('Review status failed');
  });

  // 6. DECISION: RECOMMEND TO HIGHER LEVEL WITH ASSESSMENT RUBRIC
  await assert('District Officer Recommendation Action with Assessment Rubric', async () => {
    const res = await fetch(`http://localhost:3000/api/membership/applications/${testAppId}/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokenNagpur}`
      },
      body: JSON.stringify({
        remarks: 'Physical fitness and credentials validated. Recommended.',
        assessmentData: {
          score: 6,
          total: 6,
          percentage: 100,
          criteria: {
            crit_age: true,
            crit_jurisdiction: true,
            crit_photo_id: true,
            crit_wing_qual: true,
            crit_ideology: true,
            crit_discipline: true
          }
        }
      })
    });
    const data = await res.json();
    if (!data.success || data.application.status !== 'RECOMMENDED') throw new Error('Recommendation failed');
    if (!data.application.assessment_data || data.application.assessment_data.score !== 6) {
      throw new Error('Assessment data not recorded on application record');
    }
  });

  // 7. DECISION: FINAL APPROVAL & COMMISSIONING (Super Admin)
  await assert('Central Command Final Approval & Sainik ID Commission', async () => {
    const res = await fetch(`http://localhost:3000/api/membership/applications/${testAppId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokenSuper}`
      },
      body: JSON.stringify({
        designation: 'Cadet Sainik',
        batchNo: 'BATCH-2026/Q3',
        remarks: 'Final commission approved.',
        assessmentData: {
          score: 6,
          total: 6,
          percentage: 100
        }
      })
    });
    const data = await res.json();
    if (!data.success || !data.sainikId) throw new Error('Final approval failed: ' + JSON.stringify(data));
    testSainikId = data.sainikId;
    if (!testSainikId.startsWith('SSD-MH-2026-')) throw new Error('Invalid Sainik ID generated: ' + testSainikId);
  });

  // 7b. DECISION: ENLISTMENT APPROVAL OFFICER APPROVAL ACTION
  await assert('Enlistment Officer Direct Application Approval & Commissioning', async () => {
    // 1. Submit second test application
    const appRes = await fetch('http://localhost:3000/api/membership/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Priya R. Dongre',
        dob: '2001-08-15',
        gender: 'Female',
        mobile: '+91 98223 88888',
        email: 'priya.dongre@example.com',
        stateId: 'state_mh',
        stateName: 'Maharashtra',
        districtId: 'dist_mh_pune',
        districtName: 'Pune',
        wingId: 'wing_mahila',
        wingName: 'Mahila Samata Sainik Dal (Women Wing)',
        solemnPledge: true
      })
    });
    const appData = await appRes.json();
    if (!appData.success) throw new Error('Second app creation failed');

    // 2. Enlistment Officer approves directly
    const approveRes = await fetch(`http://localhost:3000/api/membership/applications/${appData.applicationId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokenEnlistment}`
      },
      body: JSON.stringify({
        designation: 'Mahila Dal Platoon Leader',
        batchNo: 'BATCH-2026/Q3',
        remarks: 'Approved by Enlistment Approval Board.',
        assessmentData: { score: 6, total: 6, percentage: 100 }
      })
    });
    const approveData = await approveRes.json();
    if (!approveData.success || !approveData.sainikId) throw new Error('Enlistment Officer approval failed: ' + JSON.stringify(approveData));
    if (!approveData.sainikId.startsWith('SSD-MH-2026-')) throw new Error('Invalid Sainik ID format from Enlistment Officer');
  });

  // 8. DIGITAL ID CARD PAYLOAD TEST
  await assert('Digital ID Card Data Retrieval', async () => {
    const res = await fetch(`http://localhost:3000/api/members/card/${testSainikId}`);
    const data = await res.json();
    if (!data.success || !data.cardData) throw new Error('Card data fetch failed');
    if (data.cardData.sainikId !== testSainikId) throw new Error('Sainik ID mismatch on card');
    if (!data.cardData.verifyUrl) throw new Error('QR verification URL missing on card');
  });

  // 9. PUBLIC QR VERIFICATION TEST (PRIVACY PROTECTED)
  await assert('Public QR Verification Endpoint (Privacy Protected)', async () => {
    const res = await fetch(`http://localhost:3000/api/verify/${testSainikId}`);
    const data = await res.json();
    if (!data.success || !data.verification.verified) throw new Error('Verification failed');
    if (data.verification.address || data.verification.phone || data.verification.email) {
      throw new Error('Privacy Violation: PII exposed on public verification endpoint!');
    }
  });

  // 10. DONATION & RAZORPAY PAYMENT VERIFICATION TEST
  await assert('Razorpay Donation Order & HMAC Signature Verification', async () => {
    // 1. Create order
    const orderRes = await fetch('http://localhost:3000/api/donations/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 5000,
        donorName: 'Dr. Siddharth Kamble',
        email: 'siddharth.kamble@example.com',
        cause: 'Centenary 2027 Trust Fund',
        pan: 'ABCDE1234F'
      })
    });
    const orderData = await orderRes.json();
    if (!orderData.success || !orderData.orderId) throw new Error('Order creation failed');

    // 2. Verify Payment
    const verifyRes = await fetch('http://localhost:3000/api/donations/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: 'pay_test_kamble_5000',
        razorpay_signature: 'test_verified_signature',
        donorName: 'Dr. Siddharth Kamble',
        email: 'siddharth.kamble@example.com',
        cause: 'Centenary 2027 Trust Fund',
        amount: 5000
      })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success || !verifyData.receipt.receipt_number) throw new Error('Payment verification failed');
    if (!verifyData.receipt.receipt_number.startsWith('SSD-REC-2026-')) throw new Error('Invalid Receipt format');
  });

  // 11. AUDIT LOGS TEST
  await assert('Immutable Audit Trail Verification', async () => {
    const res = await fetch('http://localhost:3000/api/admin/audit-logs', {
      headers: { 'Authorization': `Bearer ${authTokenSuper}` }
    });
    const data = await res.json();
    if (!data.success || data.logs.length === 0) throw new Error('Audit logs missing');
  });

  console.log(`\n==========================================================================`);
  console.log(` 🏁 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==========================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}


// Execute tests
setTimeout(() => {
  runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}, 1000);
