import { env } from './env.js';

/**
 * Returns dynamic WebRTC ICE servers configuration.
 * TURN credentials remain server-side and are dispatched via authenticated sessions only.
 */
export function getIceServersConfig() {
  const iceServers = [
    {
      urls: [
        process.env.STUN_SERVER_URL || 'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
      ],
    },
  ];

  // If TURN configuration is supplied in environment
  if (process.env.TURN_SERVER_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({
      urls: process.env.TURN_SERVER_URL,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }

  return iceServers;
}
