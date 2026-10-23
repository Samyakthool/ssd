// ==========================================================================
// SAMATA SAINIK DAL (SSD) - END-TO-END AUTOMATED TEST SUITE
// ==========================================================================

import { initDb, embeddedStore } from '../db/index.js';
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

  // Purge any transient records from prior test runs to ensure complete idempotency
  const testMobiles = [
    '9422111222', '9422955555', '9422133444', '9422233333', '9422344444',
    '9822399999', '9822388888', '9822377777'
  ];
  function isTestRecord(entity) {
    if (!entity) return false;
    const mob = entity.mobile ? String(entity.mobile).replace(/\D/g, '') : '';
    for (const tm of testMobiles) {
      if (mob.endsWith(tm) || mob === tm) return true;
    }
    if (entity.full_name && (entity.full_name.includes('Rambhau') || entity.full_name.includes('Pune Sainik') || entity.full_name.includes('Veteran D. G. Kamble') || entity.full_name.includes('Duplicate Mobile') || entity.full_name.includes('Imposter'))) {
      return true;
    }
    if (entity.legacy_sainik_id === 'LEGACY-MH-1998' || entity.existing_sainik_id === 'LEGACY-MH-1998') return true;
    return false;
  }

  if (embeddedStore) {
    if (embeddedStore.members) {
      for (const [id, m] of Array.from(embeddedStore.members.entries())) {
        if (isTestRecord(m)) {
          embeddedStore.members.delete(id);
        }
      }
    }
    if (embeddedStore.membership_applications) {
      for (const [id, a] of Array.from(embeddedStore.membership_applications.entries())) {
        if (isTestRecord(a)) {
          embeddedStore.membership_applications.delete(id);
        }
      }
    }
  }

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

  // 12. VOICES FROM THE FRONTLINE & CADRE TESTIMONIES TESTS
  let createdTestimonyId = '';
  await assert('Public Testimonials Retrieval', async () => {
    const res = await fetch('http://localhost:3000/api/testimonials');
    const data = await res.json();
    if (res.status !== 200 || !data.success || !Array.isArray(data.testimonials)) {
      throw new Error('Failed to retrieve published testimonies');
    }
    if (data.testimonials.length === 0) throw new Error('Expected default seeded testimonies');
  });

  await assert('Cadre Testimony Creation & Upsert by SuperAdmin', async () => {
    const testPayload = {
      name: 'Subedar Major Ramesh Shinde',
      designation: 'State Parade Commander, Maharashtra',
      category: 'leadership',
      cadetId: 'SSD-MH-2026-TEST',
      state: 'Maharashtra',
      tenure: '28 Years Active Cadre',
      highlight: 'Discipline in khaki is our defense of the Constitution.',
      quote: 'From grassroots taluka shakhas to state conclaves, our sainiks maintain unwavering constitutional vigilance.',
      is_published: true
    };
    const res = await fetch('http://localhost:3000/api/testimonials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokenSuper}`
      },
      body: JSON.stringify(testPayload)
    });
    const data = await res.json();
    if (res.status !== 200 || !data.success || !data.testimonial) {
      throw new Error('Failed to create testimony: ' + JSON.stringify(data));
    }
    createdTestimonyId = data.testimonial.id;
  });

  await assert('Cadre Testimony Status Toggle (Publish/Draft)', async () => {
    if (!createdTestimonyId) throw new Error('No testimony ID to toggle');
    const res = await fetch(`http://localhost:3000/api/testimonials/${createdTestimonyId}/toggle`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${authTokenSuper}` }
    });
    const data = await res.json();
    if (res.status !== 200 || !data.success || data.is_published !== false) {
      throw new Error('Expected testimony to toggle to draft');
    }
  });

  await assert('Cadre Testimony Deletion', async () => {
    if (!createdTestimonyId) throw new Error('No testimony ID to delete');
    const res = await fetch(`http://localhost:3000/api/testimonials/${createdTestimonyId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authTokenSuper}` }
    });
    const data = await res.json();
    if (res.status !== 200 || !data.success) {
      throw new Error('Failed to delete testimony: ' + JSON.stringify(data));
    }
  });

  // 13. GRANULAR OFFICER PERMISSION FOR TESTIMONIALS
  await assert('Granular Desk Permission Authorization for Command Officer', async () => {
    const newOfficer = {
      email: `voices.editor.${Date.now()}@ssd.org`,
      password: 'EditorPass2026!',
      fullName: 'Sainik Jyoti Gaikwad',
      phone: '+91 98220 99881',
      roleId: 'district_official',
      department: 'Central Media & Frontline Archives',
      can_edit_testimonials: true,
      stateId: 'state_mh',
      districtId: 'dist_mh_nagpur'
    };
    const res = await fetch('http://localhost:3000/api/auth/officers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokenSuper}`
      },
      body: JSON.stringify(newOfficer)
    });
    const data = await res.json();
    if (res.status !== 200 || !data.success || !data.officerId) {
      throw new Error('Failed to onboard officer with granular permission: ' + JSON.stringify(data));
    }

    // Verify officer listing contains can_edit_testimonials
    const listRes = await fetch('http://localhost:3000/api/auth/officers', {
      headers: { 'Authorization': `Bearer ${authTokenSuper}` }
    });
    const listData = await listRes.json();
    const found = listData.officers.find(o => o.id === data.officerId);
    if (!found || !found.can_edit_testimonials) {
      throw new Error('Officer did not retain can_edit_testimonials permission');
    }
  });

  // 14. CMS HOMEPAGE & AIM-MOTTO TESTS
  await assert('Homepage CMS Content Delivery', async () => {
    const res = await fetch('http://localhost:3000/api/cms/homepage');
    const data = await res.json();
    if (res.status !== 200 || !data.success || !data.homepage.hero) {
      throw new Error('Failed to retrieve homepage CMS content');
    }
  });

  await assert('Trilingual Aim & Motto Formulation', async () => {
    const res = await fetch('http://localhost:3000/api/cms/aim-motto');
    const data = await res.json();
    if (res.status !== 200 || !data.success || !data.aim_motto.official_aim.mr || !data.aim_motto.official_motto.hi) {
      throw new Error('Aim & motto missing required trilingual formulations');
    }
  });

  // 15. HISTORICAL ORGANIZATIONS & TIMELINE TESTS
  await assert('Historical Predecessors & Verified Organizations', async () => {
    const res = await fetch('http://localhost:3000/api/cms/history/organizations');
    const data = await res.json();
    if (res.status !== 200 || !data.success || data.organizations.length < 5) {
      throw new Error('Expected at least 5 verified historical predecessor profiles');
    }
  });

  await assert('Historical Timeline Chronology', async () => {
    const res = await fetch('http://localhost:3000/api/cms/history/timeline');
    const data = await res.json();
    if (res.status !== 200 || !data.success || data.timeline.length < 8) {
      throw new Error('Expected at least 8 verified historical timeline milestones');
    }
  });

  // 16. CONSTITUTION & INTEGRITY CHECKSUM
  await assert('Official Constitution Chapters & Cryptographic Checksum', async () => {
    const res = await fetch('http://localhost:3000/api/constitution');
    const data = await res.json();
    if (res.status !== 200 || !data.success || !data.constitution.chapters || data.constitution.chapters.length < 6) {
      throw new Error('Constitution chapters incomplete');
    }
    const checksum = data.constitution.sha256Checksum;
    const verifyRes = await fetch('http://localhost:3000/api/constitution/verify-checksum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checksum })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.valid) throw new Error('Checksum verification failed');
  });

  // 17. DIGITAL LIBRARY CATALOG & ACCESS TIERS
  await assert('Digital Library Categories & Access Control Filtering', async () => {
    const catsRes = await fetch('http://localhost:3000/api/library/categories');
    const catsData = await catsRes.json();
    if (catsRes.status !== 200 || !catsData.success || catsData.categories.length < 6) {
      throw new Error('Library categories incomplete');
    }

    const resRes = await fetch('http://localhost:3000/api/library/resources');
    const resData = await resRes.json();
    if (resRes.status !== 200 || !resData.success || resData.resources.length < 5) {
      throw new Error('Library resources catalog empty or incomplete');
    }
  });

  // 18. STATUTORY TERMS & CONDITIONS (20 CLAUSES) & DPDP PRIVACY POLICY
  await assert('Statutory Terms & Conditions 20-Clause Compliance & DPDP Privacy Policy', async () => {
    const termsRes = await fetch('http://localhost:3000/api/legal/terms');
    const termsData = await termsRes.json();
    if (termsRes.status !== 200 || !termsData.success || termsData.terms.sections.length !== 20) {
      throw new Error('Terms & conditions must have exactly 20 required clauses');
    }

    const privRes = await fetch('http://localhost:3000/api/legal/privacy');
    const privData = await privRes.json();
    if (privRes.status !== 200 || !privData.success || privData.privacy.sections.length < 6) {
      throw new Error('Privacy policy incomplete');
    }

    const acceptRes = await fetch('http://localhost:3000/api/legal/accept-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIdentifier: 'SSD-MH-2026-TEST-CADET',
        versionAccepted: '1.0'
      })
    });
    const acceptData = await acceptRes.json();
    if (acceptRes.status !== 200 || !acceptData.success || !acceptData.recordId) {
      throw new Error('Failed to record user statutory terms acceptance');
    }
  });

  // ==========================================================================
  // 12 ACCEPTANCE TESTS: LEGACY SAINIK REGISTRATION & BATCH MANAGEMENT
  // ==========================================================================
  let legacyTestAppId = '';
  let legacySainikId = '';

  // 1 & 3 & 4. LEGACY REGISTRATION: 2012 JOINING DATE VS 2026 PORTAL DATE & BATCH LOCK
  await assert('Acceptance 1, 3, 4: 2012 Joining Date Retained, 2026 Portal Date Immutable & Batch Attempt Nullified', async () => {
    const res = await fetch('http://localhost:3000/api/membership/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        membershipType: 'LEGACY',
        fullName: 'Veteran Rambhau S. Wankhede',
        mobile: '+91 94221 11222',
        email: 'rambhau.wankhede@example.org',
        stateId: 'state_mh',
        stateName: 'Maharashtra',
        districtId: 'dist_mh_nagpur',
        districtName: 'Nagpur',
        chapter: 'Deekshabhoomi Central Unit',
        originalJoiningDate: '2012-08-15',
        joiningDatePrecision: 'EXACT_DATE',
        existingSainikId: 'LEGACY-MH-1998',
        currentDesignation: 'Senior Dalpati',
        previousResponsibilities: 'Nagpur Zonal Drill Coordinator (2012-2018)',
        batchNo: 'SSD-MY-CUSTOM-BATCH', // Attempt to choose custom batch!
        solemnPledge: true,
        applicantAttestation: true
      })
    });
    const data = await res.json();
    if (!data.success || !data.applicationId) throw new Error('Legacy application creation failed: ' + JSON.stringify(data));
    legacyTestAppId = data.applicationId;

    // Verify 1: Original joining date retained as 2012-08-15
    if (data.originalJoiningDate !== '2012-08-15') {
      throw new Error(`Original joining date mismatch: Expected 2012-08-15, got ${data.originalJoiningDate}`);
    }

    // Verify 3: Portal registration date is 2026
    const regDate = new Date(data.portalRegistrationDate);
    if (regDate.getFullYear() !== 2026 && !data.portalRegistrationDate.includes('2026')) {
      throw new Error(`Portal registration date must be 2026: got ${data.portalRegistrationDate}`);
    }

    // Verify 4: Batch cannot be chosen by applicant
    const checkApp = await fetch(`http://localhost:3000/api/legacy/applications/${legacyTestAppId}`, {
      headers: { 'Authorization': `Bearer ${authTokenSuper}` }
    });
    const checkData = await checkApp.json();
    if (checkData.application.batch_code !== null) {
      throw new Error('Security Breach: Applicant was able to assign their own batch number!');
    }
    if (checkData.application.joining_date_verified !== false) {
      throw new Error('Security Breach: Legacy joining date was auto-verified without official verification!');
    }
  });

  // 11. DIGITAL ID CANNOT BE GENERATED BEFORE APPROVAL
  await assert('Acceptance 11: Digital Sainik ID cannot be generated before authorized approval', async () => {
    const res = await fetch(`http://localhost:3000/api/members/card/${legacyTestAppId}`);
    if (res.status !== 403 && res.status !== 404) {
      throw new Error(`Expected 403 Forbidden for unapproved candidate digital ID, got ${res.status}`);
    }
    const data = await res.json();
    if (data.success) throw new Error('Unapproved applicant received official digital ID!');
  });

  // 5. UNVERIFIED JOINING DATE CANNOT BE TREATED AS VERIFIED (BATCH ALLOCATION BLOCKED)
  await assert('Acceptance 5: Unverified joining date cannot be treated as verified (Batch allocation blocked)', async () => {
    const res = await fetch(`http://localhost:3000/api/legacy/applications/${legacyTestAppId}/assign-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokenSuper}`
      },
      body: JSON.stringify({ reason: 'Premature allocation attempt' })
    });
    const data = await res.json();
    if (res.status !== 400 || data.success) {
      throw new Error('Batch allocation succeeded before joining date verification was performed!');
    }
  });

  // 6. UNAUTHORIZED OFFICIAL CANNOT MODIFY JOINING DATE
  await assert('Acceptance 6: Unauthorized official cannot modify or verify joining date', async () => {
    const res = await fetch(`http://localhost:3000/api/legacy/applications/${legacyTestAppId}/verify-date`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer BAD_OR_UNAUTHORIZED_TOKEN`
      },
      body: JSON.stringify({ verifiedDate: '2010-01-01', reason: 'Unauthorized edit' })
    });
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`Expected 401/403 for unauthorized date verification attempt, got ${res.status}`);
    }
  });

  // 7. JURISDICTION RESTRICTION: OFFICIAL CANNOT ACCESS RECORDS OUTSIDE ASSIGNED TERRITORY
  await assert('Acceptance 7: Official cannot access legacy records outside assigned jurisdiction', async () => {
    // Create an application in Pune (outside Nagpur)
    const puneAppRes = await fetch('http://localhost:3000/api/membership/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        membershipType: 'LEGACY',
        fullName: 'Veteran Pune Sainik',
        mobile: '+91 94221 33444',
        email: 'pune.sainik@example.org',
        stateId: 'state_mh',
        stateName: 'Maharashtra',
        districtId: 'dist_mh_pune',
        districtName: 'Pune',
        originalJoiningDate: '2015-01-26',
        solemnPledge: true,
        applicantAttestation: true
      })
    });
    const puneAppData = await puneAppRes.json();
    const puneAppId = puneAppData.applicationId;

    // Attempt to access Pune record using Nagpur District Official token
    const res = await fetch(`http://localhost:3000/api/legacy/applications/${puneAppId}`, {
      headers: { 'Authorization': `Bearer ${authTokenNagpur}` }
    });
    if (res.status !== 403) {
      throw new Error(`Jurisdiction violation: Nagpur official was able to inspect Pune record! Status: ${res.status}`);
    }
  });

  // 8. DUPLICATE MEMBERSHIP RECORDS ARE DETECTED
  await assert('Acceptance 8: Duplicate legacy membership records are detected and rejected', async () => {
    const dupRes = await fetch('http://localhost:3000/api/membership/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        membershipType: 'LEGACY',
        fullName: 'Imposter or Duplicate Registration',
        mobile: '+91 94221 11222', // Duplicate mobile
        stateName: 'Maharashtra',
        districtName: 'Nagpur',
        originalJoiningDate: '2012-08-15',
        solemnPledge: true,
        applicantAttestation: true
      })
    });
    const dupData = await dupRes.json();
    if (dupRes.status !== 409 || dupData.success) {
      throw new Error(`Expected 409 Conflict for duplicate record, got ${dupRes.status}`);
    }
  });

  // JOINING DATE OFFICIAL VERIFICATION STEP (BY SUPER ADMIN)
  await assert('Authorized Official verifies original joining date with recorded reason', async () => {
    const res = await fetch(`http://localhost:3000/api/legacy/applications/${legacyTestAppId}/verify-date`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokenSuper}`
      },
      body: JSON.stringify({
        verifiedDate: '2012-08-15',
        precision: 'EXACT_DATE',
        notes: 'Verified against 2012 Deekshabhoomi National Rally Archival Registry (Entry #1048).'
      })
    });
    const data = await res.json();
    if (!data.success || !data.joiningDateVerified) {
      throw new Error('Date verification failed: ' + JSON.stringify(data));
    }
    if (data.status !== 'BATCH_PENDING') {
      throw new Error(`Expected status BATCH_PENDING, got ${data.status}`);
    }
  });

  // 2. BATCH NUMBER IS DETERMINED BY APPROVED BATCH POLICY
  await assert('Acceptance 2: Batch number is determined by approved batch policy (SSD-BATCH-2012)', async () => {
    const res = await fetch(`http://localhost:3000/api/legacy/applications/${legacyTestAppId}/assign-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokenSuper}`
      },
      body: JSON.stringify({
        reason: 'Auto-allocation based on verified 2012 joining date under national calendar year batch policy.'
      })
    });
    const data = await res.json();
    if (!data.success || data.batchCode !== 'SSD-BATCH-2012') {
      throw new Error(`Batch assignment failed: Expected 'SSD-BATCH-2012', got '${data.batchCode}'`);
    }
  });

  // FINAL APPROVAL & COMMISSIONING (DIGITAL ID GENERATION)
  await assert('Acceptance 11 (Cont.): Digital ID is generated after required approvals with verified badges', async () => {
    const approveRes = await fetch(`http://localhost:3000/api/legacy/applications/${legacyTestAppId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokenSuper}`
      },
      body: JSON.stringify({
        designation: 'Senior Veteran Dalpati',
        remarks: 'Commissioned under Legacy Veteran Protocol.'
      })
    });
    const approveData = await approveRes.json();
    if (!approveData.success || !approveData.sainikId) {
      throw new Error('Legacy approval failed: ' + JSON.stringify(approveData));
    }
    legacySainikId = approveData.sainikId;

    // Fetch Digital ID Card now that approval is complete
    const cardRes = await fetch(`http://localhost:3000/api/members/card/${legacySainikId}`);
    const cardData = await cardRes.json();
    if (!cardData.success || !cardData.cardData) {
      throw new Error('Digital ID card retrieval failed after approval!');
    }
    if (cardData.cardData.membershipType !== 'LEGACY') {
      throw new Error('Membership type on digital ID is not LEGACY');
    }
    if (cardData.cardData.originalJoiningDate !== '2012-08-15') {
      throw new Error('Original joining date missing or incorrect on digital ID');
    }
    if (cardData.cardData.batchNo !== 'SSD-BATCH-2012') {
      throw new Error(`Batch number on digital ID mismatch: Expected SSD-BATCH-2012, got ${cardData.cardData.batchNo}`);
    }
  });

  // 9 & 10. BATCH CORRECTION CREATES AUDIT RECORD & TRACEABILITY
  await assert('Acceptance 9 & 10: Authorized batch correction creates immutable audit record in history', async () => {
    const correctRes = await fetch('http://localhost:3000/api/batches/correct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokenSuper}`
      },
      body: JSON.stringify({
        memberId: legacySainikId,
        newBatchCode: 'SSD-2012-SENIOR',
        reason: 'Authorized reallocation under Central Command Seniority Directive #2026/04.'
      })
    });
    const correctData = await correctRes.json();
    if (!correctData.success || !correctData.auditRecord) {
      throw new Error('Batch correction failed: ' + JSON.stringify(correctData));
    }

    // Verify Audit Trail in History Endpoint
    const histRes = await fetch(`http://localhost:3000/api/batches/history?memberId=${legacySainikId}`, {
      headers: { 'Authorization': `Bearer ${authTokenSuper}` }
    });
    const histData = await histRes.json();
    if (!histData.success || histData.history.length === 0) {
      throw new Error('Audit trail is empty! Batch correction was not recorded in history.');
    }
    const auditRecord = histData.history.find(h => h.new_batch_code === 'SSD-2012-SENIOR');
    if (!auditRecord) {
      throw new Error('Audit record for SSD-2012-SENIOR not found in batch history!');
    }
    if (!auditRecord.reason || !auditRecord.reason.includes('Directive #2026/04')) {
      throw new Error('Audit record does not preserve the required justification reason.');
    }
  });

  // 12. EXISTING NEW-MEMBER REGISTRATION CONTINUES TO WORK
  await assert('Acceptance 12: Existing new-member registration continues to work without disruption', async () => {
    const res = await fetch('http://localhost:3000/api/membership/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        membershipType: 'STANDARD',
        fullName: 'New Recruit Amit M. Moon',
        dob: '2004-11-20',
        gender: 'Male',
        mobile: '+91 98223 77777',
        email: 'amit.moon@example.com',
        stateId: 'state_mh',
        stateName: 'Maharashtra',
        districtId: 'dist_mh_nagpur',
        districtName: 'Nagpur',
        wingId: 'wing_cadet',
        wingName: 'Central Cadet Corps (Sainik Wing)',
        solemnPledge: true
      })
    });
    const data = await res.json();
    if (!data.success || !data.applicationId || data.status !== 'SUBMITTED') {
      throw new Error('Standard new enlistment failed: ' + JSON.stringify(data));
    }
  });

  // BONUS: BULK IMPORT FOR HISTORICAL RECORDS QUEUES FOR REVIEW
  await assert('Historical records bulk import creates unverified queue with duplicate protection', async () => {
    const res = await fetch('http://localhost:3000/api/legacy/bulk-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokenSuper}`
      },
      body: JSON.stringify({
        records: [
          {
            fullName: 'Veteran D. G. Kamble',
            mobile: '+91 94229 55555',
            originalJoiningDate: '1970-10-14',
            stateName: 'Maharashtra',
            districtName: 'Nagpur'
          },
          {
            fullName: 'Duplicate Mobile Record',
            mobile: '+91 94221 11222', // Existing duplicate
            originalJoiningDate: '2012-08-15',
            stateName: 'Maharashtra',
            districtName: 'Nagpur'
          }
        ]
      })
    });
    const data = await res.json();
    if (!data.success || data.importedCount !== 1 || data.duplicateCount !== 1) {
      throw new Error(`Bulk import validation failed: Expected 1 imported and 1 duplicate, got ${JSON.stringify(data)}`);
    }
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
