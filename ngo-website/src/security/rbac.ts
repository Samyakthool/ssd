import { SystemRole } from '../types';

export type Permission =
  | 'membership.view'
  | 'membership.review'
  | 'membership.recommend'
  | 'membership.request_correction'
  | 'membership.reject'
  | 'membership.escalate'
  | 'membership.final_approve'
  | 'member.view'
  | 'member.update'
  | 'member.card_generate'
  | 'member.suspend'
  | 'finance.view'
  | 'finance.manage'
  | 'finance.refund'
  | 'finance.receipt_generate'
  | 'media.create'
  | 'media.update'
  | 'media.delete'
  | 'events.manage'
  | 'admin.audit.view'
  | 'admin.role.manage'
  | 'admin.settings.manage';

export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  super_admin: [
    'membership.view',
    'membership.review',
    'membership.recommend',
    'membership.request_correction',
    'membership.reject',
    'membership.escalate',
    'membership.final_approve',
    'member.view',
    'member.update',
    'member.card_generate',
    'member.suspend',
    'finance.view',
    'finance.manage',
    'finance.refund',
    'finance.receipt_generate',
    'media.create',
    'media.update',
    'media.delete',
    'events.manage',
    'admin.audit.view',
    'admin.role.manage',
    'admin.settings.manage',
  ],

  central_admin: [
    'membership.view',
    'membership.review',
    'membership.recommend',
    'membership.request_correction',
    'membership.reject',
    'membership.escalate',
    'membership.final_approve',
    'member.view',
    'member.update',
    'member.card_generate',
    'member.suspend',
    'finance.view',
    'media.create',
    'media.update',
    'events.manage',
    'admin.audit.view',
  ],

  state_official: [
    'membership.view',
    'membership.review',
    'membership.recommend',
    'membership.request_correction',
    'membership.reject',
    'membership.escalate',
    'member.view',
    'events.manage',
  ],

  regional_official: [
    'membership.view',
    'membership.review',
    'membership.recommend',
    'membership.request_correction',
    'membership.reject',
    'membership.escalate',
    'member.view',
  ],

  district_official: [
    'membership.view',
    'membership.review',
    'membership.recommend',
    'membership.request_correction',
    'membership.reject',
    'member.view',
  ],

  taluka_official: [
    'membership.view',
    'membership.review',
    'membership.recommend',
    'membership.request_correction',
    'member.view',
  ],

  chapter_official: [
    'membership.view',
    'membership.review',
    'membership.recommend',
    'member.view',
  ],

  finance_admin: [
    'finance.view',
    'finance.manage',
    'finance.refund',
    'finance.receipt_generate',
    'admin.audit.view',
  ],

  media_admin: [
    'media.create',
    'media.update',
    'media.delete',
    'events.manage',
  ],

  member: [
    'member.view',
    'member.card_generate',
  ],

  applicant: [
    'membership.view',
  ],
};

export function hasPermission(role: SystemRole, requiredPermission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(requiredPermission);
}

export function hasAnyPermission(role: SystemRole, requiredPermissions: Permission[]): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return requiredPermissions.some((perm) => permissions.includes(perm));
}
