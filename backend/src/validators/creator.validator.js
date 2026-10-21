import { z } from 'zod';

export const updateCreatorProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  coverUrl: z.string().url().optional().or(z.literal('')),
  interests: z.array(z.string().trim()).min(1, 'Please select at least one interest').optional(),
  languages: z.array(z.string().trim()).min(1, 'Please select at least one language').optional(),
  pricePerMinutePaise: z
    .number({ invalid_type_error: 'Price per minute must be a number' })
    .int('Price must be an integer paise value')
    .min(700, 'Minimum allowed rate is ₹7 per minute (700 paise)')
    .max(1500, 'Maximum standard creator rate is ₹15 per minute (1500 paise)')
    .optional(),
});

export const updateAvailabilitySchema = z.object({
  availabilityStatus: z.enum(['ONLINE', 'BUSY', 'OFFLINE'], {
    errorMap: () => ({ message: 'Availability must be ONLINE, BUSY, or OFFLINE' }),
  }),
});

export const applyKycSchema = z.object({
  idType: z.enum(['AADHAAR', 'PAN', 'PASSPORT', 'VOTER_ID', 'DRIVING_LICENSE'], {
    errorMap: () => ({ message: 'Please select a valid government ID type' }),
  }),
  idNumberMasked: z
    .string()
    .trim()
    .min(4, 'Masked ID must be at least 4 characters')
    .max(25, 'Masked ID exceeds maximum allowed length'),
  documentUrl: z.string().min(1, 'Document reference or secure URL is required'),
  consentAffirmation: z.literal(true, {
    errorMap: () => ({
      message: 'You must certify that the submitted identity proofs are authentic.',
    }),
  }),
});

export const adminReviewKycSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
});
