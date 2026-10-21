import { Server } from 'socket.io';
import { verifyToken, COOKIE_NAME } from '../utils/token.js';
import { User } from '../models/User.js';
import { CallSession } from '../models/CallSession.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { FreeCallService } from '../services/freeCall.service.js';
import { matchmakingQueue } from './matchmakingQueue.js';
import { WalletService } from '../services/wallet.service.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

let ioInstance = null;

export function getIO() {
  return ioInstance;
}

export function initializeSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || origin === env.CLIENT_URL || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.vercel.app')) {
          callback(null, true);
        } else {
          callback(new Error(`Socket CORS blocked origin: ${origin}`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  ioInstance = io;

  // Authentication Middleware for Sockets
  io.use(async (socket, next) => {
    try {
      let token = null;

      // 1. Handshake auth token
      if (socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
      }
      // 2. Cookie header parsing
      else if (socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie
          .split(';')
          .reduce((acc, cookie) => {
            const [k, v] = cookie.trim().split('=');
            if (k && v) acc[k] = decodeURIComponent(v);
            return acc;
          }, {});
        token = cookies[COOKIE_NAME];
      }

      if (!token) {
        return next(new Error('Authentication required for real-time video services.'));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('User account not found.'));
      }

      if (!user.isAdult) {
        return next(new Error('Strict 18+ age verification required to access live calls.'));
      }

      if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
        return next(new Error('Account is restricted. Access denied.'));
      }

      socket.user = {
        _id: user._id.toString(),
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || '',
        role: user.role,
        gender: user.gender || 'FEMALE',
        isAdult: user.isAdult,
        isPremium: Boolean(user.isPremium),
        subscriptionTier: user.subscriptionTier || 'FREE',
        languages: user.languages || ['English', 'Hindi'],
      };

      next();
    } catch (err) {
      logger.error('Socket authentication failed:', { error: err.message });
      next(new Error('Invalid authentication session.'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.user.displayName}, Gender: ${socket.user.gender})`);

    // 1. Join Random Matchmaking Queue (Caller or Receiver)
    socket.on('queue:join', async (payload = {}) => {
      try {
        const preferences = {
          languages: payload.languages || socket.user.languages,
          interests: payload.interests || [],
        };

        const mode = payload.mode || (socket.user.gender === 'FEMALE' ? 'RECEIVE' : 'CALL');

        const match = await matchmakingQueue.addToQueue({
          socketId: socket.id,
          userId: socket.user._id,
          displayName: socket.user.displayName,
          avatarUrl: socket.user.avatarUrl,
          gender: socket.user.gender,
          mode: mode,
          languages: preferences.languages,
          interests: preferences.interests,
          isPremium: socket.user.isPremium,
        });

        if (match) {
          const isFreeCall = Boolean(payload.isFreeCall);
          if (isFreeCall) {
            try {
              await FreeCallService.consumeFreeCall(match.caller.userId);
            } catch (err) {
              logger.warn('Free call consumption notice:', { error: err.message });
            }
          }

          // Persist CallSession in MongoDB
          const sessionDoc = await CallSession.create({
            sessionId: match.sessionId,
            callerId: match.caller.userId,
            receiverId: match.receiver.userId,
            callType: 'RANDOM_QUEUE',
            status: 'CONNECTING',
            startedAt: new Date(),
            connectedAt: new Date(),
            freePreviewDurationSeconds: isFreeCall ? 0 : 15,
            isFreePreview: !isFreeCall,
            isFreeCall: isFreeCall,
            maxFreeCallDurationSeconds: isFreeCall ? 120 : 0,
            ratePerMinutePaise: isFreeCall ? 0 : 700, // Free call bills ₹0
          });

          // Join socket rooms
          io.sockets.sockets.get(match.caller.socketId)?.join(match.sessionId);
          io.sockets.sockets.get(match.receiver.socketId)?.join(match.sessionId);

          // Inform Caller (Initiator)
          io.to(match.caller.socketId).emit('match:found', {
            sessionId: match.sessionId,
            isInitiator: true,
            partner: {
              userId: match.receiver.userId,
              displayName: match.receiver.displayName,
              avatarUrl: match.receiver.avatarUrl,
              gender: match.receiver.gender,
              languages: match.receiver.languages,
            },
            isFreeCall: isFreeCall,
            isFreeForReceiver: false,
            maxDurationSeconds: isFreeCall ? 120 : null,
            ratePerMinutePaise: isFreeCall ? 0 : 700,
            freePreviewSeconds: isFreeCall ? 0 : 15,
          });

          // Inform Receiver (Girl receives the call 100% FREE with 0 charge)
          const isGirlReceiver = match.receiver.gender === 'FEMALE' || match.isFreeForReceiver;
          io.to(match.receiver.socketId).emit('match:found', {
            sessionId: match.sessionId,
            isInitiator: false,
            partner: {
              userId: match.caller.userId,
              displayName: match.caller.displayName,
              avatarUrl: match.caller.avatarUrl,
              gender: match.caller.gender,
              languages: match.caller.languages,
            },
            isFreeCall: isGirlReceiver ? true : isFreeCall,
            isFreeForReceiver: isGirlReceiver,
            maxDurationSeconds: isFreeCall ? 120 : null,
            ratePerMinutePaise: isGirlReceiver ? 0 : (isFreeCall ? 0 : 700),
            freePreviewSeconds: isFreeCall ? 0 : 15,
          });

          // If receiver is listening in the female "Receive Calls" section, also send call:incoming ring
          io.to(match.receiver.socketId).emit('call:incoming', {
            sessionId: match.sessionId,
            caller: {
              userId: match.caller.userId,
              displayName: match.caller.displayName,
              avatarUrl: match.caller.avatarUrl,
              gender: match.caller.gender,
              languages: match.caller.languages,
            },
            ratePerMinutePaise: isGirlReceiver ? 0 : 700,
            isFreeForReceiver: true,
          });

          // Server-enforced 120s limit for free calls
          if (isFreeCall) {
            setTimeout(async () => {
              const activeSession = await CallSession.findOne({
                sessionId: match.sessionId,
                status: { $ne: 'COMPLETED' },
              });
              if (activeSession) {
                logger.info(`Free call 120s limit reached for session ${match.sessionId}. Disconnecting peers.`);
                io.to(match.sessionId).emit('call:ended', {
                  sessionId: match.sessionId,
                  reason: 'FREE_LIMIT_REACHED',
                });
                activeSession.status = 'COMPLETED';
                activeSession.endedAt = new Date();
                activeSession.endReason = 'TIMEOUT';
                activeSession.durationSeconds = 120;
                await activeSession.save();
                try {
                  await WalletService.settleCallSession({
                    callSessionId: match.sessionId,
                    durationSeconds: 120,
                    ratePerMinutePaise: 0,
                  });
                } catch (settleErr) {
                  logger.warn('Auto-settle free call error:', { error: settleErr.message });
                }
              }
            }, 122000); // 120s + 2s grace
          }
        } else {
          socket.emit('queue:waiting', {
            message: 'Searching for compatible 18+ adult match...',
          });
        }
      } catch (err) {
        socket.emit('queue:error', { message: err.message });
      }
    });

    // 2. Leave Queue
    socket.on('queue:leave', () => {
      matchmakingQueue.removeFromQueue(socket.id, socket.user._id);
      socket.emit('queue:left');
    });

    // 3. WebRTC Signaling Relay (Offer, Answer, ICE Candidate)
    socket.on('call:signal', ({ sessionId, signal }) => {
      const session = matchmakingQueue.getSession(sessionId);
      if (!session) {
        return socket.emit('call:error', {
          code: 'SESSION_NOT_FOUND',
          message: 'Active call session expired or not found.',
        });
      }

      // Security check: Only session participants can send signals
      const isCaller = session.caller.socketId === socket.id;
      const isReceiver = session.receiver.socketId === socket.id;

      if (!isCaller && !isReceiver) {
        return socket.emit('call:error', {
          code: 'UNAUTHORIZED_SIGNAL',
          message: 'You are not an authorized participant in this session.',
        });
      }

      const targetSocketId = isCaller ? session.receiver.socketId : session.caller.socketId;

      io.to(targetSocketId).emit('call:signal', {
        sessionId,
        signal,
      });
    });

    // 4. In-Call Real-Time Text Chat Relay
    socket.on('chat:send', async ({ sessionId, message, translation }) => {
      if (!message || typeof message !== 'string' || !message.trim()) return;
      const session = matchmakingQueue.getSession(sessionId);
      if (!session) return;

      const isCaller = session.caller.socketId === socket.id;
      const isReceiver = session.receiver.socketId === socket.id;
      if (!isCaller && !isReceiver) return;

      const partnerSocketId = isCaller ? session.receiver.socketId : session.caller.socketId;

      const payload = {
        sessionId,
        senderId: socket.user._id,
        senderName: socket.user.displayName,
        message: message.trim().slice(0, 1000),
        translation: translation || null,
        timestamp: new Date().toISOString(),
      };

      io.to(partnerSocketId).emit('chat:message', payload);
      socket.emit('chat:sent', payload);

      // Async write to MongoDB with 24-hour auto-expiry TTL
      try {
        await ChatMessage.create({
          callSessionId: sessionId,
          senderId: socket.user._id,
          senderName: socket.user.displayName,
          message: payload.message,
          translation: payload.translation,
        });
      } catch (err) {
        logger.warn('Failed to persist chat message:', { error: err.message });
      }
    });

    socket.on('chat:typing', ({ sessionId, isTyping }) => {
      const session = matchmakingQueue.getSession(sessionId);
      if (!session) return;
      const isCaller = session.caller.socketId === socket.id;
      const isReceiver = session.receiver.socketId === socket.id;
      if (!isCaller && !isReceiver) return;

      const partnerSocketId = isCaller ? session.receiver.socketId : session.caller.socketId;
      io.to(partnerSocketId).emit('chat:typing', {
        senderId: socket.user._id,
        isTyping: Boolean(isTyping),
      });
    });

    // 5. Terminate Call / Skip
    socket.on('call:end', async ({ sessionId, reason = 'USER_HUNG_UP' }, callback) => {
      const session = matchmakingQueue.endSession(sessionId);
      if (session) {
        const partnerSocketId =
          session.caller.socketId === socket.id
            ? session.receiver.socketId
            : session.caller.socketId;

        io.to(partnerSocketId).emit('call:ended', {
          sessionId,
          reason,
        });
        socket.emit('call:ended', {
          sessionId,
          reason,
        });
        io.to(`inspect_${sessionId}`).emit('call:ended', {
          sessionId,
          reason,
        });

        // Update DB session record
        const sessionDoc = await CallSession.findOne({ sessionId });
        if (sessionDoc && sessionDoc.status !== 'COMPLETED') {
          sessionDoc.status = 'COMPLETED';
          sessionDoc.endedAt = new Date();
          sessionDoc.endReason = reason === 'SKIPPED' ? 'SKIPPED' : 'USER_HUNG_UP';
          if (sessionDoc.connectedAt) {
            sessionDoc.durationSeconds = Math.max(
              0,
              Math.floor((sessionDoc.endedAt.getTime() - sessionDoc.connectedAt.getTime()) / 1000)
            );
          }
          await sessionDoc.save();

          try {
            await WalletService.settleCallSession({
              callSessionId: sessionId,
              durationSeconds: sessionDoc.durationSeconds,
              ratePerMinutePaise: sessionDoc.ratePerMinutePaise || 700,
              freePreviewSeconds: sessionDoc.freePreviewDurationSeconds || 15,
            });
          } catch (settleErr) {
            logger.warn('Auto-settle error in call:end:', { error: settleErr.message, sessionId });
          }
        }
      }
      if (typeof callback === 'function') {
        callback({ success: true, sessionId });
      }
    });

    // 6. Admin Live Video Call Show Observation & Real-Time Monitoring
    socket.on('admin:join_inspect', ({ sessionId }) => {
      if (socket.user?.role !== 'ADMIN') return;
      socket.join(sessionId);
      socket.join(`inspect_${sessionId}`);
      logger.info(`Admin [${socket.user.displayName}] joined session [${sessionId}] to view live video call show.`);

      const session = matchmakingQueue.getSession(sessionId);
      if (session) {
        // Notify admin about participants
        socket.emit('admin:session_info', {
          sessionId,
          caller: {
            userId: session.caller.userId,
            displayName: session.caller.displayName,
            avatarUrl: session.caller.avatarUrl,
            gender: session.caller.gender,
            socketId: session.caller.socketId,
          },
          receiver: {
            userId: session.receiver.userId,
            displayName: session.receiver.displayName,
            avatarUrl: session.receiver.avatarUrl,
            gender: session.receiver.gender,
            socketId: session.receiver.socketId,
          },
        });

        // Request live camera streams from both peers to show on admin screen
        io.to(session.caller.socketId).emit('admin:stream_requested', {
          adminSocketId: socket.id,
          sessionId,
          peerType: 'caller',
        });
        io.to(session.receiver.socketId).emit('admin:stream_requested', {
          adminSocketId: socket.id,
          sessionId,
          peerType: 'receiver',
        });
      } else {
        socket.emit('admin:session_not_found', { sessionId });
      }
    });

    // WebRTC Signaling Relay between Admin and Call Participants (for live camera show)
    socket.on('admin:signal', ({ targetSocketId, signal, sessionId, peerType }) => {
      if (!targetSocketId || !signal) return;
      io.to(targetSocketId).emit('admin:signal', {
        fromSocketId: socket.id,
        signal,
        sessionId,
        peerType,
      });
    });

    socket.on('admin:leave_inspect', ({ sessionId }) => {
      socket.leave(sessionId);
      socket.leave(`inspect_${sessionId}`);
      logger.info(`Admin [${socket.user.displayName}] stopped viewing session [${sessionId}].`);
    });

    // 7. Admin Direct Disconnect / Force Terminate Call
    socket.on('admin:force_disconnect', async ({ sessionId, reason = 'SAFETY_TERMINATED' }) => {
      if (socket.user?.role !== 'ADMIN') return;
      logger.warn(`Admin [${socket.user.displayName}] force disconnected call session [${sessionId}]. Reason: ${reason}`);

      io.to(sessionId).emit('call:ended', {
        sessionId,
        reason: 'SAFETY_INTERVENTION',
        message: 'This call was immediately terminated by platform moderation for safety compliance.',
      });

      matchmakingQueue.endSession(sessionId);

      const sessionDoc = await CallSession.findOne({ sessionId });
      if (sessionDoc && sessionDoc.status !== 'COMPLETED') {
        sessionDoc.status = 'COMPLETED';
        sessionDoc.endedAt = new Date();
        sessionDoc.endReason = 'SAFETY_TERMINATED';
        if (sessionDoc.connectedAt) {
          sessionDoc.durationSeconds = Math.max(
            0,
            Math.floor((sessionDoc.endedAt.getTime() - sessionDoc.connectedAt.getTime()) / 1000)
          );
        }
        await sessionDoc.save();

        try {
          await WalletService.settleCallSession({
            callSessionId: sessionId,
            durationSeconds: sessionDoc.durationSeconds,
            ratePerMinutePaise: sessionDoc.ratePerMinutePaise || 700,
            freePreviewSeconds: sessionDoc.freePreviewDurationSeconds || 15,
          });
        } catch (settleErr) {
          logger.warn('Auto-settle error in admin force disconnect:', { error: settleErr.message, sessionId });
        }
      }
    });

    // 8. Disconnect Cleanup
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      const cleanupResult = matchmakingQueue.handleDisconnect(socket.id);

      if (cleanupResult) {
        const { sessionId, partnerSocketId } = cleanupResult;
        io.to(partnerSocketId).emit('call:ended', {
          sessionId,
          reason: 'PEER_DISCONNECTED',
        });
        io.to(`inspect_${sessionId}`).emit('call:ended', {
          sessionId,
          reason: 'PEER_DISCONNECTED',
        });

        const sessionDoc = await CallSession.findOne({ sessionId });
        if (sessionDoc && sessionDoc.status !== 'COMPLETED') {
          sessionDoc.status = 'COMPLETED';
          sessionDoc.endedAt = new Date();
          sessionDoc.endReason = 'PEER_DISCONNECTED';
          if (sessionDoc.connectedAt) {
            sessionDoc.durationSeconds = Math.max(
              0,
              Math.floor((sessionDoc.endedAt.getTime() - sessionDoc.connectedAt.getTime()) / 1000)
            );
          }
          await sessionDoc.save();

          try {
            await WalletService.settleCallSession({
              callSessionId: sessionId,
              durationSeconds: sessionDoc.durationSeconds,
              ratePerMinutePaise: sessionDoc.ratePerMinutePaise || 700,
              freePreviewSeconds: sessionDoc.freePreviewDurationSeconds || 15,
            });
          } catch (settleErr) {
            logger.warn('Auto-settle error in disconnect:', { error: settleErr.message, sessionId });
          }
        }
      }
    });
  });

  return io;
}
