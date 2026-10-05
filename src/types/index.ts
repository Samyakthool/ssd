// ==========================================================================
// SAMATA SAINIK DAL (SSD) - ENTERPRISE TYPE SYSTEM
// Strict TypeScript definitions for core entities, workflows & API contracts
// ==========================================================================

export type RoleLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type SystemRole =
  | 'super_admin'
  | 'central_admin'
  | 'state_official'
  | 'regional_official'
  | 'district_official'
  | 'taluka_official'
  | 'chapter_official'
  | 'finance_admin'
  | 'media_admin'
  | 'member'
  | 'applicant';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export interface User {
  id: string; // UUID
  email: string;
  fullName: string;
  phone?: string;
  roleId: SystemRole;
  department?: string;
  status: UserStatus;
  mfaEnabled: boolean;
  mfaSecret?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserJurisdiction {
  id: string;
  userId: string;
  roleId: SystemRole;
  stateId?: string;
  regionId?: string;
  districtId?: string;
  talukaId?: string;
  chapterId?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface JurisdictionScope {
  stateId?: string | null;
  stateName?: string | null;
  regionId?: string | null;
  regionName?: string | null;
  districtId?: string | null;
  districtName?: string | null;
  talukaId?: string | null;
  talukaName?: string | null;
  chapterId?: string | null;
  chapterName?: string | null;
}

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'RECOMMENDED'
  | 'ESCALATED'
  | 'REJECTED'
  | 'FINAL_APPROVED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED';

export type ApprovalActionType =
  | 'SUBMIT'
  | 'UNDER_REVIEW'
  | 'REQUEST_CORRECTION'
  | 'RESUBMIT'
  | 'RECOMMEND'
  | 'ESCALATE'
  | 'REJECT'
  | 'FINAL_APPROVE';

export interface MembershipApplication {
  id: string; // Internal UUID
  applicationNo: string; // Public ID, e.g. SSD-2026-8F42K7
  fullName: string;
  dob?: string;
  gender?: string;
  mobile: string;
  email: string;
  address?: string;
  stateId: string;
  stateName: string;
  regionId?: string;
  regionName?: string;
  districtId: string;
  districtName: string;
  talukaId?: string;
  talukaName?: string;
  villageCity?: string;
  education?: string;
  occupation?: string;
  bloodGroup?: string;
  wingId: string;
  wingName: string;
  photoUrl?: string;
  documents: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
    uploadedAt: string;
  }>;
  specialSkills?: string;
  solemnPledgeAccepted: boolean;
  status: ApplicationStatus;
  currentStepOrder: number;
  assignedRole?: string;
  correctionRemarks?: string;
  rejectionReason?: string;
  escalationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalAction {
  id: string;
  applicationId: string;
  stepId?: string;
  officialId: string;
  officialName: string;
  officialRole: string;
  jurisdictionSummary: string;
  action: ApprovalActionType;
  previousStatus?: ApplicationStatus;
  newStatus: ApplicationStatus;
  remarks?: string;
  createdAt: string;
}

export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'RETIRED';

export interface Member {
  id: string;
  sainikId: string; // e.g. SSD-MH-NGP-001245
  applicationId: string;
  fullName: string;
  email: string;
  mobile: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  photoUrl?: string;
  stateName: string;
  regionName?: string;
  districtName: string;
  talukaName?: string;
  chapterName?: string;
  wingName: string;
  designation: string;
  batchNo: string;
  status: MemberStatus;
  qrToken: string;
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type DonationStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Donation {
  id: string;
  orderId: string;
  paymentId?: string;
  signature?: string;
  amount: number;
  currency: string;
  donorName: string;
  email: string;
  phone?: string;
  pan?: string;
  address?: string;
  cause: string;
  status: DonationStatus;
  receiptNumber?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string; // e.g. SSD-REC-2026-000001
  donationId: string;
  donorName: string;
  amount: number;
  cause: string;
  paymentId: string;
  pan?: string;
  is80gEligible: boolean;
  issuedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  jurisdictionSummary?: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
