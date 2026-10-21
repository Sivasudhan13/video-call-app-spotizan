import { UserBlock } from '../models/UserBlock.js';
import { UserReport } from '../models/UserReport.js';
import { AppError } from '../middlewares/errorHandler.js';

export async function blockUser(req, res, next) {
  try {
    const { blockedUserId, reason } = req.body;
    if (!blockedUserId) {
      throw new AppError('blockedUserId is required', 400, 'MISSING_FIELD');
    }

    if (req.user._id.toString() === blockedUserId.toString()) {
      throw new AppError('You cannot block yourself.', 400, 'SELF_BLOCK_NOT_ALLOWED');
    }

    const block = await UserBlock.findOneAndUpdate(
      { blockerId: req.user._id, blockedUserId },
      { blockerId: req.user._id, blockedUserId, reason: reason || 'User blocked' },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message: 'User blocked successfully. They will not be matched with you again.',
      data: block,
    });
  } catch (err) {
    next(err);
  }
}

export async function unblockUser(req, res, next) {
  try {
    const { id } = req.params;
    await UserBlock.findOneAndDelete({
      _id: id,
      blockerId: req.user._id,
    });

    res.json({
      success: true,
      message: 'User unblocked successfully.',
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyBlocks(req, res, next) {
  try {
    const blocks = await UserBlock.find({ blockerId: req.user._id })
      .populate('blockedUserId', 'displayName email avatarUrl')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { blocks },
    });
  } catch (err) {
    next(err);
  }
}

export async function reportUser(req, res, next) {
  try {
    const { reportedUserId, callSessionId, reason, details } = req.body;

    if (!reportedUserId || !reason) {
      throw new AppError('reportedUserId and reason are required', 400, 'MISSING_FIELDS');
    }

    const report = await UserReport.create({
      reporterId: req.user._id,
      reportedUserId,
      callSessionId,
      reason,
      details: details || '',
      status: 'PENDING',
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our trust and safety team will review it.',
      data: report,
    });
  } catch (err) {
    next(err);
  }
}

export async function adminGetReports(req, res, next) {
  try {
    const reports = await UserReport.find()
      .populate('reporterId', 'displayName email')
      .populate('reportedUserId', 'displayName email status')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: { reports },
    });
  } catch (err) {
    next(err);
  }
}
