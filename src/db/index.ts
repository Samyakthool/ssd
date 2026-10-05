import crypto from 'crypto';
import { query, withTransaction, checkDatabaseHealth } from './postgres.js';
import { getSupabaseAdmin } from './supabase.js';
import {
  MembershipApplication,
  Member,
  Donation,
  Receipt,
  AuditLog,
  ApplicationStatus,
  ApprovalActionType,
  JurisdictionScope,
  SystemRole,
} from '../types/index.js';
import { AppError } from '../lib/errors.js';

export { query, withTransaction, checkDatabaseHealth, getSupabaseAdmin };

// ==========================================================================
// SECURE IDENTIFIER GENERATORS
// ==========================================================================

export function generateApplicationNo(year: number = new Date().getFullYear()): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 unambiguous
  let code = '';
  const randomBytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return `SSD-${year}-${code}`;
}

export function generateSainikId(stateCode: string = 'MH', districtCode: string = 'NGP', serial: number = 1001): string {
  const paddedSerial = String(serial).padStart(6, '0');
  return `SSD-${stateCode.toUpperCase()}-${districtCode.toUpperCase()}-${paddedSerial}`;
}

export function generateQrToken(sainikId: string): string {
  const secret = process.env.JWT_SECRET || 'ssd_qr_secret_1927';
  return crypto.createHmac('sha256', secret).update(`${sainikId}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`).digest('hex');
}

// ==========================================================================
// MEMBERSHIP APPLICATION REPOSITORY
// ==========================================================================

