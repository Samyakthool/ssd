import { applicationsRepo, generateApplicationNo, mapApplication } from '@/db/index';
import { query } from '@/db/postgres';
import {
  membershipApplicationSchema,
  MembershipApplicationInput,
  applicationReviewActionSchema,
} from '@/validation/membership.schema';
import { AuthSessionPayload } from '@/modules/auth/service';
import { requirePermission, enforceJurisdictionGuard } from '@/security/jurisdictionGuard';
import { validateJurisdictionAccess } from '@/security/jurisdiction';
import { AppError } from '@/lib/errors';
import { MembershipApplication, Member, ApplicationStatus } from '@/types';

export class MembershipService {
  /**
   * Public Enlistment: Validates input, generates Base32 Application ID, stores application
   */
  static async submitApplication(input: unknown): Promise<{
    success: boolean;
    applicationNo: string;
    applicationId: string;
    fullName: string;
    status: ApplicationStatus;
  }> {
    const validated = membershipApplicationSchema.parse(input);
    const created = await applicationsRepo.create({
      ...validated,
      documents: (validated as any).documents || [],
    });

    return {
      success: true,
      applicationNo: created.applicationNo,
      applicationId: created.id,
      fullName: created.fullName,
      status: created.status,
    };
  }

  /**
   * Public Status Tracking: Returns masked status without leaking sensitive PII
   */
  static async getApplicationStatus(queryId: string): Promise<{
    applicationNo: string;
    fullName: string;
    mobileMasked: string;
    emailMasked: string;
    stateName: string;
    districtName: string;
    wingName: string;
    status: ApplicationStatus;
    currentStepOrder: number;
    submittedAt: string;
    updatedAt: string;
  }> {
    if (!queryId || typeof queryId !== 'string') {
      throw new AppError('Valid application identifier required', 'INVALID_PARAM', 400);
    }

    const clean = queryId.trim();
    let app: MembershipApplication | null = null;

    if (clean.startsWith('SSD-')) {
      app = await applicationsRepo.findByApplicationNo(clean);
    }
    if (!app) {
      app = await applicationsRepo.findById(clean);
    }

    if (!app) {
      // Fallback query across database
      const res = await query<MembershipApplication>(
        `SELECT * FROM membership_applications 
         WHERE application_no = $1 OR id = $1 OR mobile = $1 
         LIMIT 1`,
        [clean]
      );
      app = res.rows[0] || null;
    }

    if (!app) {
      throw new AppError(`Application record '${queryId}' not found`, 'APPLICATION_NOT_FOUND', 404);
    }

    // Mask sensitive PII
    const mobileDigits = (app.mobile || '').replace(/\D/g, '');
    const mobileMasked = mobileDigits.length >= 4 
      ? `******${mobileDigits.substring(mobileDigits.length - 4)}` 
      : '******';
    
    const emailParts = (app.email || '').split('@');
    const emailMasked = emailParts.length === 2 && emailParts[0].length > 2
      ? `${emailParts[0][0]}***${emailParts[0][emailParts[0].length - 1]}@${emailParts[1]}`
      : '***@***';

    return {
      applicationNo: app.applicationNo || app.id,
      fullName: app.fullName,
      mobileMasked,
      emailMasked,
      stateName: app.stateName,
      districtName: app.districtName,
      wingName: app.wingName,
      status: app.status,
      currentStepOrder: app.currentStepOrder || 1,
      submittedAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }

  /**
   * Official Review Queue: Jurisdiction-scoped queue query
   */
  static async getApplicationsQueue(
    session: AuthSessionPayload,
    options: {
      status?: string;
      wingId?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    applications: MembershipApplication[];
    total: number;
    page: number;
    limit: number;
  }> {
    requirePermission(session, 'membership.view');

    const res = await query<MembershipApplication>('SELECT * FROM membership_applications ORDER BY created_at DESC');
    let allApps = res.rows.map(mapApplication);
    allApps.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Apply strict multi-tier territorial jurisdiction filtering
    const scopedApps = allApps.filter((app) => {
      const evaluation = validateJurisdictionAccess(session.role, session.jurisdiction, {
        stateId: app.stateId,
        stateName: app.stateName,
        regionId: app.regionId,
        regionName: app.regionName,
        districtId: app.districtId,
        districtName: app.districtName,
        talukaId: app.talukaId,
        talukaName: app.talukaName,
      });
      return evaluation.isAuthorized;
    });

    // Filter by status if specified
    let filtered = scopedApps;
    if (options.status) {
      const upperStatus = options.status.toUpperCase();
      filtered = filtered.filter((a) => a.status === upperStatus);
    }

    // Filter by wing if specified
    if (options.wingId) {
      filtered = filtered.filter((a) => a.wingId === options.wingId);
    }

    // Search term
    if (options.search) {
      const term = options.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.fullName?.toLowerCase().includes(term) ||
          a.applicationNo?.toLowerCase().includes(term) ||
          a.mobile?.includes(term) ||
          a.email?.toLowerCase().includes(term)
      );
    }

    const page = options.page || 1;
    const limit = options.limit || 50;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      applications: paginated,
      total: filtered.length,
      page,
      limit,
    };
  }

