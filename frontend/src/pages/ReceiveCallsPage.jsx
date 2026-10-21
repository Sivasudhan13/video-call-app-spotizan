import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import {
  PhoneCall,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Coins,
  Repeat,
  Radio,
  X,
  Volume2,
  VolumeX,
  Heart,
  TrendingUp,
  User,
  ArrowRight,
  Shield,
  Zap,
  MessageSquare,
  Send,
  Maximize2,
  Minimize2,
  Camera,
  LayoutGrid,
  Layers,
} from 'lucide-react';

export function ReceiveCallsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet } = useWallet();

  // WebRTC Calling Engine Hook
  const {
    status,
    partner,
    sessionId,
    isInitiator,
    callDurationSeconds,
    isAudioMuted,
    isVideoDisabled,
    callMode,
    errorMessage: rtcError,
    localVideoRef,
    remoteVideoRef,
    joinQueue,
    leaveQueue,
    endCall,
    toggleAudio,
    toggleVideo,
    layoutMode,
    toggleLayoutMode,
    videoFitMode,
    toggleVideoFit,
    isLocalMirrored,
    toggleMirror,
    mainVideoSource,
    swapVideos,
    hasRemoteVideo,
    setHasRemoteVideo,
    hasLocalVideo,
    localStream,
    remoteStream,
    messages,
    isPartnerTyping,
    sendMessage,
    sendTyping,
    initLocalStream,
  } = useWebRTC();

  // Strictly restrict call receiving station to verified female users
  useEffect(() => {
    if (user && user.gender !== 'FEMALE') {
      navigate('/queue', { replace: true });
    }
  }, [user, navigate]);

  // Ensure local camera preview is started immediately upon mount
  useEffect(() => {
    initLocalStream('VIDEO').catch(() => {});
  }, []);

  // Continuous sync to video DOM elements when transitioning to active call or toggling layout
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, status, layoutMode]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, status, layoutMode]);

  const [isOnline, setIsOnline] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [callsReceivedToday, setCallsReceivedToday] = useState(0);

  // Incoming Call Ring Modal state
  const [incomingCall, setIncomingCall] = useState(null);
  const [ringCountdown, setRingCountdown] = useState(30);
  const audioContextRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);

  // Synthesized gentle chime ringtone
  const playRingtoneChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // Gracefully handle browser autoplay policy
    }
  };

  // Join queue in RECEIVE mode on mount if online
  useEffect(() => {
    if (isOnline && status === 'IDLE') {
      joinQueue(['English', 'Hindi'], false, 'VIDEO', 'RECEIVE');
    }
  }, [isOnline, status]);

  // Track completed calls count
  useEffect(() => {
    if (status === 'ENDED') {
      setCallsReceivedToday((prev) => prev + 1);
      // Automatically rejoin receive queue after brief cooldown
      const timer = setTimeout(() => {
        if (isOnline) {
          joinQueue(['English', 'Hindi'], false, 'VIDEO', 'RECEIVE');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, isOnline]);

  const toggleOnlineStatus = () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    if (nextStatus) {
      joinQueue(['English', 'Hindi'], false, 'VIDEO', 'RECEIVE');
    } else {
      leaveQueue();
    }
  };

  // Ring countdown effect
  useEffect(() => {
    let timer;
    if (incomingCall && ringCountdown > 0) {
      timer = setInterval(() => {
        setRingCountdown((prev) => {
          if (prev <= 1) {
            handleDeclineCall();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [incomingCall, ringCountdown]);

  const handleAcceptCall = () => {
    if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
    setIncomingCall(null);
    if (status === 'IDLE') {
      joinQueue(['English', 'Hindi'], false, 'VIDEO', 'RECEIVE');
    }
  };

  const handleDeclineCall = () => {
    if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
    setIncomingCall(null);
  };

  // Simulated test ring demonstration for girl
  const triggerDemoIncomingCall = () => {
    setIncomingCall({
      sessionId: `demo_${Date.now()}`,
      caller: {
        displayName: 'Rahul Sharma',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        gender: 'MALE',
        languages: ['English', 'Hindi'],
      },
      ratePerMinutePaise: 700,
      isFreeForReceiver: true,
    });
    setRingCountdown(30);
    playRingtoneChime();
    if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
    ringtoneIntervalRef.current = setInterval(playRingtoneChime, 2500);
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isCallActive = status === 'CONNECTING' || status === 'ACTIVE';

  // =========================================================================
  // VIEW A: LIVE ACTIVE VIDEO CALL SCREEN (Both cameras 100% visible & clear)
  // =========================================================================
  if (isCallActive) {
    return (
      <div className="flex-1 flex flex-col bg-[#05070D] text-white relative overflow-hidden min-h-[calc(100vh-4rem)]">
        {/* TOP STATUS BAR OVERLAY */}
        <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/90 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              100% FREE CALL FOR YOU
            </span>
            <span className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-purple-300 border border-purple-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              {formatTimer(callDurationSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="px-3 py-1.5 rounded-full bg-[#7960D8]/90 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-[#7960D8]/20">
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              Earned: ₹{((callDurationSeconds * 7 * 0.7) / 60).toFixed(2)}
            </span>
            <button
              onClick={toggleLayoutMode}
              className="p-2 rounded-xl bg-black/60 hover:bg-black/90 text-slate-200 border border-white/10 backdrop-blur-md transition-colors"
              title="Toggle Layout (Grid vs PiP)"
            >
              {layoutMode === 'GRID' ? <Layers className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* DUAL CAMERA VIEW */}
        {layoutMode === 'GRID' ? (
          /* DUAL CAMERA 50/50 SPLIT SCREEN */
          <div className="w-full h-full p-4 sm:p-6 pt-20 pb-28 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center max-w-7xl mx-auto flex-1">
            {/* 1. CALLER / CUSTOMER CAMERA PANE */}
            <div className="relative w-full h-full min-h-[280px] sm:min-h-[420px] bg-slate-900 rounded-3xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl flex items-center justify-center group">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                onPlaying={() => setHasRemoteVideo(true)}
                onLoadedData={() => setHasRemoteVideo(true)}
                className={`w-full h-full ${videoFitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
              />

              {!hasRemoteVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 pointer-events-none z-10">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-950/90 border border-indigo-700/60 flex items-center justify-center text-3xl font-extrabold text-indigo-300 shadow-2xl mb-3">
                    {partner?.displayName?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <h3 className="text-base font-bold text-white">{partner?.displayName || 'Customer Caller'}</h3>
                  <p className="text-xs text-indigo-300 animate-pulse mt-1">
                    Establishing encrypted WebRTC 1080p stream...
                  </p>
                </div>
              )}

              {/* Tag Header */}
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 z-20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white">
                  Customer: {partner?.displayName || 'Customer'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">1080p HD</span>
              </div>
            </div>

            {/* 2. YOUR CAMERA PANE (FEMALE RECEIVER) */}
            <div className="relative w-full h-full min-h-[280px] sm:min-h-[420px] bg-slate-900 rounded-3xl overflow-hidden border-2 border-purple-500/40 shadow-2xl flex items-center justify-center group">
              <video
                ref={localVideoRef}
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
                </div>
              )}

              {/* Tag Header */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">Your Camera (Live Crystal Clear)</span>
                </div>
                <button
                  onClick={toggleMirror}
                  className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-200 border border-white/10 text-xs flex items-center gap-1"
                  title="Flip Mirror"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>{isLocalMirrored ? 'Mirrored' : 'Normal'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* PICTURE-IN-PICTURE (PiP) MODE */
          <div className="relative w-full h-full flex items-center justify-center bg-black flex-1">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              onLoadedMetadata={(e) => e.target.play().catch(() => {})}
              onPlaying={() => setHasRemoteVideo(true)}
              onLoadedData={() => setHasRemoteVideo(true)}
              className="w-full h-full object-cover"
            />
            {/* Inset Female Local Camera */}
            <div className="absolute bottom-24 right-4 z-20 w-48 aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-purple-500 shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                className={`w-full h-full object-cover ${isLocalMirrored ? 'scale-x-[-1]' : ''} ${isVideoDisabled ? 'hidden' : ''}`}
              />
            </div>
          </div>
        )}

        {/* BOTTOM CALL CONTROL CONSOLE */}
        <div className="absolute bottom-6 inset-x-0 z-30 flex items-center justify-center gap-3 px-4 pointer-events-none">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-950/90 border border-white/10 shadow-2xl backdrop-blur-xl pointer-events-auto">
            {/* Audio Mute */}
            <button
              onClick={toggleAudio}
              className={`p-3.5 rounded-xl font-bold transition-all ${
                isAudioMuted ? 'bg-rose-600 text-white shadow-rose-600/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Pause */}
            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-xl font-bold transition-all ${
                isVideoDisabled ? 'bg-rose-600 text-white shadow-rose-600/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isVideoDisabled ? 'Turn Video On' : 'Pause Video'}
            >
              {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            {/* Chat Drawer Toggle */}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="p-3.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold transition-all relative"
              title="Open Chat"
            >
              <MessageSquare className="w-5 h-5" />
              {messages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#7960D8] text-[9px] font-bold flex items-center justify-center">
                  {messages.length}
                </span>
              )}
            </button>

            {/* End Call Button */}
            <button
              onClick={() => endCall('USER_HUNG_UP')}
              className="px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-rose-600/40 transition-all cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
              <span>End Call</span>
            </button>
          </div>
        </div>

        {/* IN-CALL CHAT DRAWER */}
        {chatOpen && (
          <div className="absolute top-20 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] h-96 bg-slate-950/95 border border-purple-500/40 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-fade-in">
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#7960D8]" />
                Live In-Call Chat
              </span>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-2 text-xs">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 pt-16">No messages yet. Send a greeting!</div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl max-w-[85%] ${
                      m.isMe ? 'ml-auto bg-[#7960D8] text-white' : 'mr-auto bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div>{m.text || m.message}</div>
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && chatInput.trim()) {
                    sendMessage(chatInput.trim());
                    setChatInput('');
                  }
                }}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7960D8]"
              />
              <button
                onClick={() => {
                  if (chatInput.trim()) {
                    sendMessage(chatInput.trim());
                    setChatInput('');
                  }
                }}
                className="p-2 rounded-xl bg-[#7960D8] text-white hover:bg-[#684fc9]"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW B: RECEIVE CALLS RADAR & CAMERA CLARITY STATION (Waiting / Online)
  // =========================================================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 bg-white text-[#27243A]">
      {/* SECTION HEADER BANNER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#2A1B54] via-[#7960D8] to-[#FF6347] text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-spin" />
                Girls Call Receiving Station
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase">
                100% Free to Receive
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Receive Incoming Video Calls
            </h1>
            <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
              Girls receive all incoming video calls completely free with zero wallet deduction.
              Keep your status online, check your camera view, and accept live calls from customers anytime.
            </p>
          </div>

          {/* Large Online / Offline Toggle */}
          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            <button
              onClick={toggleOnlineStatus}
              className={`px-6 py-4 rounded-2xl font-black text-sm flex items-center gap-3 transition-all shadow-xl cursor-pointer ${
                isOnline
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-full ${isOnline ? 'bg-white animate-ping' : 'bg-slate-500'}`} />
              <span>{isOnline ? '🟢 Online & Ready to Receive' : '⚪ Offline (Paused)'}</span>
            </button>
            <span className="text-[11px] text-purple-200 font-medium">
              {isOnline ? 'Customers can call your profile now' : 'You will not receive call requests'}
            </span>
          </div>
        </div>
      </div>

      {/* QUICK STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#F8F7FC] border border-[#E8E4F0]">
          <div className="flex items-center justify-between text-xs text-[#777387]">
            <span>Receiving Cost</span>
            <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-[10px]">FREE</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">₹0.00</div>
          <span className="text-[10px] text-[#777387]">Girls never pay to receive calls</span>
        </Card>

        <Card className="p-4 bg-[#F8F7FC] border border-[#E8E4F0]">
          <div className="flex items-center justify-between text-xs text-[#777387]">
            <span>Your Payable Earnings</span>
            <Coins className="w-4 h-4 text-[#7960D8]" />
          </div>
          <div className="text-2xl font-black text-[#7960D8] mt-1">
            ₹{(wallet?.creatorPayablePaise / 100 || 0).toFixed(0)}
          </div>
          <span className="text-[10px] text-[#218A58] font-bold">70% revenue share credited</span>
        </Card>

        <Card className="p-4 bg-[#F8F7FC] border border-[#E8E4F0]">
          <div className="flex items-center justify-between text-xs text-[#777387]">
            <span>Calls Received Today</span>
            <PhoneCall className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-2xl font-black text-[#27243A] mt-1">{callsReceivedToday}</div>
          <span className="text-[10px] text-[#777387]">Instant incoming alerts</span>
        </Card>

        <Card className="p-4 bg-[#F8F7FC] border border-[#E8E4F0]">
          <div className="flex items-center justify-between text-xs text-[#777387]">
            <span>Dual Camera Mode</span>
            <Video className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-[#27243A] mt-1">1080p HD</div>
          <span className="text-[10px] text-[#777387]">Both cameras crystal clear</span>
        </Card>
      </div>

      {/* CORE 2-COLUMN SECTION: CAMERA PREVIEW & LIVE RADAR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* LEFT COLUMN: CAMERA & MIC PREVIEW CONSOLE */}
        <Card className="p-6 border border-[#E8E4F0] space-y-5 bg-white shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E4F0]">
            <div>
              <h3 className="font-bold text-base text-[#27243A] flex items-center gap-2">
                <Video className="w-5 h-5 text-[#7960D8]" />
                Camera & Clarity Preview
              </h3>
              <p className="text-xs text-[#777387]">Check your lighting and view before receiving calls.</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${localStream ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-[11px] font-bold text-[#777387]">
                {localStream ? 'Camera HD Active' : 'Camera Off'}
              </span>
            </div>
          </div>

          {rtcError && <Alert type="error">{rtcError}</Alert>}

          {/* Live Video Box */}
          <div className="relative aspect-video rounded-2xl bg-slate-950 overflow-hidden border-2 border-[#7960D8]/40 shadow-xl flex items-center justify-center group">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={(e) => e.target.play().catch(() => {})}
              className={`w-full h-full object-cover ${isLocalMirrored ? 'scale-x-[-1]' : ''} ${hasLocalVideo && !isVideoDisabled ? 'block' : 'hidden'}`}
            />

            {(!hasLocalVideo || isVideoDisabled) && (
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-300 mx-auto">
                  <VideoOff className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {isVideoDisabled ? 'Camera is Paused' : 'Camera Initializing...'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Your camera feed will display here automatically.</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => joinQueue(['English', 'Hindi'], false, 'VIDEO', 'RECEIVE')}
                  className="bg-[#7960D8]"
                >
                  Activate Camera Stream
                </Button>
              </div>
            )}

            {/* Overlaid Badges */}
            {hasLocalVideo && !isVideoDisabled && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 pointer-events-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Your Camera (1080p Crystal Clear)
                </span>
                <button
                  onClick={toggleMirror}
                  className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md text-[11px] font-bold text-slate-200 pointer-events-auto flex items-center gap-1 border border-white/10"
                  title="Toggle selfie mirror"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>{isLocalMirrored ? 'Mirrored' : 'Normal'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Camera Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant={hasLocalVideo && !isVideoDisabled ? 'outline' : 'primary'}
                size="sm"
                icon={isVideoDisabled ? Video : VideoOff}
                onClick={toggleVideo}
                className="text-xs"
              >
                {isVideoDisabled ? 'Turn Video On' : 'Pause Camera'}
              </Button>
              <Button
                variant={isAudioMuted ? 'outline' : 'secondary'}
                size="sm"
                icon={isAudioMuted ? MicOff : Mic}
                onClick={toggleAudio}
                className="text-xs"
              >
                {isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Repeat}
                onClick={toggleMirror}
                className="text-xs"
              >
                Flip Mirror
              </Button>
            </div>
            <span className="text-[11px] text-[#218A58] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Optimal Clarity Ready
            </span>
          </div>
        </Card>

        {/* RIGHT COLUMN: LIVE RADAR & INCOMING CALL LISTENER */}
        <Card className="p-6 border border-[#E8E4F0] space-y-6 bg-white shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E4F0]">
            <div>
              <h3 className="font-bold text-base text-[#27243A] flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#FF6347]" />
                Live Incoming Radar
              </h3>
              <p className="text-xs text-[#777387]">Actively listening for matching callers on Spotizan.</p>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
              {isOnline ? 'RADAR ACTIVE' : 'PAUSED'}
            </span>
          </div>

          {/* Animated Radar Pulse Display */}
          <div className="relative py-12 px-4 rounded-2xl bg-gradient-to-b from-[#F1EDFF] via-white to-[#FFF0EC] border border-[#E8E4F0] flex flex-col items-center justify-center text-center overflow-hidden">
            <div className="relative mb-4">
              <div className={`w-28 h-28 rounded-full ${isOnline ? 'bg-[#7960D8]/20 animate-ping' : 'bg-gray-200'} absolute inset-0`} />
              <div className={`w-28 h-28 rounded-full ${isOnline ? 'bg-[#FF6347]/20 animate-pulse' : 'bg-gray-200'} absolute inset-0`} />
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#7960D8] to-[#FF6347] flex items-center justify-center text-white text-3xl font-black shadow-xl relative z-10">
                <PhoneCall className={`w-10 h-10 ${isOnline ? 'animate-bounce' : 'opacity-60'}`} />
              </div>
            </div>

            <h4 className="font-bold text-base text-[#27243A]">
              {isOnline ? 'Waiting for Incoming Video Calls...' : 'You are currently Offline'}
            </h4>
            <p className="text-xs text-[#777387] max-w-sm mt-1">
              {isOnline
                ? 'Your profile is broadcasting live. When a customer calls, a ringing pop-up will appear with caller details and 1-click free acceptance.'
                : 'Turn your status to Online above to begin receiving calls.'}
            </p>

            {/* Test incoming call demonstration button */}
            <div className="mt-5">
              <button
                onClick={triggerDemoIncomingCall}
                className="px-4 py-2 rounded-xl bg-white border border-[#7960D8]/40 hover:border-[#7960D8] text-[#7960D8] font-bold text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Simulate Test Incoming Call Ring</span>
              </button>
            </div>
          </div>

          {/* Female Free Call Guarantee Policies */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-bold text-[#777387] uppercase tracking-wider block">
              Spotizan Female Receiver Guarantee
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#7960D8]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>₹0.00 Receiving Cost</span>
                </div>
                <p className="text-[11px] text-[#777387]">Zero wallet balance required. Girls receive calls 100% free.</p>
              </div>

              <div className="p-3 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#7960D8]">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Earn 70% Share</span>
                </div>
                <p className="text-[11px] text-[#777387]">Earn ₹5.00–₹10.50/min for paid calls with instant withdrawal.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* INCOMING CALL RINGING MODAL */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0A0D1A] text-white w-full max-w-md rounded-3xl border-2 border-emerald-500 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
            {/* Pulsing ring waves background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black tracking-wide uppercase border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Incoming Video Call Request
              </div>

              {/* Caller Avatar */}
              <div className="relative mx-auto w-24 h-24 my-2">
                <div className="w-24 h-24 rounded-full bg-emerald-500/30 animate-ping absolute inset-0" />
                <div className="w-24 h-24 rounded-full bg-indigo-600 border-4 border-emerald-400 flex items-center justify-center text-3xl font-black text-white shadow-2xl relative z-10 overflow-hidden">
                  {incomingCall.caller?.avatarUrl ? (
                    <img src={incomingCall.caller.avatarUrl} alt={incomingCall.caller.displayName} className="w-full h-full object-cover" />
                  ) : (
                    incomingCall.caller?.displayName?.charAt(0).toUpperCase() || 'C'
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">{incomingCall.caller?.displayName || 'Customer'}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Languages: {incomingCall.caller?.languages?.join(', ') || 'English, Hindi'}
                </p>
              </div>

              {/* Free for Girl Promise Box */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-left space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Cost to You:
                  </span>
                  <span className="text-emerald-400 font-black">₹0.00 (100% Free)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Earnings Credited:</span>
                  <span className="text-[#FF6347] font-bold">70% revenue share</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                Auto-declines in <strong className="text-white font-mono">{ringCountdown}s</strong>
              </div>
            </div>

            {/* Accept / Decline Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={handleDeclineCall}
                className="py-4 rounded-2xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Decline</span>
              </button>

              <button
                onClick={handleAcceptCall}
                className="py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/40 transition-all cursor-pointer animate-pulse"
              >
                <PhoneCall className="w-4 h-4 text-slate-950" />
                <span>Accept Call</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
