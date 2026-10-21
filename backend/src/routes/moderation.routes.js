import { Router } from 'express';
import {
  blockUser,
  unblockUser,
  getMyBlocks,
  reportUser,
  adminGetReports,
} from '../controllers/moderation.controller.js';
import { protect, authorize } from '../middlewares/auth.js';

export const moderationRouter = Router();

// User blocking
moderationRouter.post('/blocks', protect, blockUser);
moderationRouter.get('/blocks', protect, getMyBlocks);
moderationRouter.delete('/blocks/:id', protect, unblockUser);

// User reporting
moderationRouter.post('/reports', protect, reportUser);

// Admin review
moderationRouter.get('/admin/reports', protect, authorize('ADMIN'), adminGetReports);
