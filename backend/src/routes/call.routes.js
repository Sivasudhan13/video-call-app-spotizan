import { Router } from 'express';
import { getIceServersConfig } from '../config/webrtc.js';
import { CallSession } from '../models/CallSession.js';
import { protect, requireAdult } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { FreeCallService } from '../services/freeCall.service.js';

const router = Router();

/**
 * GET /api/calls/ice-servers
 * Supplies authenticated adult clients with valid ICE servers for RTCPeerConnection.
 */
router.get('/ice-servers', protect, requireAdult, (req, res) => {
  const iceServers = getIceServersConfig();
  res.status(200).json({
    success: true,
    data: { iceServers },
  });
});

/**
 * GET /api/calls/free-call/status
 * Returns current free call eligibility, cooldown timer, and remaining seconds.
 */
router.get('/free-call/status', protect, requireAdult, async (req, res, next) => {
  try {
    const status = await FreeCallService.getFreeCallStatus(req.user._id);
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/calls/free-call/claim
 * Atomically reserves a free call claim for 5 minutes prior to matching.
 */
router.post('/free-call/claim', protect, requireAdult, async (req, res, next) => {
  try {
    const claim = await FreeCallService.reserveFreeCall(req.user._id);
    res.status(200).json({
      success: true,
      data: claim,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/calls/session/:sessionId
 * Retrieves authenticated session details.
 */
router.get('/session/:sessionId', protect, async (req, res, next) => {
  try {
    const session = await CallSession.findOne({
      sessionId: req.params.sessionId,
    });

    if (!session) {
      return next(new AppError('Call session not found.', 404, 'NOT_FOUND'));
    }

    // Verify requesting user was a participant in this call
    const isParticipant =
      session.callerId.equals(req.user._id) || session.receiverId.equals(req.user._id);

    if (!isParticipant && req.user.role !== 'ADMIN') {
      return next(
        new AppError('Unauthorized access to session details.', 403, 'FORBIDDEN')
      );
    }

    res.status(200).json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/calls/history
 * Retrieves genuine call history for the authenticated user from MongoDB.
 */
router.get('/history', protect, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ callerId: req.user._id }, { receiverId: req.user._id }],
    };

    const [totalCalls, calls] = await Promise.all([
      CallSession.countDocuments(filter),
      CallSession.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('callerId', 'displayName avatarUrl role gender')
        .populate('receiverId', 'displayName avatarUrl role gender')
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        calls,
        pagination: {
          page,
          limit,
          total: totalCalls,
          totalPages: Math.ceil(totalCalls / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
