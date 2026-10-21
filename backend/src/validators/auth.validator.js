import { z } from 'zod';

export const registerSchema = z.object({
  displayName: z
    .string({ required_error: 'Display name is required' })
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(40, 'Display name cannot exceed 40 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
  gender: z.enum(['FEMALE', 'MALE', 'OTHER']).optional(),
  genderPreference: z.enum(['ANY', 'FEMALE', 'MALE']).optional(),
  role: z.enum(['CUSTOMER', 'CREATOR']).optional(),
  phoneNumber: z.string().trim().optional(),
  aadhaarNumber: z.string().trim().optional(),
  dateOfBirth: z.string({ required_error: 'Date of birth is required' }).refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid Date of Birth format. Please use YYYY-MM-DD.' }
  ),
  ageAffirmation: z.literal(true, {
    errorMap: () => ({
      message:
        'You must legally certify under penalty of perjury that you are at least 18 years old.',
    }),
  }),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export const verifyAgeSchema = z.object({
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid Date of Birth format. Please use YYYY-MM-DD.',
  }),
  legalDeclaration: z.literal(true, {
    errorMap: () => ({
      message:
        'You must affirm the statutory declaration under penalty of perjury.',
    }),
  }),
});
