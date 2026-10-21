import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import {
  getDashboardOverview,
  getAdminUsers,
  updateUserAccountStatus,
  getAdminReports,
  resolveAdminReport,
  getAuditLogs,
  getActiveCalls,
  terminateActiveCall,
} from '../controllers/admin.analytics.controller.js';

export const adminAnalyticsRouter = Router();

// Require authenticated ADMIN role on all admin routes
adminAnalyticsRouter.use(protect, authorize('ADMIN'));

// Real MongoDB Dashboard Aggregations
adminAnalyticsRouter.get('/dashboard/overview', getDashboardOverview);
adminAnalyticsRouter.get('/dashboard/call-analytics', getDashboardOverview);
adminAnalyticsRouter.get('/dashboard/payment-analytics', getDashboardOverview);
adminAnalyticsRouter.get('/dashboard/user-analytics', getDashboardOverview);
adminAnalyticsRouter.get('/dashboard/safety-analytics', getDashboardOverview);

// User Management
adminAnalyticsRouter.get('/users', getAdminUsers);
adminAnalyticsRouter.patch('/users/:id/status', updateUserAccountStatus);

// Safety & Reports Queue
adminAnalyticsRouter.get('/reports', getAdminReports);
adminAnalyticsRouter.patch('/reports/:id/resolve', resolveAdminReport);

// Active Call Safety Observation & Force Disconnect
adminAnalyticsRouter.get('/active-calls', getActiveCalls);
adminAnalyticsRouter.post('/calls/:sessionId/terminate', terminateActiveCall);

// Audit Trail
adminAnalyticsRouter.get('/audit-logs', getAuditLogs);

export default adminAnalyticsRouter;
