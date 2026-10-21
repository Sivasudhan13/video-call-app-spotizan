import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import { creatorRouter, adminRouter } from './routes/creator.routes.js';
import callRoutes from './routes/call.routes.js';
import { walletRouter, adminWalletRouter } from './routes/wallet.routes.js';
import { paymentRouter } from './routes/payment.routes.js';
import { subscriptionRouter } from './routes/subscription.routes.js';
import { moderationRouter } from './routes/moderation.routes.js';
import { adminAnalyticsRouter } from './routes/admin.analytics.routes.js';

export const app = express();

// Security HTTP headers
app.use(helmet());

// CORS Configuration with credentials
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or same-origin in development)
      if (
        !origin ||
        origin === env.CLIENT_URL ||
        origin === 'http://localhost:5173' ||
        origin === 'http://127.0.0.1:5173' ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked request from origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body and Cookie Parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// Global Rate Limiting
const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP. Please try again later.',
    },
  },
});
app.use('/api', generalLimiter);

// Request Logger
app.use(requestLogger);

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/creators', creatorRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', adminWalletRouter);
app.use('/api/admin', adminAnalyticsRouter);
app.use('/api/v1/admin', adminAnalyticsRouter);
app.use('/api/calls', callRoutes);
app.use('/api/wallet', walletRouter);
app.use('/api', paymentRouter);
app.use('/api/subscriptions', subscriptionRouter);
app.use('/api', moderationRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    service: 'Spotizan API',
    description: '18+ Random Video Call & Creator Earning Marketplace',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);
