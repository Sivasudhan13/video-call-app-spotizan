import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { api } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
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
} from 'lucide-react';

export function ReceiveCallsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet } = useWallet();

  // Strictly restrict call receiving station to verified female users
  useEffect(() => {
    if (user && user.gender !== 'FEMALE') {
      navigate('/queue', { replace: true });
    }
  }, [user, navigate]);

  // Local camera preview ref & stream
  const previewVideoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);

  const [isOnline, setIsOnline] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [micMuted, setMicMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Incoming Call State
  const [incomingCall, setIncomingCall] = useState(null);
  const [ringCountdown, setRingCountdown] = useState(30);

  // Stats
  const [callsReceivedToday, setCallsReceivedToday] = useState(0);
  const [minutesEarned, setMinutesEarned] = useState(0);

  // Start in-browser synthesized gentle chime ringtone
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
      // Audio autoplay restrictions gracefully handled
    }
  };

  // Start local camera preview so girl can verify her camera view is crystal clear
  const startCameraPreview = async () => {
    if (previewStreamRef.current) return;
    setCameraLoading(true);
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user',
        },
        audio: true,
      });
      previewStreamRef.current = stream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera preview permission note:', err);
      setErrorMessage('Camera or Microphone access was denied. Please allow permissions to check your camera.');
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCameraPreview = () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
    }
    setCameraActive(false);
  };

  // Auto start camera preview on mount
  useEffect(() => {
    startCameraPreview();
    return () => {
      stopCameraPreview();
      if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
    };
  }, []);

  // Ensure preview video element always attaches stream
  useEffect(() => {
    if (previewVideoRef.current && previewStreamRef.current) {
      previewVideoRef.current.srcObject = previewStreamRef.current;
      previewVideoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  // Socket connection to listen for incoming calls and queue matches
  useEffect(() => {
    const socket = connectSocket();

    // Register presence in RECEIVE mode if online
    if (isOnline) {
      socket.emit('queue:join', {
        mode: 'RECEIVE',
        languages: user?.languages || ['English', 'Hindi'],
        isFreeCall: false,
      });
    }

    const handleIncomingCall = (data) => {
      setIncomingCall(data);
      setRingCountdown(30);

      // Play soft ring chime
      playRingtoneChime();
      if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = setInterval(playRingtoneChime, 2500);
    };

    const handleMatchFound = ({ sessionId, partner, isInitiator }) => {
      // Immediately stop preview stream so queue page can claim camera
      stopCameraPreview();
      if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
      navigate('/queue?mode=receive&autoJoin=true');
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('match:found', handleMatchFound);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('match:found', handleMatchFound);
      if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
    };
  }, [isOnline, user, navigate]);

  // Countdown timer for incoming call modal
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
    stopCameraPreview();
    // Navigate to queue calling screen with both cameras clear
    navigate('/queue?mode=receive&autoJoin=true');
  };

  const handleDeclineCall = () => {
    if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
    setIncomingCall(null);
  };

  const toggleOnlineStatus = () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    const socket = getSocket();
    if (socket) {
      if (nextStatus) {
        socket.emit('queue:join', {
          mode: 'RECEIVE',
          languages: user?.languages || ['English', 'Hindi'],
        });
      } else {
        socket.emit('queue:leave');
      }
    }
  };

  // Test incoming call demonstration for the girl
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
              <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-[11px] font-bold text-[#777387]">
                {cameraActive ? 'Camera HD Active' : 'Camera Off'}
              </span>
            </div>
          </div>

          {errorMessage && <Alert type="error">{errorMessage}</Alert>}

          {/* Live Video Box */}
          <div className="relative aspect-video rounded-2xl bg-slate-950 overflow-hidden border-2 border-[#7960D8]/40 shadow-xl flex items-center justify-center group">
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''} ${cameraActive ? 'block' : 'hidden'}`}
            />

            {!cameraActive && (
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-300 mx-auto">
                  <VideoOff className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Camera Preview Inactive</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Click below to activate and preview your video feed.</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={startCameraPreview}
                  loading={cameraLoading}
                  className="bg-[#7960D8]"
                >
                  Start Camera Preview
                </Button>
              </div>
            )}

            {/* Overlaid Badges */}
            {cameraActive && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 pointer-events-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Your Camera (1080p Crystal Clear)
                </span>
                <button
                  onClick={() => setIsMirrored(!isMirrored)}
                  className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md text-[11px] font-bold text-slate-200 pointer-events-auto flex items-center gap-1 border border-white/10"
                  title="Toggle selfie mirror"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>{isMirrored ? 'Mirrored' : 'Normal'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Camera Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant={cameraActive ? 'outline' : 'primary'}
                size="sm"
                icon={cameraActive ? VideoOff : Video}
                onClick={cameraActive ? stopCameraPreview : startCameraPreview}
                className="text-xs"
              >
                {cameraActive ? 'Pause Preview' : 'Turn Camera On'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Repeat}
                onClick={() => setIsMirrored(!isMirrored)}
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
                  <span className="font-mono font-black text-emerald-400 text-sm">₹0.00 (100% FREE)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Caller pays:</span>
                  <span className="font-mono font-bold text-white">₹7.00/min</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold border-t border-emerald-500/20 pt-1">
                  <span>Your earning rate:</span>
                  <span className="font-mono text-emerald-300">₹4.90/min (70%)</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Auto-declines in <strong className="text-amber-400">{ringCountdown}s</strong>
              </div>
            </div>

            {/* Accept / Decline Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={handleDeclineCall}
                className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>Decline</span>
              </button>

              <button
                onClick={handleAcceptCall}
                className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4 animate-bounce" />
                <span>Accept Free Call</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceiveCallsPage;
