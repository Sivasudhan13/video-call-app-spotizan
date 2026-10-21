import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket, connectSocket } from '../services/socket';
import { api } from '../services/api';

export function useWebRTC() {
  const [status, setStatus] = useState('IDLE'); // IDLE, QUEUE_WAITING, MATCHED, CONNECTING, ACTIVE, ENDED, ERROR
  const [partner, setPartner] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isInitiator, setIsInitiator] = useState(false);
  const [freePreviewSeconds, setFreePreviewSeconds] = useState(15);
  const [isFreePreview, setIsFreePreview] = useState(true);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isFreeCall, setIsFreeCall] = useState(false);
  const [maxFreeDuration, setMaxFreeDuration] = useState(120);

  // In-call real-time text chat & moderation
  const [messages, setMessages] = useState([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const [layoutMode, setLayoutMode] = useState('GRID'); // 'GRID' (both cameras equal clear 50/50) | 'PIP' (picture-in-picture)
  const [videoFitMode, setVideoFitMode] = useState('cover'); // 'cover' | 'contain' (no cropping)
  const [mainVideoSource, setMainVideoSource] = useState('remote'); // 'remote' | 'local'
  const [isLocalMirrored, setIsLocalMirrored] = useState(true);
  const [isFreeForReceiver, setIsFreeForReceiver] = useState(false);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const adminPeerConnectionsRef = useRef({});
  const timerRef = useRef(null);
  const iceServersRef = useRef([{ urls: 'stun:stun.l.google.com:19302' }]);
  const sessionIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  // Load ICE servers on mount
  useEffect(() => {
    api.get('/calls/ice-servers')
      .then((res) => {
        if (res.success && res.data?.iceServers) {
          iceServersRef.current = res.data.iceServers;
        }
      })
      .catch(() => {
        // Fallback default stun
      });
  }, []);

  // Continuous synchronization of active streams to video DOM elements across layout/view transitions
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, status, layoutMode]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, status, layoutMode]);

  const [callMode, setCallMode] = useState('VIDEO'); // 'VIDEO' | 'AUDIO'

  // Request media devices with Crystal Clear HD settings & graceful compatibility fallback
  const initLocalStream = async (mode = 'VIDEO') => {
    if (localStreamRef.current && localStreamRef.current.active) {
      setHasLocalVideo(localStreamRef.current.getVideoTracks().some((t) => t.readyState === 'live'));
      if (localVideoRef.current && mode === 'VIDEO') {
        if (localVideoRef.current.srcObject !== localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        localVideoRef.current.play().catch(() => {});
      }
      return localStreamRef.current;
    }

    try {
      let stream;
      if (mode === 'AUDIO') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } else {
        try {
          // Attempt optimal 720p/1080p stream first
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
              facingMode: 'user',
            },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } catch (hdErr) {
          console.warn('Optimal HD video constraints unavailable, falling back to standard video/audio:', hdErr);
          // Graceful fallback: basic video and audio supported by any webcam/laptop/phone
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setHasLocalVideo(true);
      if (localVideoRef.current && mode === 'VIDEO') {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      // If peer connection already initialized, attach newly acquired tracks immediately
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
        const senders = peerConnectionRef.current.getSenders();
        stream.getTracks().forEach((track) => {
          const alreadyAdded = senders.some((s) => s.track && s.track.id === track.id);
          if (!alreadyAdded) {
            try {
              peerConnectionRef.current.addTrack(track, stream);
            } catch (trackErr) {
              console.warn('Track addition notice:', trackErr);
            }
          }
        });
      }

      return stream;
    } catch (err) {
      console.error('Camera/Microphone access error:', err);
      setErrorMessage(
        mode === 'AUDIO'
          ? 'Microphone access was denied or is unavailable.'
          : 'Camera or Microphone access was denied or is unavailable. Please grant camera permission to start video call.'
      );
      setStatus('ERROR');
      throw err;
    }
  };

  // Create RTCPeerConnection and bind event handlers
  const createPeerConnection = (currentSessionId) => {
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch (e) {}
    }

    pendingCandidatesRef.current = [];

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
    });

    peerConnectionRef.current = pc;
    const socket = getSocket();

    // Add local tracks to peer connection
    const addedKinds = new Set();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStreamRef.current);
          addedKinds.add(track.kind);
        } catch (e) {
          console.warn('Track attachment note:', e);
        }
      });
    }

    // Ensure bidirectional transceivers are always configured for two-way audio/video
    if (!addedKinds.has('video')) {
      try { pc.addTransceiver('video', { direction: 'sendrecv' }); } catch (e) {}
    }
    if (!addedKinds.has('audio')) {
      try { pc.addTransceiver('audio', { direction: 'sendrecv' }); } catch (e) {}
    }

    // Handle remote track with robust track & stream binding
    pc.ontrack = (event) => {
      let stream = null;
      if (event.streams && event.streams[0]) {
        stream = event.streams[0];
      } else if (event.track) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        const existingTrack = remoteStreamRef.current.getTracks().find((t) => t.id === event.track.id);
        if (!existingTrack) {
          remoteStreamRef.current.addTrack(event.track);
        }
        stream = remoteStreamRef.current;
      }

      if (stream) {
        // Clone stream reference to force React state updates and video element refresh
        const freshStream = new MediaStream(stream.getTracks());
        remoteStreamRef.current = freshStream;
        setRemoteStream(freshStream);

        const hasVideo = freshStream.getVideoTracks().some((t) => t.readyState === 'live');
        setHasRemoteVideo(hasVideo);
        setStatus('ACTIVE'); // Remote stream established, call is active

        if (remoteVideoRef.current) {
          if (remoteVideoRef.current.srcObject !== freshStream) {
            remoteVideoRef.current.srcObject = freshStream;
          }
          remoteVideoRef.current.play().catch(() => {});
        }

        freshStream.getVideoTracks().forEach((track) => {
          track.onunmute = () => {
            setHasRemoteVideo(true);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStreamRef.current;
              remoteVideoRef.current.play().catch(() => {});
            }
          };
          track.onended = () => {
            const stillHasVideo = remoteStreamRef.current?.getVideoTracks().some((t) => t.readyState === 'live');
            setHasRemoteVideo(Boolean(stillHasVideo));
          };
        });

        event.track.onunmute = () => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
            remoteVideoRef.current.play().catch(() => {});
          }
        };
      }
    };

    // Handle local ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && event.candidate.candidate) {
        const sid = currentSessionId || sessionIdRef.current;
        if (sid) {
          socket.emit('call:signal', {
            sessionId: sid,
            signal: {
              type: 'candidate',
              candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
            },
          });
        }
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStatus('ACTIVE');
        // Ensure remote video plays upon connection state confirmation
        if (remoteVideoRef.current && remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.play().catch(() => {});
        }
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setErrorMessage('Network connection lost between video peers.');
      }
    };

    return pc;
  };

  // Join Matchmaking Queue (Caller or Receiver)
  const joinQueue = async (languages = ['English'], isFree = false, mode = 'VIDEO', queueMode = 'CALL') => {
    setErrorMessage(null);
    setStatus('QUEUE_WAITING');
    setPartner(null);
    setSessionId(null);
    setCallDurationSeconds(0);
    setFreePreviewSeconds(isFree ? 0 : 15);
    setIsFreePreview(!isFree);
    setIsFreeCall(isFree);
    setCallMode(mode);

    try {
      await initLocalStream(mode);
      const socket = connectSocket();

      socket.emit('queue:join', { languages, isFreeCall: isFree, callMode: mode, mode: queueMode });
    } catch (err) {
      // Handled in initLocalStream
    }
  };

  // Leave Matchmaking Queue
  const leaveQueue = () => {
    const socket = getSocket();
    socket.emit('queue:leave');
    setStatus('IDLE');
  };

  // End Call / Skip
  const endCall = useCallback((reason = 'USER_HUNG_UP') => {
    const socket = getSocket();
    if (sessionId) {
      socket.emit('call:end', { sessionId, reason });
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (adminPeerConnectionsRef.current) {
      Object.values(adminPeerConnectionsRef.current).forEach((pc) => {
        try { pc.close(); } catch (e) {}
      });
      adminPeerConnectionsRef.current = {};
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setStatus('ENDED');
  }, [sessionId]);

  // Skip to next match in queue
  const skipToNext = () => {
    endCall('SKIPPED');
    setTimeout(() => {
      joinQueue();
    }, 400);
  };

  // Toggle Mute Audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsAudioMuted(!track.enabled);
      });
    }
  };

  // Toggle Video Off
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsVideoDisabled(!track.enabled);
      });
    }
  };

  // Layout mode controls
  const toggleLayoutMode = () => {
    setLayoutMode((prev) => (prev === 'GRID' ? 'PIP' : 'GRID'));
  };

  const toggleVideoFit = () => {
    setVideoFitMode((prev) => (prev === 'cover' ? 'contain' : 'cover'));
  };

  const swapVideos = () => {
    setMainVideoSource((prev) => (prev === 'remote' ? 'local' : 'remote'));
  };

  const toggleMirror = () => {
    setIsLocalMirrored((prev) => !prev);
  };

  // Socket event binding
  useEffect(() => {
    const socket = connectSocket();

    // Match found event
    const handleMatchFound = async ({
      sessionId: newSessionId,
      partner: newPartner,
      isInitiator: initiator,
      freePreviewSeconds: previewSecs,
      isFreeCall: freeCall,
      isFreeForReceiver: freeReceiver,
      maxDurationSeconds: maxDur,
    }) => {
      sessionIdRef.current = newSessionId;
      setSessionId(newSessionId);
      setPartner(newPartner);
      setIsInitiator(initiator);
      setFreePreviewSeconds(previewSecs || (freeCall ? 0 : 15));
      setIsFreePreview(!freeCall && Boolean(previewSecs));
      setIsFreeCall(Boolean(freeCall));
      setIsFreeForReceiver(Boolean(freeReceiver));
      if (maxDur) setMaxFreeDuration(maxDur);
      setStatus('CONNECTING');

      // Ensure local camera is active and tracks ready before peer connection
      try {
        await initLocalStream(callMode);
      } catch (e) {}

      const pc = createPeerConnection(newSessionId);

      // If initiator, create and send WebRTC offer with explicit media receive options
      if (initiator) {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          socket.emit('call:signal', {
            sessionId: newSessionId,
            signal: { type: 'offer', sdp: offer.sdp },
          });
        } catch (err) {
          setErrorMessage('Failed to create call offer.');
        }
      }
    };

    // Signaling relay (Offer, Answer, Candidate) with candidate buffering & session recovery
    const handleCallSignal = async ({ sessionId: incomingSessionId, signal }) => {
      if (!signal) return;

      const sid = incomingSessionId || sessionIdRef.current || sessionId;
      if (incomingSessionId && !sessionIdRef.current) {
        sessionIdRef.current = incomingSessionId;
        setSessionId(incomingSessionId);
      }

      try {
        let pc = peerConnectionRef.current;

        if (signal.type === 'offer') {
          // 1. Ensure local camera tracks are ready BEFORE creating or updating peer connection
          let stream = localStreamRef.current;
          if (!stream || !stream.active) {
            try {
              stream = await initLocalStream(callMode);
            } catch (err) {}
          }

          if (!pc || pc.signalingState === 'closed') {
            pc = createPeerConnection(sid);
          }

          if (stream && pc) {
            const senders = pc.getSenders();
            stream.getTracks().forEach((track) => {
              const alreadyAdded = senders.some((s) => s.track && s.track.id === track.id);
              if (!alreadyAdded) {
                const transceivers = pc.getTransceivers ? pc.getTransceivers() : [];
                const emptyTransceiver = transceivers.find(
                  (t) => t.sender && !t.sender.track && t.receiver?.track?.kind === track.kind
                );
                if (emptyTransceiver) {
                  try {
                    emptyTransceiver.sender.replaceTrack(track);
                    emptyTransceiver.direction = 'sendrecv';
                    return;
                  } catch (e) {}
                }
                try { pc.addTrack(track, stream); } catch (e) {}
              }
            });
          }

          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));

          // Flush any early candidates buffered before remoteDescription was set
          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (candErr) {}
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('call:signal', {
            sessionId: sid,
            signal: { type: 'answer', sdp: answer.sdp },
          });
        } else if (signal.type === 'answer') {
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));

          // Flush any early candidates
          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (candErr) {}
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (!pc || !pc.remoteDescription) {
            // Buffer candidate until remote description is set
            pendingCandidatesRef.current.push(signal.candidate);
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.warn('WebRTC signaling negotiation note:', err);
      }
    };

    // Admin Observation Live Stream Request
    const handleAdminStreamRequested = async ({ adminSocketId, sessionId: reqSessionId, peerType }) => {
      if (!localStreamRef.current) return;
      try {
        const adminPc = new RTCPeerConnection({ iceServers: iceServersRef.current });
        adminPeerConnectionsRef.current[adminSocketId] = adminPc;

        localStreamRef.current.getTracks().forEach((track) => {
          adminPc.addTrack(track, localStreamRef.current);
        });

        adminPc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('admin:signal', {
              targetSocketId: adminSocketId,
              signal: { type: 'candidate', candidate: event.candidate },
              sessionId: reqSessionId || sessionId,
              peerType: peerType || (isInitiator ? 'caller' : 'receiver'),
            });
          }
        };

        const offer = await adminPc.createOffer();
        await adminPc.setLocalDescription(offer);
        socket.emit('admin:signal', {
          targetSocketId: adminSocketId,
          signal: { type: 'offer', sdp: offer.sdp },
          sessionId: reqSessionId || sessionId,
          peerType: peerType || (isInitiator ? 'caller' : 'receiver'),
        });
      } catch (err) {
        console.warn('Failed to stream video to admin inspection studio:', err);
      }
    };

    const handleAdminSignal = async ({ signal, fromSocketId }) => {
      const pc = adminPeerConnectionsRef.current[fromSocketId];
      if (!pc) return;
      try {
        if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.type === 'candidate' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        // Handled
      }
    };

    const handleCallEnded = ({ reason }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (adminPeerConnectionsRef.current) {
        Object.values(adminPeerConnectionsRef.current).forEach((pc) => {
          try { pc.close(); } catch (e) {}
        });
        adminPeerConnectionsRef.current = {};
      }
      setStatus('ENDED');
      if (reason === 'PEER_DISCONNECTED') {
        setErrorMessage('Partner disconnected from the call.');
      } else if (reason === 'FREE_LIMIT_REACHED') {
        setErrorMessage('Free 2-minute call limit reached. Thank you for using Spotizan!');
      }
    };

    // Real-time In-Call Chat Listeners
    const handleChatMessage = (msg) => {
      setMessages((prev) => [...prev, { ...msg, isMe: false }]);
    };

    const handleChatSent = (msg) => {
      setMessages((prev) => [...prev, { ...msg, isMe: true }]);
    };

    const handleChatTyping = ({ isTyping }) => {
      setIsPartnerTyping(Boolean(isTyping));
    };

    socket.on('match:found', handleMatchFound);
    socket.on('call:signal', handleCallSignal);
    socket.on('admin:stream_requested', handleAdminStreamRequested);
    socket.on('admin:signal', handleAdminSignal);
    socket.on('call:ended', handleCallEnded);
    socket.on('chat:message', handleChatMessage);
    socket.on('chat:sent', handleChatSent);
    socket.on('chat:typing', handleChatTyping);

    return () => {
      socket.off('match:found', handleMatchFound);
      socket.off('call:signal', handleCallSignal);
      socket.off('admin:stream_requested', handleAdminStreamRequested);
      socket.off('admin:signal', handleAdminSignal);
      socket.off('call:ended', handleCallEnded);
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:sent', handleChatSent);
      socket.off('chat:typing', handleChatTyping);
    };
  }, [sessionId, isInitiator]);

  // Send Chat Message
  const sendMessage = useCallback((text) => {
    if (!text || !sessionId) return;
    const socket = getSocket();
    socket.emit('chat:send', { sessionId, message: text });
  }, [sessionId]);

  // Send Typing Indicator
  const sendTyping = useCallback((isTyping) => {
    if (!sessionId) return;
    const socket = getSocket();
    socket.emit('chat:typing', { sessionId, isTyping });
  }, [sessionId]);

  // Block Partner
  const blockPartner = useCallback(async (reason = 'User requested block') => {
    const partnerId = partner?.userId || partner?._id;
    if (partnerId) {
      try {
        await api.post('/blocks', { blockedUserId: partnerId, reason });
      } catch (err) {
        // Continue to skip regardless
      }
    }
    skipToNext();
  }, [partner, skipToNext]);

  // Report Partner
  const reportPartner = useCallback(async (reason, details = '') => {
    const partnerId = partner?.userId || partner?._id;
    if (partnerId) {
      return await api.post('/reports', {
        reportedUserId: partnerId,
        reason,
        details,
        callSessionId: sessionId || undefined,
      });
    }
  }, [partner, sessionId]);

  // Duration & Free preview countdown timer when ACTIVE
  useEffect(() => {
    if (status === 'ACTIVE') {
      timerRef.current = setInterval(() => {
        setCallDurationSeconds((prev) => prev + 1);
        setFreePreviewSeconds((prev) => {
          if (prev <= 1) {
            setIsFreePreview(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Continuously ensure mounted video elements are bound to streams without delay
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  });

  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  });

  // Teardown streams on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    status,
    partner,
    sessionId,
    isInitiator,
    freePreviewSeconds,
    isFreePreview,
    isFreeCall,
    maxFreeDuration,
    callDurationSeconds,
    isAudioMuted,
    isVideoDisabled,
    callMode,
    errorMessage,
    localVideoRef,
    remoteVideoRef,
    joinQueue,
    leaveQueue,
    endCall,
    skipToNext,
    toggleAudio,
    toggleVideo,
    // Layout & Dual Camera Clarity
    layoutMode,
    setLayoutMode,
    toggleLayoutMode,
    videoFitMode,
    setVideoFitMode,
    toggleVideoFit,
    mainVideoSource,
    setMainVideoSource,
    swapVideos,
    isLocalMirrored,
    setIsLocalMirrored,
    toggleMirror,
    isFreeForReceiver,
    initLocalStream,
    localStream,
    remoteStream,
    localStreamRef,
    remoteStreamRef,
    hasRemoteVideo,
    setHasRemoteVideo,
    hasLocalVideo,
    setHasLocalVideo,
    // Chat & Moderation
    messages,
    isPartnerTyping,
    sendMessage,
    sendTyping,
    blockPartner,
    reportPartner,
  };
}
