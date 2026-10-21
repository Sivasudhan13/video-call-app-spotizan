import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { api } from '../services/api';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  SkipForward,
  RotateCw,
  Sparkles,
  ShieldAlert,
  Coins,
  Clock,
  User,
  Heart,
  Wallet,
  MessageSquare,
  Send,
  X,
  Flag,
  CheckCircle2,
  Gift,
  LayoutGrid,
  Layers,
  Maximize2,
  Minimize2,
  Repeat,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

export function QueuePage() {
  const { user } = useAuth();
  const { wallet, openWalletModal } = useWallet();
  const {
    status,
    partner,
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
    // Dual Camera Controls
    layoutMode,
    toggleLayoutMode,
    videoFitMode,
    toggleVideoFit,
    isLocalMirrored,
    toggleMirror,
    mainVideoSource,
    swapVideos,
    isFreeForReceiver,
    hasRemoteVideo,
    setHasRemoteVideo,
    hasLocalVideo,
    setHasLocalVideo,
    localStream,
    remoteStream,
    localStreamRef,
    remoteStreamRef,
    messages,
    isPartnerTyping,
    sendMessage,
    sendTyping,
    blockPartner,
    reportPartner,
  } = useWebRTC();

  const [searchParams] = useSearchParams();

  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedCallMode, setSelectedCallMode] = useState('VIDEO'); // 'VIDEO' | 'AUDIO'
  const [cameraConsent, setCameraConsent] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('INAPPROPRIATE_BEHAVIOR');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const [freeCallInfo, setFreeCallInfo] = useState(null);
  const [countdownText, setCountdownText] = useState('');

  // Handle auto-join from URL parameter (e.g. from /receive-calls or direct call acceptance)
  useEffect(() => {
    if (searchParams.get('autoJoin') === 'true' || searchParams.get('mode') === 'receive') {
      const mode = user?.gender === 'FEMALE' ? 'RECEIVE' : 'CALL';
      joinQueue(['English', 'Hindi'], false, 'VIDEO', mode);
    }
  }, [searchParams, user]);

  // Fetch free call eligibility & handle live countdown
  useEffect(() => {
    let intervalId;

    const fetchStatus = async () => {
      try {
        const res = await api.get('/calls/free-call/status');
        if (res.success && res.data) {
          setFreeCallInfo(res.data);

          if (!res.data.eligible && res.data.nextEligibleAt) {
            const targetTime = new Date(res.data.nextEligibleAt).getTime();

            const updateCountdown = () => {
              const diffMs = targetTime - Date.now();
              if (diffMs <= 0) {
                setCountdownText('');
                fetchStatus();
                return;
              }
              const totalSecs = Math.floor(diffMs / 1000);
              const hrs = Math.floor(totalSecs / 3600);
              const mins = Math.floor((totalSecs % 3600) / 60);
              const secs = totalSecs % 60;
              setCountdownText(
                `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
              );
            };

            updateCountdown();
            intervalId = setInterval(updateCountdown, 1000);
          }
        }
      } catch (err) {
        // Ignored if user not logged in or endpoint unavailable
      }
    };

    fetchStatus();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status]);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isCallActive = status === 'CONNECTING' || status === 'ACTIVE';

  // Continuous synchronization of active media streams to video DOM elements across layout/view transitions
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, status, layoutMode, mainVideoSource]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, status, layoutMode, mainVideoSource]);

  return (
    <div className="flex-1 flex flex-col bg-[#05070D] text-white relative overflow-hidden">
      {/* Active Call Mode */}
      {isCallActive ? (
        <div className="relative w-full h-[calc(100vh-4rem)] flex items-center justify-center bg-black">
          {/* Active Stream: Voice Call Pulse vs Dual Video Split / Grid Mode */}
          {callMode === 'AUDIO' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-[#181136] to-slate-950 p-6 text-center z-10">
              <div className="relative mb-6">
                <div className="w-40 h-40 rounded-full bg-[#7960D8]/20 animate-ping absolute inset-0" />
                <div className="w-40 h-40 rounded-full bg-[#7960D8]/40 animate-pulse absolute inset-0" />
                <div className="w-40 h-40 rounded-full bg-[#7960D8] border-4 border-white/20 flex items-center justify-center text-5xl font-black text-white shadow-2xl relative z-10">
                  {partner?.displayName?.charAt(0).toUpperCase() || 'P'}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">{partner?.displayName || 'Matched Partner'}</h3>
              <p className="text-xs text-emerald-400 font-mono mt-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Voice Call in Progress • Microphone Active
              </p>
              <div className="flex items-center gap-2 mt-5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-slate-300 text-xs border border-white/10">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Use the message button below to chat in real time</span>
              </div>
            </div>
          ) : layoutMode === 'GRID' ? (
            /* DUAL CAMERA GRID (50/50 CLEAR SPLIT SCREEN - BOTH CAMERAS FULLY VISIBLE) */
            <div className="w-full h-full p-3 sm:p-5 pt-20 pb-28 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center max-w-7xl mx-auto">
              {/* Partner's Camera Pane */}
              <div className="relative w-full h-full min-h-[260px] sm:min-h-[380px] bg-slate-900/90 rounded-3xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl flex items-center justify-center group">
                <video
                  ref={(el) => {
                    remoteVideoRef.current = el;
                    if (el) {
                      const stream = remoteStreamRef?.current || remoteStream;
                      if (stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                      }
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                  onPlaying={() => setHasRemoteVideo(true)}
                  onLoadedData={() => setHasRemoteVideo(true)}
                  className={`w-full h-full ${videoFitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
                />
                {/* Fallback only if remote video hasn't rendered tracks yet */}
                {!hasRemoteVideo && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 pointer-events-none z-10">
                    <div className="w-20 h-20 rounded-2xl bg-indigo-950/90 border border-indigo-700/60 flex items-center justify-center text-3xl font-extrabold text-indigo-300 shadow-2xl mb-3">
                      {partner?.displayName?.charAt(0).toUpperCase() || 'P'}
                    </div>
                    <h3 className="text-base font-bold text-white">{partner?.displayName || 'Matched Adult Peer'}</h3>
                    <p className="text-xs text-indigo-300 animate-pulse mt-1">Establishing encrypted WebRTC P2P stream...</p>
                  </div>
                )}

                {/* Partner Header Tag */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
                  <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 pointer-events-auto">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                      {partner?.displayName?.charAt(0).toUpperCase() || 'P'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">{partner?.displayName || 'Partner'}</span>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Live 1080p Crystal Clear
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <button
                      onClick={toggleVideoFit}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white border border-white/10 text-[11px] font-semibold flex items-center gap-1 backdrop-blur-md transition-colors"
                      title="Toggle Camera Fit (No Cropping)"
                    >
                      {videoFitMode === 'contain' ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{videoFitMode === 'contain' ? 'Fill' : 'Fit'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Your Camera Pane */}
              <div className="relative w-full h-full min-h-[260px] sm:min-h-[380px] bg-slate-900/90 rounded-3xl overflow-hidden border-2 border-purple-500/40 shadow-2xl flex items-center justify-center group">
                <video
                  ref={(el) => {
                    localVideoRef.current = el;
                    if (el) {
                      const stream = localStreamRef?.current || localStream;
                      if (stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                      }
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                  className={`w-full h-full ${isLocalMirrored ? 'scale-x-[-1] ' : ''}${videoFitMode === 'contain' ? 'object-contain' : 'object-cover'} ${isVideoDisabled ? 'hidden' : ''}`}
                />
                {isVideoDisabled && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs gap-2">
                    <VideoOff className="w-10 h-10 text-slate-500" />
                    <span className="font-semibold text-slate-300">Your Camera is Paused</span>
                    <p className="text-[11px] text-slate-500">Click video button below to turn camera on</p>
                  </div>
                )}

                {/* Your Camera Header Tag */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
                  <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 pointer-events-auto">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-xs">
                      {user?.displayName?.charAt(0).toUpperCase() || 'Y'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">You (Your Camera)</span>
                      <span className="text-[10px] text-purple-300 flex items-center gap-1 font-mono">
                        <Camera className="w-3 h-3 text-emerald-400" />
                        {isVideoDisabled ? 'Camera Disabled' : 'HD Camera Active'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <button
                      onClick={toggleMirror}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white border border-white/10 text-[11px] font-semibold flex items-center gap-1 backdrop-blur-md transition-colors"
                      title="Toggle Camera Selfie Mirror"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{isLocalMirrored ? 'Mirrored' : 'Normal'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* PICTURE-IN-PICTURE (PiP) MODE */
            <>
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                {mainVideoSource === 'remote' ? (
                  <video
                    ref={(el) => {
                      remoteVideoRef.current = el;
                      if (el) {
                        const stream = remoteStreamRef?.current || remoteStream;
                        if (stream && el.srcObject !== stream) {
                          el.srcObject = stream;
                        }
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                    onPlaying={() => setHasRemoteVideo(true)}
                    onLoadedData={() => setHasRemoteVideo(true)}
                    className={`w-full h-full ${videoFitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
                  />
                ) : (
                  <video
                    ref={(el) => {
                      localVideoRef.current = el;
                      if (el) {
                        const stream = localStreamRef?.current || localStream;
                        if (stream && el.srcObject !== stream) {
                          el.srcObject = stream;
                        }
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                    onPlaying={() => setHasLocalVideo?.(true)}
                    className={`w-full h-full ${isLocalMirrored ? 'scale-x-[-1] ' : ''}${videoFitMode === 'contain' ? 'object-contain' : 'object-cover'} ${isVideoDisabled ? 'hidden' : ''}`}
                  />
                )}
                {/* Fallback only if remote video hasn't rendered tracks yet */}
                {!hasRemoteVideo && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 pointer-events-none z-10">
                    <div className="w-24 h-24 rounded-3xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-3xl font-extrabold text-indigo-300 shadow-2xl mb-4">
                      {partner?.displayName?.charAt(0).toUpperCase() || 'P'}
                    </div>
                    <h3 className="text-xl font-bold text-white">{partner?.displayName || 'Matched Adult Peer'}</h3>
                    <p className="text-xs text-indigo-300 animate-pulse mt-1">
                      Establishing encrypted WebRTC P2P stream...
                    </p>
                  </div>
                )}
              </div>

              {/* Local / Inset Video PiP */}
              <div className="absolute bottom-24 right-4 z-20 w-44 sm:w-60 aspect-[3/4] sm:aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-2xl">
                {mainVideoSource === 'remote' ? (
                  <>
                    <video
                      ref={(el) => {
                        localVideoRef.current = el;
                        if (el) {
                          const stream = localStreamRef?.current || localStream;
                          if (stream && el.srcObject !== stream) {
                            el.srcObject = stream;
                          }
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isLocalMirrored ? 'scale-x-[-1]' : ''} ${isVideoDisabled ? 'hidden' : ''}`}
                    />
                    {isVideoDisabled && (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs gap-1">
                        <VideoOff className="w-6 h-6 text-slate-500" />
                        <span>Camera Off</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] bg-black/70 px-2 py-0.5 rounded text-white font-medium">
                      <span>You</span>
                      <button onClick={swapVideos} className="hover:text-indigo-400 flex items-center gap-1 font-bold">
                        <Repeat className="w-3 h-3" /> Swap View
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <video
                      ref={(el) => {
                        remoteVideoRef.current = el;
                        if (el) {
                          const stream = remoteStreamRef?.current || remoteStream;
                          if (stream && el.srcObject !== stream) {
                            el.srcObject = stream;
                          }
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                      onPlaying={() => setHasRemoteVideo(true)}
                      onLoadedData={() => setHasRemoteVideo(true)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] bg-black/70 px-2 py-0.5 rounded text-white font-medium">
                      <span>{partner?.displayName || 'Partner'}</span>
                      <button onClick={swapVideos} className="hover:text-indigo-400 flex items-center gap-1 font-bold">
                        <Repeat className="w-3 h-3" /> Swap View
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Top Status & Free Preview Overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
            {/* Left: Partner info */}
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 pointer-events-auto">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {partner?.displayName?.charAt(0).toUpperCase() || 'P'}
              </div>
              <div>
                <span className="text-xs font-bold text-white block">{partner?.displayName || 'Anonymous Peer'}</span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live {callMode === 'AUDIO' ? 'Voice' : 'Video'} Call ({formatTimer(callDurationSeconds)})
                </span>
              </div>
            </div>

            {/* Center: Dual Camera Layout Quick Switcher (only in Video mode) */}
            {callMode !== 'AUDIO' && (
              <div className="hidden sm:flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/10 pointer-events-auto">
                <button
                  onClick={() => layoutMode !== 'GRID' && toggleLayoutMode()}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    layoutMode === 'GRID'
                      ? 'bg-[#7960D8] text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Dual Camera Split Screen (Both cameras clear)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Dual Cameras (50/50)</span>
                </button>
                <button
                  onClick={() => layoutMode !== 'PIP' && toggleLayoutMode()}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    layoutMode === 'PIP'
                      ? 'bg-[#7960D8] text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Picture-in-Picture View"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Picture-in-Picture</span>
                </button>
              </div>
            )}

            {/* Right: Transparent Billing / Free Call / Girl Free Call Badge */}
            <div className="pointer-events-auto">
              {(user?.gender === 'FEMALE' || isFreeForReceiver) ? (
                <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600/95 to-teal-600/95 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-2xl text-xs text-white shadow-lg font-bold">
                  <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
                  <span>
                    100% Free Call For You • Zero Cost (Earn 70% Share)
                  </span>
                </div>
              ) : isFreeCall ? (
                <div className="flex items-center gap-2 bg-[#FF6347]/95 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-2xl text-xs text-white shadow-tomato font-bold">
                  <Gift className="w-4 h-4 animate-bounce" />
                  <span>
                    Free Call Active: <strong className="font-mono text-white">{Math.max(0, (maxFreeDuration || 120) - callDurationSeconds)}s</strong> left
                  </span>
                </div>
              ) : isFreePreview ? (
                <div className="flex items-center gap-2 bg-purple-950/80 backdrop-blur-md border border-purple-700/80 px-3.5 py-1.5 rounded-2xl text-xs text-purple-200 shadow-glow-purple">
                  <Clock className="w-4 h-4 text-purple-300 animate-spin" />
                  <span>
                    Free Preview: <strong className="text-white font-mono">{freePreviewSeconds}s</strong>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700 px-3 py-1.5 rounded-2xl text-xs text-slate-300">
                  <Coins className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Billed Rate: ₹7.00/min (700 paise)</span>
                </div>
              )}
            </div>
          </div>

          {/* Floating Call Action Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 sm:gap-2.5 bg-slate-950/90 backdrop-blur-xl px-4 sm:px-5 py-3 rounded-full border border-slate-800 shadow-2xl">
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`p-3 sm:p-3.5 rounded-full transition-all ${
                isAudioMuted
                  ? 'bg-rose-600/80 text-white hover:bg-rose-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              className={`p-3 sm:p-3.5 rounded-full transition-all ${
                isVideoDisabled
                  ? 'bg-rose-600/80 text-white hover:bg-rose-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            {/* Layout Mode Toggle (Split Dual Camera vs PiP) */}
            {callMode !== 'AUDIO' && (
              <button
                onClick={toggleLayoutMode}
                className={`p-3 sm:p-3.5 rounded-full transition-all ${
                  layoutMode === 'GRID'
                    ? 'bg-[#7960D8] text-white shadow-lg shadow-[#7960D8]/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={layoutMode === 'GRID' ? 'Switch to Picture-in-Picture View' : 'Switch to Dual Camera Split View (Both Cameras Clear)'}
              >
                {layoutMode === 'GRID' ? <LayoutGrid className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
              </button>
            )}

            {/* Camera Fit Toggle (No Crop Fit vs Fill) */}
            {callMode !== 'AUDIO' && (
              <button
                onClick={toggleVideoFit}
                className="p-3 sm:p-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
                title={videoFitMode === 'contain' ? 'Fill Video Frame' : 'Fit Entire Camera (No Cropping)'}
              >
                {videoFitMode === 'contain' ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
              </button>
            )}

            {/* Chat Toggle Button */}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`p-3 sm:p-3.5 rounded-full transition-all relative ${
                chatOpen
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Toggle Live Text Chat"
            >
              <MessageSquare className="w-5 h-5" />
              {messages.length > 0 && !chatOpen && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-slate-950" />
              )}
            </button>

            {/* Report / Safety Button */}
            <button
              onClick={() => {
                setReportSuccess(false);
                setReportModalOpen(true);
              }}
              className="p-3 sm:p-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-400 transition-all"
              title="Report or Block Participant"
            >
              <ShieldAlert className="w-5 h-5" />
            </button>

            {/* Skip to Next */}
            <button
              onClick={skipToNext}
              className="p-3 sm:p-3.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 px-4 font-semibold text-xs"
              title="Skip to next adult match"
            >
              <SkipForward className="w-5 h-5" />
              <span className="hidden sm:inline">Next</span>
            </button>

            {/* End Call */}
            <button
              onClick={() => endCall('USER_HUNG_UP')}
              className="p-3 sm:p-3.5 rounded-full bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30"
              title="Hang Up and Leave Call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>

          {/* Slide-in Live Text Chat Drawer */}
          {chatOpen && (
            <div className="absolute top-0 right-0 w-80 sm:w-96 h-full bg-[#080D1A]/95 backdrop-blur-2xl border-l border-slate-800 z-30 flex flex-col shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-bold text-white">Live In-Call Chat</span>
                  <Badge variant="adult" className="text-[9px] py-0">24H TTL</Badge>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-500 py-12">
                    <p>No messages exchanged yet.</p>
                    <p className="text-[11px] text-slate-600 mt-1">Send a message to your live partner.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-slate-500 mb-0.5 px-1">
                        {msg.isMe ? 'You' : partner?.displayName || 'Peer'}
                      </div>
                      <div
                        className={`px-3 py-2 rounded-2xl max-w-[85%] break-words ${
                          msg.isMe
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
                {isPartnerTyping && (
                  <div className="text-[11px] text-indigo-400 italic">
                    {partner?.displayName || 'Partner'} is typing...
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatInput.trim()) {
                    sendMessage(chatInput.trim());
                    setChatInput('');
                    sendTyping(false);
                  }
                }}
                className="p-3 border-t border-slate-800 flex items-center gap-2 bg-slate-900/60"
              >
                <input
                  type="text"
                  placeholder="Type a safe message..."
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    sendTyping(e.target.value.length > 0);
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* In-Call Report & Block Modal */}
          {reportModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-[#0B101D] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 text-left shadow-2xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-950 border border-rose-800 text-rose-400">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Trust & Safety Actions</h3>
                      <p className="text-xs text-slate-400">Manage interaction with this participant</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReportModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {reportSuccess ? (
                  <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Report submitted. Our moderation team will review this session.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Report Violation Reason
                      </label>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
                      >
                        <option value="INAPPROPRIATE_BEHAVIOR">Inappropriate Behavior / Nudity</option>
                        <option value="HARASSMENT">Harassment / Bullying</option>
                        <option value="UNDERAGE_SUSPICION">Suspected Underage (Under 18)</option>
                        <option value="SPAM_SCAM">Spam, Fraud or Commercial Selling</option>
                        <option value="OTHER">Other Violation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Additional Details (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={reportDetails}
                        onChange={(e) => setReportDetails(e.target.value)}
                        placeholder="Describe the issue..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
                      />
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1"
                        icon={Flag}
                        onClick={async () => {
                          await reportPartner(reportReason, reportDetails);
                          setReportSuccess(true);
                          setTimeout(() => setReportModalOpen(false), 1500);
                        }}
                      >
                        Submit Report
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-rose-800/60 text-rose-300 hover:bg-rose-950/50"
                        onClick={async () => {
                          await blockPartner(reportReason);
                          setReportModalOpen(false);
                        }}
                      >
                        Block & Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Waiting / Idle Queue Screen */
        <div className="max-w-xl mx-auto px-4 py-12 space-y-8 flex-1 flex flex-col justify-center text-center bg-white text-[#27243A]">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F1EDFF] border border-[#E8E4F0] mb-3">
              <Badge variant="adult">18+ RESTRICTED</Badge>
              <span className="text-xs text-[#7960D8] font-bold">Instant Random Queue</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#27243A] tracking-tight">
              Random 1-on-1 Video Chat
            </h1>
            <p className="text-xs sm:text-sm text-[#777387] mt-2 leading-relaxed">
              {user?.gender === 'FEMALE'
                ? '100% Free video calling and receiving for female users with zero wallet deduction. You earn 70% revenue share on all received calls.'
                : 'Match 1-on-1 with compatible, verified adults across India. Includes a 15-second free preview guarantee before the promotional ₹7/min billing rate starts.'}
            </p>
          </div>

          {errorMessage && (
            <Alert type="error" title="Session Message">
              {errorMessage}
            </Alert>
          )}

          {status === 'QUEUE_WAITING' ? (
            /* Radar Sonar Searching Animation */
            <Card className="p-8 space-y-6 border-[#7960D8]/40 relative overflow-hidden bg-[#F1EDFF] shadow-soft">
              <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                {/* Expanding sonar waves */}
                <div className="absolute inset-0 rounded-full border border-[#7960D8]/30 animate-ping duration-1000" />
                <div className="absolute inset-4 rounded-full border border-[#B9A7F5]/40 animate-pulse duration-700" />
                <div className="absolute inset-8 rounded-full bg-white border border-[#B9A7F5]/60 shadow-sm" />

                <div className="relative z-10 w-20 h-20 rounded-full bg-[#7960D8] flex items-center justify-center shadow-md text-white">
                  <Sparkles className="w-8 h-8 animate-spin duration-3000" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#27243A]">Searching for an Available Match...</h3>
                <p className="text-xs text-[#777387]">
                  Filtering for adult participants who speak {selectedLanguage}.
                </p>
              </div>

              <Button
                variant="outline"
                size="md"
                onClick={leaveQueue}
                className="mx-auto text-xs"
              >
                Cancel & Exit Queue
              </Button>
            </Card>
          ) : (
            /* Queue Entry Configuration */
            <Card className="p-6 md:p-8 space-y-6 text-left border-[#E8E4F0] bg-white shadow-card">
              <div className="space-y-4">
                {/* Call Type: Video vs Voice Call */}
                <div>
                  <label className="block text-xs font-bold text-[#27243A] mb-1.5">
                    Select Call Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedCallMode('VIDEO')}
                      className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                        selectedCallMode === 'VIDEO'
                          ? 'border-[#7960D8] bg-[#F1EDFF] shadow-sm'
                          : 'border-[#E8E4F0] bg-white hover:border-[#B9A7F5]'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${selectedCallMode === 'VIDEO' ? 'bg-[#7960D8] text-white' : 'bg-[#F1EDFF] text-[#7960D8]'}`}>
                        <Video className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-[#27243A]">Video Call</div>
                        <div className="text-[10px] text-[#777387]">Camera & Audio</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCallMode('AUDIO')}
                      className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                        selectedCallMode === 'AUDIO'
                          ? 'border-[#7960D8] bg-[#F1EDFF] shadow-sm'
                          : 'border-[#E8E4F0] bg-white hover:border-[#B9A7F5]'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${selectedCallMode === 'AUDIO' ? 'bg-[#7960D8] text-white' : 'bg-[#F1EDFF] text-[#7960D8]'}`}>
                        <Mic className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-[#27243A]">Voice Call</div>
                        <div className="text-[10px] text-[#777387]">Audio only, no camera</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#27243A] mb-1.5">
                    Preferred Language for Matching
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] text-xs text-[#27243A] font-medium focus:outline-none focus:border-[#7960D8]"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Punjabi">Punjabi</option>
                    <option value="Bengali">Bengali</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Marathi">Marathi</option>
                  </select>
                </div>

                {/* Consent & Permissions notice */}
                <div className="p-3.5 rounded-xl bg-[#F1EDFF]/60 border border-[#E8E4F0] space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="cameraConsent"
                      checked={cameraConsent}
                      onChange={(e) => setCameraConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded bg-white border-[#E8E4F0] text-[#FF6347] cursor-pointer"
                    />
                    <label htmlFor="cameraConsent" className="text-xs text-[#777387] cursor-pointer leading-relaxed">
                      {selectedCallMode === 'AUDIO'
                        ? 'I consent to activating my microphone for live P2P WebRTC voice calling. I declare that I am 18+ and will respect consensual boundaries.'
                        : 'I consent to activating my camera and microphone for live P2P WebRTC video calling. I declare that I am 18+ and will respect consensual boundaries.'}
                    </label>
                  </div>
                </div>

                {/* For Female Users: 100% Free Status Banner & Link to Earnings */}
                {user?.gender === 'FEMALE' ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-[#F1EDFF] border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-800 text-sm">100% FREE FOR FEMALE USERS</span>
                        <Badge variant="verified">ZERO CHARGES</Badge>
                      </div>
                      <p className="text-[11px] text-[#777387]">
                        Female users never pay for any calls. You receive calls free and earn 70% revenue share.
                      </p>
                    </div>
                    <Link to="/earnings" className="shrink-0">
                      <Button variant="secondary" size="sm" className="font-bold border border-emerald-400 text-emerald-700 hover:bg-emerald-100">
                        My Earnings →
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Wallet Balance & Rate Status for Male/Customer Callers */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex items-center justify-between text-xs text-[#777387] bg-[#F1EDFF] p-3 rounded-xl border border-[#E8E4F0]">
                        <span className="flex items-center gap-1.5 text-[#FF6347] font-bold">
                          <Coins className="w-4 h-4" /> Rate:
                        </span>
                        <span className="text-[#27243A] font-mono font-bold">₹7.00 / min</span>
                      </div>

                      <button
                        type="button"
                        onClick={openWalletModal}
                        className="flex items-center justify-between text-xs bg-[#F1EDFF] hover:bg-[#e6deff] p-3 rounded-xl border border-[#E8E4F0] hover:border-[#B9A7F5] transition-colors cursor-pointer group"
                      >
                        <span className="flex items-center gap-1.5 text-[#777387] font-semibold">
                          <Wallet className="w-4 h-4 text-[#FF6347]" /> Balance:
                        </span>
                        <span className="text-[#27243A] font-mono font-bold">
                          ₹{(wallet.balancePaise / 100).toFixed(2)}
                        </span>
                      </button>
                    </div>

                    {wallet.balancePaise < 700 && (
                      <div className="p-3 rounded-xl bg-[#FFF0EC] border border-[#FFC7BD] flex items-center justify-between text-xs">
                        <span className="text-[#D92D20] font-medium">
                          Low balance: ₹{(wallet.balancePaise / 100).toFixed(2)} (₹7 min recommended)
                        </span>
                        <button
                          type="button"
                          onClick={openWalletModal}
                          className="px-2.5 py-1 rounded-lg bg-[#FF6347] hover:bg-[#e85338] text-white font-bold text-[11px] transition-colors shadow-sm"
                        >
                          Top Up Now
                        </button>
                      </div>
                    )}

                    {/* Free Call Promo Banner (Togilo-inspired 6-hour rule) */}
                    {freeCallInfo?.eligible ? (
                      <div className="p-4 rounded-xl bg-[#FFF0EC] border border-[#FF6347]/40 space-y-2">
                        <div className="flex items-center gap-2">
                          <Gift className="w-5 h-5 text-[#FF6347]" />
                          <span className="text-xs font-bold text-[#27243A]">
                            🎁 Free 2-Minute {selectedCallMode === 'AUDIO' ? 'Voice' : 'Video'} Call Available!
                          </span>
                          <Badge variant="adult">1 FREE CALL / 6 HOURS</Badge>
                        </div>
                        <p className="text-[11px] text-[#777387]">
                          You are eligible for one complimentary 2-minute call right now. No wallet balance or credit deduction required.
                        </p>
                        <Button
                          variant="primary"
                          size="md"
                          disabled={!cameraConsent}
                          onClick={() => joinQueue([selectedLanguage], true, selectedCallMode)}
                          className="w-full shadow-tomato font-bold py-2.5 text-xs bg-[#FF6347] hover:bg-[#FF6347]/90 text-white"
                          icon={Gift}
                        >
                          Start Free 2-Minute {selectedCallMode === 'AUDIO' ? 'Voice' : 'Video'} Call (₹0)
                        </Button>
                      </div>
                    ) : countdownText ? (
                      <div className="p-3.5 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#7960D8]" />
                          <span className="text-[#27243A] font-semibold">Next Free Call Cooldown:</span>
                        </div>
                        <span className="font-mono text-[#7960D8] font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-[#E8E4F0]">
                          {countdownText}
                        </span>
                      </div>
                    ) : null}
                  </>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  disabled={!cameraConsent}
                  onClick={() => {
                    if (user?.gender !== 'FEMALE' && !freeCallInfo?.eligible && wallet.balancePaise < 700) {
                      openWalletModal();
                      return;
                    }
                    joinQueue([selectedLanguage], false, selectedCallMode, user?.gender === 'FEMALE' ? 'RECEIVE' : 'CALL');
                  }}
                  className="w-full shadow-tomato py-3 font-bold"
                  icon={Sparkles}
                >
                  {user?.gender === 'FEMALE'
                    ? 'Start Receiving Calls (100% Free • Zero Cost)'
                    : wallet.balancePaise < 700 && !freeCallInfo?.eligible
                    ? 'Recharge Wallet to Start Call (₹7.00/min)'
                    : `Start Random ${selectedCallMode === 'AUDIO' ? 'Voice' : 'Video'} Call (₹7.00/min)`}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
