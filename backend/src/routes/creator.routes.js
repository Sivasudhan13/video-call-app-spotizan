import { Router } from 'express';
import {
  getMyCreatorProfile,
  updateMyCreatorProfile,
  updateMyAvailability,
  applyKycVerification,
  listCreators,
  getCreatorById,
  adminGetVerificationQueue,
  adminReviewCreator,
} from '../controllers/creator.controller.js';
import { protect, authorize, requireAdult } from '../middlewares/auth.js';

export const creatorRouter = Router();
export const adminRouter = Router();

// Creator & Application routes
creatorRouter.get('/', listCreators);
creatorRouter.get('/me', protect, authorize('CREATOR'), getMyCreatorProfile);
creatorRouter.put('/me', protect, authorize('CREATOR'), updateMyCreatorProfile);
creatorRouter.patch('/me/availability', protect, authorize('CREATOR'), updateMyAvailability);
creatorRouter.get('/me/application-status', protect, requireAdult, async (req, res, next) => {
  try {
    const profile = await (await import('../models/CreatorProfile.js')).CreatorProfile.findOne({ userId: req.user._id });
    const lastVerification = await (await import('../models/VerificationRecord.js')).VerificationRecord.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: {
        isCreator: req.user.role === 'CREATOR',
        verificationStatus: profile?.verificationStatus || (lastVerification ? lastVerification.status : 'NOT_SUBMITTED'),
        rejectionReason: profile?.rejectionReason || lastVerification?.reviewNotes || '',
        profile: profile || null,
        record: lastVerification || null,
      },
    });
  } catch (err) {
    next(err);
  }
});
creatorRouter.post('/apply-verification', protect, requireAdult, applyKycVerification);
creatorRouter.post('/me/kyc', protect, requireAdult, applyKycVerification);
creatorRouter.get('/:id', getCreatorById);

// Admin verification management routes
adminRouter.get('/verification-queue', protect, authorize('ADMIN'), adminGetVerificationQueue);
adminRouter.patch('/verify-creator/:creatorId', protect, authorize('ADMIN'), adminReviewCreator);
