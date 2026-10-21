import { z } from 'zod';

export const topupOrderSchema = z.object({
  amountPaise: z
    .number({ required_error: 'Top-up amount is required in paise' })
    .int('Amount must be an integer in paise')
    .min(100, 'Minimum top-up amount is ₹1 (100 paise)')
    .max(500000, 'Maximum single top-up amount is ₹5,000 (500,000 paise)'),
});

export const topupVerifySchema = z.object({
  razorpayOrderId: z.string({ required_error: 'razorpayOrderId is required' }).min(1),
  razorpayPaymentId: z.string({ required_error: 'razorpayPaymentId is required' }).min(1),
  razorpaySignature: z.string({ required_error: 'razorpaySignature is required' }).min(1),
  amountPaise: z
    .number({ required_error: 'amountPaise is required' })
    .int()
    .positive('amountPaise must be positive'),
});

export const reserveCallBalanceSchema = z.object({
  callSessionId: z.string({ required_error: 'callSessionId is required' }).min(1),
  estimatedMinutes: z
    .number()
    .int()
    .min(1, 'Estimated minutes must be at least 1')
    .max(120, 'Estimated minutes cannot exceed 120')
    .default(5),
  ratePerMinutePaise: z
    .number()
    .int()
    .min(700, 'Minimum rate allowed is 700 paise (₹7)')
    .default(700),
});

export const settleCallSessionSchema = z.object({
  callSessionId: z.string({ required_error: 'callSessionId is required' }).min(1),
  durationSeconds: z.number().int().min(0, 'Duration cannot be negative'),
  ratePerMinutePaise: z
    .number()
    .int()
    .min(0)
    .default(700),
});

export const payoutRequestSchema = z
  .object({
    amountPaise: z
      .number({ required_error: 'Payout amount in paise is required' })
      .int()
      .min(50000, 'Minimum creator payout withdrawal is ₹500 (50,000 paise)'),
    method: z.enum(['UPI', 'BANK_TRANSFER'], {
      required_error: 'Payment method must be UPI or BANK_TRANSFER',
    }),
    details: z.object({
      upiId: z.string().optional(),
      accountHolderName: z.string().optional(),
      bankAccountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      bankName: z.string().optional(),
      phoneNumber: z.string().optional(),
      aadhaarNumber: z.string().optional(),
    }),
  })
  .refine(
    (data) => {
      if (data.method === 'UPI') {
        return !!data.details.upiId && data.details.upiId.includes('@');
      }
      if (data.method === 'BANK_TRANSFER') {
        return (
          !!data.details.bankAccountNumber &&
          !!data.details.ifscCode &&
          !!data.details.accountHolderName
        );
      }
      return false;
    },
    {
      message:
        'Valid UPI ID required for UPI method, or complete account holder name, account number, and IFSC code required for BANK_TRANSFER',
      path: ['details'],
    }
  );

export const adminUpdatePayoutSchema = z.object({
  status: z.enum(['APPROVED', 'PROCESSED', 'REJECTED'], {
    required_error: 'New status must be APPROVED, PROCESSED, or REJECTED',
  }),
  transactionReference: z.string().optional(),
  adminNotes: z.string().optional(),
});