  /**
   * Get single application by ID with jurisdiction enforcement
   */
  static async getApplicationById(
    session: AuthSessionPayload,
    id: string
  ): Promise<MembershipApplication> {
    requirePermission(session, 'membership.view');

    const app = await applicationsRepo.findById(id) || await applicationsRepo.findByApplicationNo(id);
    if (!app) {
      throw new AppError(`Application '${id}' not found`, 'APPLICATION_NOT_FOUND', 404);
    }

    await enforceJurisdictionGuard(session, {
      stateId: app.stateId,
      stateName: app.stateName,
      regionId: app.regionId,
      regionName: app.regionName,
      districtId: app.districtId,
      districtName: app.districtName,
      talukaId: app.talukaId,
      talukaName: app.talukaName,
    });

    return app;
  }

  /**
   * Multi-Step Workflow: Review
   */
  static async reviewApplication(
    session: AuthSessionPayload,
    id: string,
    remarks: string = ''
  ): Promise<MembershipApplication> {
    requirePermission(session, 'membership.review');
    const app = await this.getApplicationById(session, id);

    const result = await applicationsRepo.processWorkflowAction(
      app.id,
      'UNDER_REVIEW',
      {
        id: session.userId,
        name: session.fullName,
        role: session.role,
        jurisdictionSummary: JSON.stringify(session.jurisdiction),
      },
      remarks
    );

    return result.application;
  }

  /**
   * Multi-Step Workflow: Recommend with Rubric Score
   */
  static async recommendApplication(
    session: AuthSessionPayload,
    id: string,
    rubric: Record<string, any> = {},
    remarks: string = ''
  ): Promise<MembershipApplication> {
    requirePermission(session, 'membership.recommend');
    const app = await this.getApplicationById(session, id);

    const result = await applicationsRepo.processWorkflowAction(
      app.id,
      'RECOMMEND',
      {
        id: session.userId,
        name: session.fullName,
        role: session.role,
        jurisdictionSummary: JSON.stringify(session.jurisdiction),
      },
      remarks,
      JSON.stringify(rubric)
    );

    return result.application;
  }

  /**
   * Multi-Step Workflow: Request Correction
   */
  static async requestCorrection(
    session: AuthSessionPayload,
    id: string,
    remarks: string
  ): Promise<MembershipApplication> {
    requirePermission(session, 'membership.request_correction');
    const app = await this.getApplicationById(session, id);

    const result = await applicationsRepo.processWorkflowAction(
      app.id,
      'REQUEST_CORRECTION',
      {
        id: session.userId,
        name: session.fullName,
        role: session.role,
        jurisdictionSummary: JSON.stringify(session.jurisdiction),
      },
      remarks,
      remarks
    );

    return result.application;
  }

  /**
   * Multi-Step Workflow: Reject
   */
  static async rejectApplication(
    session: AuthSessionPayload,
    id: string,
    reason: string
  ): Promise<MembershipApplication> {
    requirePermission(session, 'membership.reject');
    const app = await this.getApplicationById(session, id);

    const result = await applicationsRepo.processWorkflowAction(
      app.id,
      'REJECT',
      {
        id: session.userId,
        name: session.fullName,
        role: session.role,
        jurisdictionSummary: JSON.stringify(session.jurisdiction),
      },
      reason,
      reason
    );

    return result.application;
  }

  /**
   * Multi-Step Workflow: Final Approval & Cadet Commissioning inside ACID Transaction
   */
  static async approveApplication(
    session: AuthSessionPayload,
    id: string,
    remarks: string = ''
  ): Promise<{ application: MembershipApplication; member?: Member }> {
    requirePermission(session, 'membership.final_approve');
    const app = await this.getApplicationById(session, id);

    return applicationsRepo.processWorkflowAction(
      app.id,
      'FINAL_APPROVE',
      {
        id: session.userId,
        name: session.fullName,
        role: session.role,
        jurisdictionSummary: JSON.stringify(session.jurisdiction),
      },
      remarks
    );
  }
}
