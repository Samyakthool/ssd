import { z } from 'zod';

export const membershipApplicationSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters').max(255),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be in YYYY-MM-DD format').optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
  email: z.string().email('Valid email address is required').max(255),
  address: z.string().max(500).optional(),
  stateId: z.string().min(1, 'State is required'),
  stateName: z.string().min(1, 'State name is required'),
  regionId: z.string().optional(),
  regionName: z.string().optional(),
  districtId: z.string().min(1, 'District is required'),
  districtName: z.string().min(1, 'District name is required'),
  talukaId: z.string().optional(),
  talukaName: z.string().optional(),
  villageCity: z.string().max(150).optional(),
  education: z.string().max(150).optional(),
  occupation: z.string().max(150).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  wingId: z.string().min(1, 'Wing selection is required'),
  wingName: z.string().min(1, 'Wing name is required'),
  photoUrl: z.string().url('Invalid photo URL').optional().or(z.literal('')),
  specialSkills: z.string().max(1000).optional(),
  solemnPledgeAccepted: z.literal(true, {
    message: 'You must solemnly accept the volunteer pledge',
  }),
});

export type MembershipApplicationInput = z.infer<typeof membershipApplicationSchema>;

export const applicationReviewActionSchema = z.object({
  action: z.enum([
    'UNDER_REVIEW',
    'RECOMMEND',
    'REQUEST_CORRECTION',
    'ESCALATE',
    'REJECT',
    'FINAL_APPROVE',
  ]),
  remarks: z.string().max(1000).optional(),
  rejectionReason: z.string().max(500).optional(),
  correctionRemarks: z.string().max(500).optional(),
  escalationReason: z.string().max(500).optional(),
});

export type ApplicationReviewActionInput = z.infer<typeof applicationReviewActionSchema>;

export const applicationStatusQuerySchema = z.object({
  applicationNo: z.string().regex(/^SSD-\d{4}-[A-Z0-9]{6}$/, 'Invalid application number format'),
});
