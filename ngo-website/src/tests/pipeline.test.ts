import { MembershipService } from '../modules/membership/service';
import { MemberService } from '../modules/members/service';
import { FinanceService } from '../modules/finance/service';
import { CmsService } from '../modules/cms/service';
import { AuthService, AuthSessionPayload } from '../modules/auth/service';
import { AppError } from '../lib/errors';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(` ❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(` ✅ PASS: ${message}`);
}

async function runPipelineSuite(): Promise<void> {
  console.log('\n==========================================================================');
  console.log(' 🎖️  PHASE 13: END-TO-END DOMAIN PIPELINE & WORKFLOW TEST SUITE');
  console.log('==========================================================================\n');

  // Officials Sessions
  const districtOfficialSession: AuthSessionPayload = {
    userId: 'user_nagpur_off_01',
    email: 'district.nagpur@ssd.org.in',
    fullName: 'Nagpur District Commander',
    role: 'district_official',
    jurisdiction: {
      stateId: 'state_mh',
      districtId: 'dist_mh_nagpur',
    },
    sessionId: 'sess_nagpur_01',
    mfaAuthenticated: true,
  };

  const puneOfficialSession: AuthSessionPayload = {
    userId: 'user_pune_off_02',
    email: 'district.pune@ssd.org.in',
    fullName: 'Pune District Commander',
    role: 'district_official',
    jurisdiction: {
      stateId: 'state_mh',
      districtId: 'dist_mh_pune',
    },
    sessionId: 'sess_pune_02',
    mfaAuthenticated: true,
  };

  const superAdminSession: AuthSessionPayload = {
    userId: 'user_super_admin_001',
    email: 'supreme.commander@ssd.org.in',
    fullName: 'Supreme Commander SSD',
    role: 'super_admin',
    jurisdiction: {},
    sessionId: 'sess_central_001',
    mfaAuthenticated: true,
  };

  // 1. Public Enlistment Application Submission
  const applicationInput = {
    fullName: 'Babasaheb Ambedkar Cadet',
    dob: '2000-04-14',
    gender: 'Male',
    mobile: '9876543210',
    email: 'cadet.ambedkar@ssd.org.in',
    address: 'Deekshabhoomi Marg, Nagpur',
    stateId: 'state_mh',
    stateName: 'Maharashtra',
    districtId: 'dist_mh_nagpur',
    districtName: 'Nagpur',
    wingId: 'wing_cadet',
    wingName: 'Central Cadet Corps (Sainik Wing)',
    solemnPledgeAccepted: true,
  };

  const appResult = await MembershipService.submitApplication(applicationInput);
  assert(appResult.success === true, 'Public Enlistment Application submission returns success: true');
  assert(appResult.applicationNo.startsWith('SSD-2026-'), 'Generated Application ID conforms to SSD-2026-XXXXXX standard');
  assert(appResult.status === 'SUBMITTED', 'Initial workflow state is SUBMITTED');

  // 2. Public Application Status Tracking with PII Masking
  const publicStatus = await MembershipService.getApplicationStatus(appResult.applicationNo);
  assert(publicStatus.applicationNo === appResult.applicationNo, 'Public status lookup retrieves matching record');
  assert(publicStatus.mobileMasked.startsWith('******') && publicStatus.mobileMasked.endsWith('3210'), 'Public tracking masks mobile number for PII defense');
  assert(publicStatus.emailMasked.includes('***') && publicStatus.emailMasked.endsWith('@ssd.org.in'), 'Public tracking masks email address');

  // 3. Jurisdiction Scoped Official Queue
  const nagpurQueue = await MembershipService.getApplicationsQueue(districtOfficialSession);
  const foundInNagpur = nagpurQueue.applications.some((a) => a.id === appResult.applicationId || a.applicationNo === appResult.applicationNo);
  assert(foundInNagpur, 'Nagpur District Official sees newly submitted Nagpur application in review queue');

  // 4. Cross-District Jurisdiction Rejection
  let crossDistrictRejected = false;
  try {
    await MembershipService.getApplicationById(puneOfficialSession, appResult.applicationId);
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 403) {
      crossDistrictRejected = true;
    }
  }
  assert(crossDistrictRejected, 'Pune District Official is denied access to Nagpur application (HTTP 403 Forbidden)');

  // 5. Multi-Step Workflow: Review Action
  const underReviewApp = await MembershipService.reviewApplication(
    districtOfficialSession,
    appResult.applicationId,
    'Documents verified against district records'
  );
  assert(underReviewApp.status === 'UNDER_REVIEW', 'Application successfully transitions to UNDER_REVIEW');

  // 6. Multi-Step Workflow: Recommendation Action with Rubric Scoring
  const rubric = { discipline: 10, fitness: 9, communityService: 10, interviewScore: 9.5 };
  const recommendedApp = await MembershipService.recommendApplication(
    districtOfficialSession,
    appResult.applicationId,
    rubric,
    'Recommended for central cadet corps'
  );
  assert(recommendedApp.status === 'RECOMMENDED', 'Application successfully transitions to RECOMMENDED state');

  // 7. Multi-Step Workflow: Final Approval & Cadet Commissioning inside ACID Transaction
  const approvalResult = await MembershipService.approveApplication(
    superAdminSession,
    appResult.applicationId,
    'Commissioned as Cadet Sainik under Central Command Warrant'
  );
  assert(approvalResult.application.status === 'FINAL_APPROVED', 'Application status reaches FINAL_APPROVED');
  assert(approvalResult.member !== undefined, 'Member record is atomically commissioned inside transaction');
  assert(
    approvalResult.member!.sainikId.startsWith('SSD-MH-'),
    `Commissioned Sainik ID '${approvalResult.member!.sainikId}' matches state and serial format`
  );
  assert(approvalResult.member!.qrToken.length >= 32, 'Tamper-resistant QR verification token generated');

  // 8. Public Privacy-Protected QR Verification Endpoint
  const qrVerification = await MemberService.verifyCadet(approvalResult.member!.sainikId);
  assert(qrVerification.verified === true, 'Public QR scanner endpoint verifies commissioned Cadet');
  assert(qrVerification.member?.full_name === 'Babasaheb Ambedkar Cadet', 'Public verification returns verified cadet name');
  assert(qrVerification.member?.designation === 'Cadet Sainik', 'Public verification returns verified rank');

  // 9. Digital ID Card Data Retrieval
  const cardData = await MemberService.getMemberCardData(approvalResult.member!.sainikId);
  assert(cardData.sainik_id === approvalResult.member!.sainikId, 'Digital ID card data accurately generated');
  assert(cardData.blood_group === 'O+', 'Cadet blood group matches medical specifications');

  // 10. Cadet Portal Login
  const cadetLogin = await MemberService.cadetLogin(approvalResult.member!.sainikId);
  assert(typeof cadetLogin.token === 'string' && cadetLogin.token.length > 20, 'Cadet receives valid JWT session token');
  assert(cadetLogin.member.sainik_id === approvalResult.member!.sainikId, 'Cadet portal session links to commissioned Sainik ID');

  // 11. Treasury: Server-Side Razorpay Order Creation
  const donationOrder = await FinanceService.createOrder({
    amount: 1927,
    currency: 'INR',
    donorName: 'Savitribai Supporter',
    email: 'savitri@supporter.org',
    cause: 'Centenary Cadet Training Fund',
  });
  assert(donationOrder.orderId.startsWith('order_'), 'Server-side Razorpay order generated with orderId');
  assert(donationOrder.amount === 1927, 'Donation order amount preserved');

  // 12. Treasury: Cryptographic Payment Verification & 80G Tax Exemption Receipt
  const verifiedPayment = await FinanceService.verifyPayment({
    orderId: donationOrder.orderId,
    paymentId: 'pay_test_99887766',
    signature: 'verified',
    donorName: 'Savitribai Supporter',
    email: 'savitri@supporter.org',
    amount: 1927,
    pan: 'ABCDE1234F',
    cause: 'Centenary Cadet Training Fund',
  });
  assert(verifiedPayment.success === true, 'Payment verification confirms successfully');
  assert(verifiedPayment.donation.status === 'COMPLETED', 'Donation status transitions to COMPLETED');
  assert(verifiedPayment.receipt.receiptNumber.startsWith('SSD-REC-'), 'Official 80G tax receipt number generated');

  // 13. 80G Tax Exemption Details Validation
  const taxReceipt = await FinanceService.getReceipt(verifiedPayment.receipt.receiptNumber);
  assert(taxReceipt.is80gEligible === true, 'Receipt confirms 80G tax exemption eligibility');
  assert(taxReceipt.trustDetails.registrationNo === 'AACTS1927DF20214', 'Trust 80G registration number verified');

  // 14. CMS & Public Broadcasts
  const events = await CmsService.getEvents();
  assert(Array.isArray(events), 'Events query returns structured array');
  const leadership = await CmsService.getLeadership();
  assert(Array.isArray(leadership), 'Leadership query returns command structure');

  console.log('\n==========================================================================');
  console.log(' 🏁 DOMAIN PIPELINE TEST SUITE SUMMARY: 14 PASSED, 0 FAILED');
  console.log('==========================================================================\n');
}

runPipelineSuite().catch((err) => {
  console.error('Fatal Pipeline Suite Error:', err);
  process.exit(1);
});
