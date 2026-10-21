import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { UserBlock } from '../models/UserBlock.js';

export class MatchmakingQueue {
  constructor() {
    // Array of queue items: { socketId, userId, displayName, avatarUrl, languages, interests, joinedAt, isPremium }
    this.queue = [];
    // Map of active peer pairs: sessionId -> { caller: { socketId, userId }, receiver: { socketId, userId }, createdAt }
    this.activeSessions = new Map();
    // Map of user recent matches: userId -> Set of recent userIds (cooldown)
    this.recentMatches = new Map();
  }

  /**
   * Adds an authenticated user to the matchmaking queue.
   */
  async addToQueue(userData) {
    // 1. Prevent duplicate queue entry
    this.removeFromQueue(userData.socketId, userData.userId);

    // 2. Prevent user if currently in an active session
    if (this.isUserInActiveSession(userData.userId)) {
      throw new Error('User already has an active video call in progress.');
    }

    const queueItem = {
      ...userData,
      isPremium: Boolean(userData.isPremium),
      joinedAt: Date.now(),
    };

    // Priority insertion: if user is Premium, insert ahead of standard queue users
    if (queueItem.isPremium) {
      const firstNonPremiumIdx = this.queue.findIndex((item) => !item.isPremium);
      if (firstNonPremiumIdx === -1) {
        this.queue.push(queueItem);
      } else {
        this.queue.splice(firstNonPremiumIdx, 0, queueItem);
      }
    } else {
      this.queue.push(queueItem);
    }

    logger.info(`User ${userData.displayName} joined queue (Premium: ${queueItem.isPremium}). Queue size: ${this.queue.length}`);

    // Try finding an immediate match
    return await this.findMatch(queueItem);
  }

  /**
   * Removes user from queue by socketId or userId.
   */
  removeFromQueue(socketId, userId = null) {
    const prevLen = this.queue.length;
    this.queue = this.queue.filter(
      (item) => item.socketId !== socketId && (userId ? item.userId !== userId : true)
    );
    if (this.queue.length !== prevLen) {
      logger.info(`Removed socket ${socketId} from queue. New queue size: ${this.queue.length}`);
    }
  }

  /**
   * Searches for a compatible, eligible adult match.
   */
  async findMatch(candidate) {
    for (let i = 0; i < this.queue.length; i++) {
      const peer = this.queue[i];

      // Skip self
      if (peer.userId === candidate.userId || peer.socketId === candidate.socketId) {
        continue;
      }

      // Check anti-spam cooldown: did they match recently?
      const recentPeers = this.recentMatches.get(candidate.userId);
      if (recentPeers && recentPeers.has(peer.userId)) {
        continue;
      }

      // Check UserBlock: exclude if candidate blocked peer or peer blocked candidate
      try {
        const isBlocked = await UserBlock.exists({
          $or: [
            { blockerId: candidate.userId, blockedUserId: peer.userId },
            { blockerId: peer.userId, blockedUserId: candidate.userId },
          ],
        });
        if (isBlocked) {
          continue;
        }
      } catch (blockErr) {
        logger.warn('Error checking block status in matchmaking:', { error: blockErr.message });
      }

      // Check language overlap if preferences specified
      if (candidate.languages?.length && peer.languages?.length) {
        const hasCommonLanguage = candidate.languages.some((l) =>
          peer.languages.includes(l)
        );
        if (!hasCommonLanguage) {
          // If neither speaks a common language, prioritize others unless queue is small
          if (this.queue.length > 3) continue;
        }
      }

      // Matched! Remove both from queue
      this.removeFromQueue(candidate.socketId, candidate.userId);
      this.removeFromQueue(peer.socketId, peer.userId);

      // Record recent match cooldown (expires after 2 minutes)
      this.recordMatchCooldown(candidate.userId, peer.userId);

      const sessionId = crypto.randomUUID();

      const session = {
        sessionId,
        caller: candidate,
        receiver: peer,
        createdAt: Date.now(),
      };

      this.activeSessions.set(sessionId, session);
      logger.info(`Match created [${sessionId}]: ${candidate.displayName} <-> ${peer.displayName}`);

      return session;
    }

    return null;
  }

  recordMatchCooldown(userId1, userId2) {
    if (!this.recentMatches.has(userId1)) this.recentMatches.set(userId1, new Set());
    if (!this.recentMatches.has(userId2)) this.recentMatches.set(userId2, new Set());

    this.recentMatches.get(userId1).add(userId2);
    this.recentMatches.get(userId2).add(userId1);

    // Auto-clear cooldown after 2 minutes
    setTimeout(() => {
      this.recentMatches.get(userId1)?.delete(userId2);
      this.recentMatches.get(userId2)?.delete(userId1);
    }, 120000);
  }

  isUserInActiveSession(userId) {
    for (const session of this.activeSessions.values()) {
      if (session.caller.userId === userId || session.receiver.userId === userId) {
        return true;
      }
    }
    return false;
  }

  getSession(sessionId) {
    return this.activeSessions.get(sessionId) || null;
  }

  endSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.activeSessions.delete(sessionId);
      logger.info(`Session ended [${sessionId}]`);
    }
    return session;
  }

  handleDisconnect(socketId) {
    // 1. Remove from queue if waiting
    this.removeFromQueue(socketId);

    // 2. Check if part of any active session
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.caller.socketId === socketId || session.receiver.socketId === socketId) {
        this.activeSessions.delete(sessionId);
        const partner =
          session.caller.socketId === socketId ? session.receiver : session.caller;
        return {
          sessionId,
          partnerSocketId: partner.socketId,
          disconnectedUserId:
            session.caller.socketId === socketId ? session.caller.userId : session.receiver.userId,
        };
      }
    }
    return null;
  }
}

export const matchmakingQueue = new MatchmakingQueue();
