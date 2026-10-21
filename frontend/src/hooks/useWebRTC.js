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

  const [callMode, setCallMode] = useState('VIDEO'); // 'VIDEO' | 'AUDIO'

  // Request media devices with Crystal Clear HD settings
  const initLocalStream = async (mode = 'VIDEO') => {
    if (localStreamRef.current) {
      if (localVideoRef.current && mode === 'VIDEO') {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      return localStreamRef.current;
    }

    try {
      const constraints =
        mode === 'AUDIO'
          ? { video: false, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
          : {
              video: {
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                frameRate: { ideal: 30, max: 60 },
                facingMode: 'user',
              },
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      localStreamRef.current = stream;
      setLocalStream(stream);
      setHasLocalVideo(true);
      if (localVideoRef.current && mode === 'VIDEO') {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      return stream;
    } catch (err) {
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
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
    });

    peerConnectionRef.current = pc;
    const socket = getSocket();

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote track
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
        setHasRemoteVideo(true);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(() => {});
        }
        stream.getVideoTracks().forEach((track) => {
          track.onunmute = () => setHasRemoteVideo(true);
          track.onmute = () => setHasRemoteVideo(false);
          track.onended = () => setHasRemoteVideo(false);
        });
      }
    };

    // Handle local ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:signal', {
          sessionId: currentSessionId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStatus('ACTIVE');
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
      setSessionId(newSessionId);
      setPartner(newPartner);
      setIsInitiator(initiator);
      setFreePreviewSeconds(previewSecs || (freeCall ? 0 : 15));
      setIsFreePreview(!freeCall && Boolean(previewSecs));
      setIsFreeCall(Boolean(freeCall));
      setIsFreeForReceiver(Boolean(freeReceiver));
      if (maxDur) setMaxFreeDuration(maxDur);
      setStatus('CONNECTING');

      const pc = createPeerConnection(newSessionId);

      // If initiator, create and send WebRTC offer
      if (initiator) {
        try {
          const offer = await pc.createOffer();
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

    // Signaling relay (Offer, Answer, Candidate)
    const handleCallSignal = async ({ signal }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('call:signal', {
            sessionId,
            signal: { type: 'answer', sdp: answer.sdp },
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
        } else if (signal.type === 'candidate' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        // Handle race conditions during ICE negotiation
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
    hasRemoteVideo,
    hasLocalVideo,
    // Chat & Moderation
    messages,
    isPartnerTyping,
    sendMessage,
    sendTyping,
    blockPartner,
    reportPartner,
  };
}
