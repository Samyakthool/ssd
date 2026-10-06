import { query } from '@/db/postgres';
import { AppError } from '@/lib/errors';
import { Member, MembershipApplication } from '@/types';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';

const JWT_SECRET = process.env.JWT_SECRET || 'ssd_prod_secret_key_change_in_production_1927_2027';

export interface VerifiedMemberPublic {
  sainik_id: string;
  full_name: string;
  designation: string;
  wing_name: string;
  state_name: string;
  district_name: string;
  chapter_name: string;
  status: string;
  batch_no: string;
  approved_at: string;
  photo_url?: string;
}

export class MemberService {
  /**
   * Public QR Code Verification with Privacy Protection
   */
  static async verifyCadet(identifier: string): Promise<{
    verified: boolean;
    member?: VerifiedMemberPublic;
    application?: {
      id: string;
      full_name: string;
      wing_name: string;
      state_name: string;
      district_name: string;
      status: string;
    };
    error?: string;
  }> {
    if (!identifier || typeof identifier !== 'string') {
      throw new AppError('Sainik Identifier or QR token required', 'INVALID_PARAM', 400);
    }

    // Strip URL or query parameters if raw QR string scanned
    let cleanId = identifier.trim();
    if (cleanId.includes('/verify/')) {
      cleanId = cleanId.split('/verify/').pop()?.split('/')[0]?.split('?')[0] || cleanId;
    }
    cleanId = cleanId.replace(/[?#].*$/, '').trim();

    // 1. Check members table
    const memRes = await query<any>(
      `SELECT * FROM members 
       WHERE sainik_id = $1 OR id = $1 OR qr_token = $1 
       LIMIT 1`,
      [cleanId]
    );

    if (memRes.rows.length > 0) {
      const m = memRes.rows[0];
      return {
        verified: true,
        member: {
          sainik_id: m.sainik_id || m.id,
          full_name: m.full_name || m.name,
          designation: m.designation || 'Cadet Sainik',
          wing_name: m.wing_name || 'Central Cadet Corps',
          state_name: m.state_name || 'Maharashtra',
          district_name: m.district_name || 'Nagpur',
          chapter_name: m.chapter_name || `${m.district_name || 'Nagpur'} Central Unit`,
          status: m.status || 'ACTIVE',
          batch_no: m.batch_no || 'BATCH-2026/Q1',
          approved_at: m.approved_at || m.created_at || new Date().toISOString(),
          photo_url: m.photo_url || null,
        },
      };
    }

    // 2. Check membership_applications table
    const appRes = await query<any>(
      `SELECT * FROM membership_applications 
       WHERE application_no = $1 OR id = $1 
       LIMIT 1`,
      [cleanId]
    );

    if (appRes.rows.length > 0) {
      const a = appRes.rows[0];
      return {
        verified: false,
        application: {
          id: a.application_no || a.id,
          full_name: a.full_name,
          wing_name: a.wing_name,
          state_name: a.state_name,
          district_name: a.district_name,
          status: a.status,
        },
      };
    }

    throw new AppError(`Cadet verification record '${identifier}' not found in authoritative registry`, 'NOT_FOUND', 404);
  }

  /**
   * Get Cadet Digital ID Card details
   */
  static async getMemberCardData(sainikId: string): Promise<any> {
    if (!sainikId || typeof sainikId !== 'string') {
      throw new AppError('Sainik ID required', 'INVALID_PARAM', 400);
    }

    const clean = sainikId.trim();
    const res = await query<any>(
      `SELECT * FROM members WHERE sainik_id = $1 OR id = $1 LIMIT 1`,
      [clean]
    );

    if (res.rows.length === 0) {
      // Check application if already commissioned or approved
      const appRes = await query<any>(
        `SELECT * FROM membership_applications WHERE application_no = $1 OR id = $1 LIMIT 1`,
        [clean]
      );
      if (appRes.rows.length > 0 && appRes.rows[0].status === 'FINAL_APPROVED') {
        const app = appRes.rows[0];
        const verified_url = `https://ssdind.vercel.app/verify?id=${encodeURIComponent(app.application_no)}`;
        let qrCodeDataUrl = null;
        try {
          qrCodeDataUrl = await QRCode.toDataURL(verified_url, {
            width: 250,
            margin: 2,
            color: { dark: '#001f3f', light: '#ffffff' },
            errorCorrectionLevel: 'M',
          });
        } catch (e) {}
        return {
          sainik_id: app.application_no,
          full_name: app.full_name,
          dob: app.dob,
          blood_group: app.blood_group || 'O+',
          mobile: app.mobile,
          state_name: app.state_name,
          district_name: app.district_name,
          wing_name: app.wing_name,
          designation: 'Cadet Sainik',
          status: 'ACTIVE',
          photo_url: app.photo_url || 'logo.png',
          batch_no: 'BATCH-2026/Q1',
          qr_token: `token_${clean}`,
          verified_url,
          verifyUrl: verified_url,
          qrCodeDataUrl,
        };
      }
      throw new AppError(`Member card '${sainikId}' not found`, 'MEMBER_NOT_FOUND', 404);
    }

    const m = res.rows[0];
    const verified_url = `https://ssdind.vercel.app/verify?id=${encodeURIComponent(m.sainik_id)}`;
    let qrCodeDataUrl = null;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(verified_url, {
        width: 250,
        margin: 2,
        color: { dark: '#001f3f', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
    } catch (e) {}
    return {
      sainik_id: m.sainik_id,
      full_name: m.full_name,
      dob: m.dob,
      blood_group: m.blood_group || 'O+',
      mobile: m.mobile,
      email: m.email,
      state_name: m.state_name,
      district_name: m.district_name,
      chapter_name: m.chapter_name || `${m.district_name} Central Unit`,
      wing_name: m.wing_name,
      designation: m.designation || 'Cadet Sainik',
      status: m.status || 'ACTIVE',
      photo_url: m.photo_url || 'logo.png',
      batch_no: m.batch_no || 'BATCH-2026/Q1',
      qr_token: m.qr_token,
      verified_url,
      verifyUrl: verified_url,
      qrCodeDataUrl,
    };
  }

  /**
   * Cadet Member Portal Authentication
   */
  static async cadetLogin(identifier: string, credential?: string): Promise<{
    token: string;
    member: any;
  }> {
    if (!identifier) {
      throw new AppError('Sainik ID or registered mobile is required', 'INVALID_CREDENTIALS', 400);
    }

    const clean = identifier.trim();
    const res = await query<any>(
      `SELECT * FROM members WHERE sainik_id = $1 OR mobile = $1 OR email = $1 LIMIT 1`,
      [clean]
    );

    if (res.rows.length === 0) {
      throw new AppError('Cadet record not found. Please verify your Sainik ID or contact your unit commander.', 'UNAUTHORIZED', 401);
    }

    const m = res.rows[0];
    const token = jwt.sign(
      {
        cadetId: m.sainik_id,
        fullName: m.full_name,
        role: 'member',
        wing: m.wing_name,
        state: m.state_name,
        district: m.district_name,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return {
      token,
      member: {
        sainik_id: m.sainik_id,
        full_name: m.full_name,
        wing_name: m.wing_name,
        designation: m.designation,
        state_name: m.state_name,
        district_name: m.district_name,
        status: m.status,
      },
    };
  }
}
