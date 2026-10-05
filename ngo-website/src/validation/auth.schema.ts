import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  totpToken: z.string().length(6, 'TOTP token must be 6 digits').optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const mfaSetupSchema = z.object({
  totpToken: z.string().length(6, 'TOTP token must be 6 digits'),
});

export type MfaSetupInput = z.infer<typeof mfaSetupSchema>;

export const registerOfficerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12, 'Administrator passwords must be at least 12 characters'),
  fullName: z.string().min(2).max(255),
  phone: z.string().regex(/^[0-9]{10}$/, 'Must be a valid 10-digit mobile number'),
  roleId: z.enum([
    'super_admin',
    'central_admin',
    'state_official',
    'regional_official',
    'district_official',
    'taluka_official',
    'chapter_official',
    'finance_admin',
    'media_admin',
  ]),
  department: z.string().optional(),
  jurisdiction: z.object({
    stateId: z.string().optional(),
    regionId: z.string().optional(),
    districtId: z.string().optional(),
    talukaId: z.string().optional(),
    chapterId: z.string().optional(),
  }),
});

export type RegisterOfficerInput = z.infer<typeof registerOfficerSchema>;
