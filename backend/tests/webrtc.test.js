import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'http';
import { io as Client } from 'socket.io-client';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { CallSession } from '../src/models/CallSession.js';
import { initializeSocketServer } from '../src/realtime/socketServer.js';
import { generateToken } from '../src/utils/token.js';

describe('Spotizan Phase 4: WebRTC Signaling, Matchmaking Queue & Video Calls', () => {
  let server, port, ioServer;
  let user1, user2, underageUser;
  let token1, token2, underageToken;
  let client1, client2;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: { $regex: /@webrtc-test\.com$/ } });
    await CallSession.deleteMany({});

    // Create Eligible Adult 1
    user1 = await User.create({
      displayName: 'Alice Adult',
      email: 'alice@webrtc-test.com',
      password: 'SecurePassword123!',
      role: 'CUSTOMER',
      dateOfBirth: new Date('2000-01-01'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
    token1 = generateToken(user1);

    // Create Eligible Adult 2
    user2 = await User.create({
      displayName: 'Bob Adult',
      email: 'bob@webrtc-test.com',
      password: 'SecurePassword123!',
      role: 'CUSTOMER',
      dateOfBirth: new Date('1998-05-10'),
      isAdult: true,
      ageAffirmation: { affirmed: true },
    });
    token2 = generateToken(user2);

    // Create Underage User
    underageUser = await User.create({
      displayName: 'Underage Kid',
      email: 'underage@webrtc-test.com',
      password: 'SecurePassword123!',
      role: 'CUSTOMER',
      dateOfBirth: new Date('2014-01-01'),
      isAdult: false,
      ageAffirmation: { affirmed: false },
    });
    underageToken = generateToken(underageUser);

    // Spin up test HTTP and Socket.IO server on random available port
    server = http.createServer(app);
    ioServer = initializeSocketServer(server);

    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();

    if (ioServer) {
      await new Promise((resolve) => ioServer.close(resolve));
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    await User.deleteMany({ email: { $regex: /@webrtc-test\.com$/ } });
    await CallSession.deleteMany({});
    await disconnectDB();
  });

  it('GET /api/calls/ice-servers should return ICE servers for authenticated adult', async () => {
    const res = await request(app)
      .get('/api/calls/ice-servers')
      .set('Cookie', [`spotizan_token=${token1}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.iceServers)).toBe(true);
    expect(res.body.data.iceServers[0].urls.length).toBeGreaterThan(0);
  });

  it('GET /api/calls/ice-servers should REJECT unauthenticated client with 401', async () => {
    const res = await request(app).get('/api/calls/ice-servers');
    expect(res.status).toBe(401);
  });

  it('Socket.IO should REJECT connection without authentication token', async () => {
    await new Promise((resolve) => {
      const socket = Client(`http://localhost:${port}`, {
        transports: ['websocket'],
      });

      socket.on('connect_error', (err) => {
        expect(err.message).toContain('Authentication required');
        socket.disconnect();
        resolve();
      });
    });
  });

  it('Socket.IO should REJECT connection for underage accounts', async () => {
    await new Promise((resolve) => {
      const socket = Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: { token: underageToken },
      });

      socket.on('connect_error', (err) => {
        expect(err.message).toContain('Strict 18+ age verification required');
        socket.disconnect();
        resolve();
      });
    });
  });

  let matchedSessionId = null;

  it('Socket.IO should pair two eligible adults and exchange WebRTC signaling', async () => {
    client1 = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: token1 },
    });

    client2 = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: token2 },
    });

    // Wait for both to connect
    await Promise.all([
      new Promise((res) => client1.on('connect', res)),
      new Promise((res) => client2.on('connect', res)),
    ]);

    // Join queue and wait for match:found
    const matchPromise = new Promise((resolve) => {
      let match1 = null;
      let match2 = null;

      client1.on('match:found', (data) => {
        match1 = data;
        if (match1 && match2) resolve({ match1, match2 });
      });

      client2.on('match:found', (data) => {
        match2 = data;
        if (match1 && match2) resolve({ match1, match2 });
      });

      // Join queue
      client1.emit('queue:join', { languages: ['English'] });
      client2.emit('queue:join', { languages: ['English'] });
    });

    const { match1, match2 } = await matchPromise;

    expect(match1.sessionId).toBe(match2.sessionId);
    expect(match1.isInitiator).not.toBe(match2.isInitiator);
    expect(match1.freePreviewSeconds).toBe(15);
    matchedSessionId = match1.sessionId;

    // Verify session persisted in MongoDB
    const sessionDoc = await CallSession.findOne({ sessionId: matchedSessionId });
    expect(sessionDoc).not.toBeNull();
    expect(sessionDoc.status).toBe('CONNECTING');

    // Test WebRTC signal relay
    const signalPromise = new Promise((resolve) => {
      client2.on('call:signal', (payload) => {
        expect(payload.sessionId).toBe(matchedSessionId);
        expect(payload.signal.type).toBe('offer');
        expect(payload.signal.sdp).toBe('mock_offer_sdp');
        resolve();
      });

      // Client 1 sends offer
      client1.emit('call:signal', {
        sessionId: matchedSessionId,
        signal: { type: 'offer', sdp: 'mock_offer_sdp' },
      });
    });

    await signalPromise;

    // Test Call Termination
    const endPromise = new Promise((resolve) => {
      let partnerHeard = false;
      let ackReceived = false;

      const maybeDone = () => {
        if (partnerHeard && ackReceived) resolve();
      };

      client2.on('call:ended', (payload) => {
        expect(payload.sessionId).toBe(matchedSessionId);
        expect(payload.reason).toBe('USER_HUNG_UP');
        partnerHeard = true;
        maybeDone();
      });

      client1.emit(
        'call:end',
        {
          sessionId: matchedSessionId,
          reason: 'USER_HUNG_UP',
        },
        () => {
          ackReceived = true;
          maybeDone();
        }
      );
    });

    await endPromise;

    // Check DB status is COMPLETED
    const updatedSession = await CallSession.findOne({ sessionId: matchedSessionId });
    expect(updatedSession.status).toBe('COMPLETED');
    expect(updatedSession.endReason).toBe('USER_HUNG_UP');
  });
});