export const applicationsRepo = {
  async create(data: Omit<MembershipApplication, 'id' | 'applicationNo' | 'status' | 'currentStepOrder' | 'createdAt' | 'updatedAt'>): Promise<MembershipApplication> {
    const applicationNo = generateApplicationNo();
    const sql = `
      INSERT INTO membership_applications (
        application_no, full_name, dob, gender, mobile, email, address,
        state_id, state_name, region_id, region_name, district_id, district_name,
        taluka_id, taluka_name, village_city, education, occupation, blood_group,
        wing_id, wing_name, photo_url, documents, special_skills, solemn_pledge_accepted,
        status, current_step_order
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25,
        'SUBMITTED', 1
      )
      RETURNING *
    `;

    const params = [
      applicationNo,
      data.fullName,
      data.dob || null,
      data.gender || null,
      data.mobile,
      data.email,
      data.address || null,
      data.stateId,
      data.stateName,
      data.regionId || null,
      data.regionName || null,
      data.districtId,
      data.districtName,
      data.talukaId || null,
      data.talukaName || null,
      data.villageCity || null,
      data.education || null,
      data.occupation || null,
      data.bloodGroup || null,
      data.wingId,
      data.wingName,
      data.photoUrl || null,
      JSON.stringify(data.documents || []),
      data.specialSkills || null,
      data.solemnPledgeAccepted,
    ];

    const res = await query<MembershipApplication>(sql, params);
    return res.rows[0];
  },

  async findByApplicationNo(applicationNo: string): Promise<MembershipApplication | null> {
    const res = await query<MembershipApplication>(
      'SELECT * FROM membership_applications WHERE application_no = $1 LIMIT 1',
      [applicationNo]
    );
    return res.rows[0] || null;
  },

  async findById(id: string): Promise<MembershipApplication | null> {
    const res = await query<MembershipApplication>(
      'SELECT * FROM membership_applications WHERE id = $1 LIMIT 1',
      [id]
    );
    return res.rows[0] || null;
  },

  /**
   * Multi-Step Transactional Approval Engine
   * Atomically transitions state, appends immutable approval history,
   * and optionally commissions the Member if action is FINAL_APPROVE.
   */
  async processWorkflowAction(
    applicationId: string,
    action: ApprovalActionType,
    official: { id: string; name: string; role: SystemRole; jurisdictionSummary: string },
    remarks: string = '',
    reason?: string
  ): Promise<{ application: MembershipApplication; member?: Member }> {
    return withTransaction(async (client) => {
      // 1. Lock application row for update (prevents concurrent race conditions)
      const lockRes = await client.query(
        'SELECT * FROM membership_applications WHERE id = $1 FOR UPDATE',
        [applicationId]
      );

      if (lockRes.rowCount === 0) {
        throw new AppError('Application not found', 'APPLICATION_NOT_FOUND', 404);
      }

      const app: MembershipApplication = lockRes.rows[0];
      const previousStatus = app.status;
      let newStatus: ApplicationStatus = app.status;
      let nextStepOrder = app.currentStepOrder;

      // 2. State transition business rules
      switch (action) {
        case 'UNDER_REVIEW':
          newStatus = 'UNDER_REVIEW';
          break;
        case 'RECOMMEND':
          newStatus = 'RECOMMENDED';
          nextStepOrder = app.currentStepOrder + 1;
          break;
        case 'REQUEST_CORRECTION':
          newStatus = 'CORRECTION_REQUIRED';
          break;
        case 'ESCALATE':
          newStatus = 'ESCALATED';
          break;
        case 'REJECT':
          newStatus = 'REJECTED';
          break;
        case 'FINAL_APPROVE':
          if (official.role !== 'super_admin' && official.role !== 'central_admin') {
            throw new AppError('Unauthorized: Only Central Command or Super Admin can grant final commissioning', 'UNAUTHORIZED_FINAL_APPROVAL', 403);
          }
          newStatus = 'FINAL_APPROVED';
          break;
        default:
          throw new AppError(`Unsupported approval action: ${action}`, 'INVALID_ACTION', 400);
      }

      // 3. Update application state
      const updateRes = await client.query(
        `UPDATE membership_applications 
         SET status = $1, current_step_order = $2, correction_remarks = $3, rejection_reason = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [
          newStatus,
          nextStepOrder,
          action === 'REQUEST_CORRECTION' ? reason || remarks : null,
          action === 'REJECT' ? reason || remarks : null,
          applicationId,
        ]
      );
      const updatedApp: MembershipApplication = updateRes.rows[0];

      // 4. Insert immutable approval history entry
      await client.query(
        `INSERT INTO approval_history (
          application_id, official_id, official_name, official_role,
          jurisdiction_summary, action, previous_status, new_status, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          applicationId,
          official.id,
          official.name,
          official.role,
          official.jurisdictionSummary,
          action,
          previousStatus,
          newStatus,
          remarks || reason || null,
        ]
      );

      // 5. If Final Approval, commission Member inside the same transaction
      let createdMember: Member | undefined;
      if (action === 'FINAL_APPROVE') {
        const sainikId = generateSainikId(updatedApp.stateId, updatedApp.districtId, Math.floor(1000 + Math.random() * 9000));
        const qrToken = generateQrToken(sainikId);

        const memberRes = await client.query(
          `INSERT INTO members (
            sainik_id, application_id, full_name, email, mobile, dob, gender, blood_group,
            photo_url, state_name, region_name, district_name, taluka_name, wing_name,
            designation, batch_no, status, qr_token, approved_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'ACTIVE', $17, $18)
          RETURNING *`,
          [
            sainikId,
            applicationId,
            updatedApp.fullName,
            updatedApp.email,
            updatedApp.mobile,
            updatedApp.dob,
            updatedApp.gender,
            updatedApp.bloodGroup,
            updatedApp.photoUrl,
            updatedApp.stateName,
            updatedApp.regionName,
            updatedApp.districtName,
            updatedApp.talukaName,
            updatedApp.wingName,
            'Cadet Sainik',
            `BATCH-${new Date().getFullYear()}/Q${Math.floor(new Date().getMonth() / 3) + 1}`,
            qrToken,
            official.id,
          ]
        );
        createdMember = memberRes.rows[0];
      }

      // 6. Record immutable audit event
      await client.query(
        `INSERT INTO audit_logs (
          user_id, user_name, user_role, action, entity_type, entity_id,
          jurisdiction_summary, previous_state, new_state, request_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          official.id,
          official.name,
          official.role,
          `APPLICATION_${action}`,
          'membership_applications',
          applicationId,
          official.jurisdictionSummary,
          JSON.stringify({ status: previousStatus }),
          JSON.stringify({ status: newStatus }),
          `wf_${Date.now()}`,
        ]
      );

      return { application: updatedApp, member: createdMember };
    });
  },
};

// ==========================================================================
// TREASURY & DONATION REPOSITORY
// ==========================================================================

export const donationsRepo = {
  async createOrder(data: {
    orderId: string;
    amount: number;
    currency?: string;
    donorName: string;
    email: string;
    phone?: string;
    pan?: string;
    address?: string;
    cause?: string;
    idempotencyKey?: string;
  }): Promise<Donation> {
    const sql = `
      INSERT INTO donations (
        order_id, amount, currency, donor_name, email, phone, pan, address, cause, status, idempotency_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', $10)
      RETURNING *
    `;
    const res = await query<Donation>(sql, [
      data.orderId,
      data.amount,
      data.currency || 'INR',
      data.donorName,
      data.email,
      data.phone || null,
      data.pan || null,
      data.address || null,
      data.cause || 'General Fund',
      data.idempotencyKey || null,
    ]);
    return res.rows[0];
  },

  async verifyAndConfirmPayment(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<{ donation: Donation; receipt: Receipt }> {
    return withTransaction(async (client) => {
      // 1. Lock donation row
      const donRes = await client.query(
        'SELECT * FROM donations WHERE order_id = $1 FOR UPDATE',
        [orderId]
      );

      if (donRes.rowCount === 0) {
        throw new AppError('Donation order not found', 'DONATION_ORDER_NOT_FOUND', 404);
      }

      const donation: Donation = donRes.rows[0];
      if (donation.status === 'COMPLETED') {
        // Idempotent return
        const receiptRes = await client.query(
          'SELECT * FROM receipts WHERE donation_id = $1 LIMIT 1',
          [donation.id]
        );
        return { donation, receipt: receiptRes.rows[0] };
      }

      // 2. Generate Receipt Number: SSD-REC-YYYY-XXXXXX
      const receiptNumber = `SSD-REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      // 3. Update donation status
      const updatedDonRes = await client.query(
        `UPDATE donations
         SET payment_id = $1, signature = $2, status = 'COMPLETED', receipt_number = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [paymentId, signature, receiptNumber, donation.id]
      );
      const updatedDonation: Donation = updatedDonRes.rows[0];

      // 4. Create receipt
      const recRes = await client.query(
        `INSERT INTO receipts (
          receipt_number, donation_id, donor_name, amount, cause, payment_id, pan, is_80g_eligible
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING *`,
        [
          receiptNumber,
          donation.id,
          donation.donorName,
          donation.amount,
          donation.cause,
          paymentId,
          donation.pan,
        ]
      );
      const receipt: Receipt = recRes.rows[0];

      return { donation: updatedDonation, receipt };
    });
  },
};
