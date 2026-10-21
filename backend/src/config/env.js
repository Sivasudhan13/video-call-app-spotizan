import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/spotizan_dev'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(200),
  JWT_SECRET: z.string().default('dev_jwt_secret_spotizan_18plus_secure_key_12345'),
  COOKIE_SECRET: z.string().default('dev_cookie_secret_spotizan_platform_12345'),
  RAZORPAY_KEY_ID: z.string().default('rzp_test_spotizan_key_123'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_test_spotizan_secret_abc456'),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  PLATFORM_COMMISSION_PERCENT: z.coerce.number().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('Invalid environment variables schema:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
