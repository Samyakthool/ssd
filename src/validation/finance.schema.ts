import { z } from 'zod';

export const createDonationOrderSchema = z.object({
  amount: z.number().int().min(10, 'Minimum donation amount is ₹10').max(1000000, 'Maximum online donation amount is ₹10,00,000'),
  currency: z.literal('INR').default('INR'),
  donorName: z.string().min(2, 'Donor name is required').max(255),
  email: z.string().email('Valid email is required for tax receipt delivery'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number').optional().or(z.literal('')),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g. ABCDE1234F)').optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  cause: z.string().max(150).default('General Fund'),
  idempotencyKey: z.string().uuid().optional(),
});

export type CreateDonationOrderInput = z.infer<typeof createDonationOrderSchema>;

export const verifyDonationPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentId: z.string().min(1, 'Payment ID is required'),
  signature: z.string().min(1, 'HMAC signature is required'),
});

export type VerifyDonationPaymentInput = z.infer<typeof verifyDonationPaymentSchema>;
