import { User } from '../models/User.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { CallSession } from '../models/CallSession.js';
import { LedgerEntry } from '../models/LedgerEntry.js';
import { PayoutRequest } from '../models/PayoutRequest.js';
import { UserReport } from '../models/UserReport.js';
import { AuditLog } from '../models/AuditLog.js';
import { AppError } from '../middlewares/errorHandler.js';
import { getIO } from '../realtime/socketServer.js';
import { WalletService } from '../services/wallet.service.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/admin/dashboard/overview
 * Real MongoDB aggregation of platform metrics with zero fabricated numbers.
 */
export async function getDashboardOverview(req, res, next) {
  try {
    const [
      totalUsers,
      verifiedAdultUsers,
      approvedCreators,
      pendingVerifications,
      activeCalls,
      completedCalls,
      freeCallsConsumed,
      paidCallsCompleted,
      openReports,
      suspendedUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isAdult: true }),
      CreatorProfile.countDocuments({ isVerified: true }),
      CreatorProfile.countDocuments({ verificationStatus: 'PENDING' }),
      CallSession.countDocuments({ status: { $in: ['CONNECTING', 'ACTIVE'] } }),
      CallSession.countDocuments({ status: 'COMPLETED' }),
      CallSession.countDocuments({ isFreeCall: true, status: 'COMPLETED' }),
      CallSession.countDocuments({ isFreeCall: false, status: 'COMPLETED' }),
      UserReport.countDocuments({ status: 'PENDING' }),
      User.countDocuments({ status: { $in: ['SUSPENDED', 'BANNED'] } }),
    ]);

    // Financial Aggregations
    const grossPaymentAgg = await LedgerEntry.aggregate([
      { $match: { type: 'CREDIT_PURCHASE' } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]);
    const grossPaymentVolumePaise = grossPaymentAgg[0]?.total || 0;

    const commissionAgg = await LedgerEntry.aggregate([
      { $match: { type: 'DEBIT_CALL_SETTLEMENT' } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]);
    const platformRevenuePaise = commissionAgg[0]?.total ? Math.floor(commissionAgg[0].total * 0.3) : 0;

    const pendingPayoutAgg = await PayoutRequest.aggregate([
      { $match: { status: 'PENDING' } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]);
    const pendingPayoutsPaise = pendingPayoutAgg[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        verifiedAdultUsers,
        approvedCreators,
        pendingVerifications,
        activeCalls,
        completedCalls,
        freeCallsConsumed,
        paidCallsCompleted,
        openReports,
        suspendedUsers,
        grossPaymentVolumePaise,
        grossPaymentVolumeINR: (grossPaymentVolumePaise / 100).toFixed(2),
        platformRevenuePaise,
        platformRevenueINR: (platformRevenuePaise / 100).toFixed(2),
        pendingPayoutsPaise,
        pendingPayoutsINR: (pendingPayoutsPaise / 100).toFixed(2),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/users
 * Real paginated users list with search & status filters.
 */
export async function getAdminUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const search = req.query.search?.trim();
    const role = req.query.role;
    const status = req.query.status;

    const query = {};
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { aadhaarNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-password'),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/users/:id/status
 * Suspend, reinstate or ban user account with audit logging.
 */
export async function updateUserAccountStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
      throw new AppError('Invalid account status value.', 400, 'INVALID_STATUS');
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    await AuditLog.create({
      adminId: req.user._id,
      action: `USER_STATUS_${status}`,
      targetType: 'USER',
      targetId: id,
      details: { previousStatus: user.status, newStatus: status, reason: reason || 'Moderation action' },
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}.`,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/reports
 * Real safety reports queue with reviewer actions.
 */
export async function getAdminReports(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const status = req.query.status || 'PENDING';

    const query = status ? { status } : {};

    const [reports, total] = await Promise.all([
      UserReport.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('reporterId', 'displayName email')
        .populate('reportedUserId', 'displayName email status'),
      UserReport.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/reports/:id/resolve
 * Mark a report as resolved or dismissed with notes.
 */
export async function resolveAdminReport(req, res, next) {
  try {
    const { id } = req.params;
    const { resolution = 'RESOLVED', notes } = req.body;

    const report = await UserReport.findByIdAndUpdate(
      id,
      {
        $set: {
          status: resolution === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED',
          moderatorNotes: notes || '',
        },
      },
      { new: true }
    );

    if (!report) {
      throw new AppError('Report not found.', 404, 'NOT_FOUND');
    }

    await AuditLog.create({
      adminId: req.user._id,
      action: `REPORT_${resolution}`,
      targetType: 'REPORT',
      targetId: id,
      details: { resolution, notes },
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      message: 'Report status updated.',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/audit-logs
 * List audit trail entries.
 */
export async function getAuditLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('adminId', 'displayName email'),
      AuditLog.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/active-calls
 * Returns all currently live/active WebRTC call sessions from MongoDB.
 */
export async function getActiveCalls(req, res, next) {
  try {
    const activeCalls = await CallSession.find({
      status: { $in: ['CONNECTING', 'ACTIVE', 'RINGING'] },
    })
      .sort({ startedAt: -1 })
      .populate('callerId', 'displayName email avatarUrl gender role status')
      .populate('receiverId', 'displayName email avatarUrl gender role status')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        activeCalls,
        count: activeCalls.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/calls/:sessionId/terminate
 * Admin safety measure: force terminate/disconnect an active video call immediately.
 */
export async function terminateActiveCall(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { reason = 'SAFETY_TERMINATED', actionType = 'DISCONNECT' } = req.body;

    const session = await CallSession.findOne({ sessionId });
    if (!session) {
      throw new AppError('Call session not found.', 404, 'NOT_FOUND');
    }

    session.status = 'COMPLETED';
    session.endedAt = new Date();
    session.endReason = 'SAFETY_TERMINATED';
    if (session.connectedAt) {
      session.durationSeconds = Math.max(
        0,
        Math.floor((session.endedAt.getTime() - session.connectedAt.getTime()) / 1000)
      );
    }
    await session.save();

    // Broadcast immediate termination to peer sockets
    const io = getIO();
    if (io) {
      io.to(sessionId).emit('call:ended', {
        sessionId,
        reason: 'SAFETY_INTERVENTION',
        message: 'This video call was terminated by platform administration for safety compliance.',
      });
    }

    // Settle call if needed
    try {
      await WalletService.settleCallSession({
        callSessionId: sessionId,
        durationSeconds: session.durationSeconds || 0,
        ratePerMinutePaise: session.isFreeCall ? 0 : (session.ratePerMinutePaise || 700),
      });
    } catch (settleErr) {
      logger.warn('Failed to settle terminated call:', { error: settleErr.message, sessionId });
    }

    // Audit Log
    await AuditLog.create({
      adminId: req.user._id,
      action: 'ADMIN_FORCE_DISCONNECT_CALL',
      targetType: 'CALL_SESSION',
      targetId: session._id,
      details: {
        sessionId,
        reason,
        actionType,
        callerId: session.callerId,
        receiverId: session.receiverId,
      },
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(200).json({
      success: true,
      message: 'Active video call terminated immediately by safety administrator.',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
}
