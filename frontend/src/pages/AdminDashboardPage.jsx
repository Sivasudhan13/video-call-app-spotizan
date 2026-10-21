import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Building2,
  Smartphone,
  Check,
  X,
  ExternalLink,
  Shield,
  FileCheck,
  Lock,
  BarChart3,
  Search,
  UserX,
  UserCheck,
  Flag,
  FileText,
  Sliders,
  Coins,
  PhoneCall,
  Video,
  Eye,
  EyeOff,
  Radio,
  Clock,
  AlertTriangle,
  Menu,
  ChevronRight,
  LogOut,
  Maximize2,
  VolumeX,
  Volume2,
} from 'lucide-react';
import { api } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { useAuth } from '../context/AuthContext';

export function AdminDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentAdmin, logout } = useAuth();

  // Determine active tab based on URL path
  const getTabFromPath = () => {
    const path = location.pathname;
    if (path.includes('/admin/calls') || path.includes('/admin/live-monitor')) return 'active-calls';
    if (path.includes('/admin/users')) return 'users';
    if (path.includes('/admin/creators') || path.includes('/admin/verifications')) return 'kyc';
    if (path.includes('/admin/payments') || path.includes('/admin/payouts')) return 'payouts';
    if (path.includes('/admin/reports') || path.includes('/admin/safety')) return 'reports';
    if (path.includes('/admin/audit-logs')) return 'audit';
    if (path.includes('/admin/settings')) return 'settings';
    if (path.includes('/admin/analytics') || path.includes('/admin/overview') || path.includes('/admin/dashboard')) return 'overview';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Overview stats (Real MongoDB Aggregation)
  const [overview, setOverview] = useState(null);

  // Live Active Calls (Stealth Safety View & Real Live Video Monitoring)
  const [activeCalls, setActiveCalls] = useState([]);
  const [inspectingSession, setInspectingSession] = useState(null);
  const [moderationReason, setModerationReason] = useState('Terms of consensual adult service violation');

  // Live Video Call Show Observation State
  const adminCallerVideoRef = useRef(null);
  const adminReceiverVideoRef = useRef(null);
  const adminPcsRef = useRef({ caller: null, receiver: null });
  const adminStreamsRef = useRef({ caller: null, receiver: null });
  const adminPendingCandidatesRef = useRef({ caller: [], receiver: [] });
  const [adminStreamStatus, setAdminStreamStatus] = useState({ caller: 'connecting', receiver: 'connecting' });
  const [adminAudioMuted, setAdminAudioMuted] = useState(true);

  // Synchronize live camera stream objects to video DOM elements
  useEffect(() => {
    if (adminCallerVideoRef.current && adminStreamsRef.current.caller) {
      if (adminCallerVideoRef.current.srcObject !== adminStreamsRef.current.caller) {
        adminCallerVideoRef.current.srcObject = adminStreamsRef.current.caller;
      }
      adminCallerVideoRef.current.play().catch(() => {});
    }
    if (adminReceiverVideoRef.current && adminStreamsRef.current.receiver) {
      if (adminReceiverVideoRef.current.srcObject !== adminStreamsRef.current.receiver) {
        adminReceiverVideoRef.current.srcObject = adminStreamsRef.current.receiver;
      }
      adminReceiverVideoRef.current.play().catch(() => {});
    }
  }, [adminStreamStatus, inspectingSession]);

  // Live Video Call Show WebRTC Observation Listener
  useEffect(() => {
    if (!inspectingSession) {
      if (adminPcsRef.current.caller) {
        try { adminPcsRef.current.caller.close(); } catch (e) {}
        adminPcsRef.current.caller = null;
      }
      if (adminPcsRef.current.receiver) {
        try { adminPcsRef.current.receiver.close(); } catch (e) {}
        adminPcsRef.current.receiver = null;
      }
      adminStreamsRef.current = { caller: null, receiver: null };
      adminPendingCandidatesRef.current = { caller: [], receiver: [] };
      setAdminStreamStatus({ caller: 'connecting', receiver: 'connecting' });
      return;
    }

    const socket = connectSocket();
    socket.emit('admin:join_inspect', { sessionId: inspectingSession.sessionId });

    const handleAdminSignal = async ({ signal, fromSocketId, peerType }) => {
      const type = peerType || 'caller';
      try {
        let pc = adminPcsRef.current[type];
        if (!pc || pc.signalingState === 'closed') {
          pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          });
          adminPcsRef.current[type] = pc;
          if (!adminPendingCandidatesRef.current[type]) {
            adminPendingCandidatesRef.current[type] = [];
          }

          pc.ontrack = (event) => {
            let stream = null;
            if (event.streams && event.streams[0]) {
              stream = event.streams[0];
            } else if (event.track) {
              if (!adminStreamsRef.current[type]) {
                adminStreamsRef.current[type] = new MediaStream();
              }
              adminStreamsRef.current[type].addTrack(event.track);
              stream = adminStreamsRef.current[type];
            }

            if (stream) {
              adminStreamsRef.current[type] = stream;
              const videoEl = type === 'caller' ? adminCallerVideoRef.current : adminReceiverVideoRef.current;
              if (videoEl) {
                videoEl.srcObject = stream;
                videoEl.play().catch(() => {});
              }
              setAdminStreamStatus((prev) => ({ ...prev, [type]: 'connected' }));
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit('admin:signal', {
                targetSocketId: fromSocketId,
                signal: { type: 'candidate', candidate: event.candidate },
                sessionId: inspectingSession.sessionId,
                peerType: type,
              });
            }
          };
        }

        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));

          // Flush any buffered ICE candidates that arrived before remoteDescription
          const queue = adminPendingCandidatesRef.current[type] || [];
          while (queue.length > 0) {
            const cand = queue.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {}
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('admin:signal', {
            targetSocketId: fromSocketId,
            signal: { type: 'answer', sdp: answer.sdp },
            sessionId: inspectingSession.sessionId,
            peerType: type,
          });
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (!pc.remoteDescription) {
            if (!adminPendingCandidatesRef.current[type]) adminPendingCandidatesRef.current[type] = [];
            adminPendingCandidatesRef.current[type].push(signal.candidate);
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.warn('Admin live stream negotiation notice:', err);
      }
    };

    const handleObservedCallEnded = ({ sessionId }) => {
      if (sessionId === inspectingSession.sessionId) {
        setSuccessMsg('The observed video call has ended.');
        setInspectingSession(null);
      }
    };

    socket.on('admin:signal', handleAdminSignal);
    socket.on('call:ended', handleObservedCallEnded);

    return () => {
      socket.emit('admin:leave_inspect', { sessionId: inspectingSession.sessionId });
      socket.off('admin:signal', handleAdminSignal);
      socket.off('call:ended', handleObservedCallEnded);
      if (adminPcsRef.current.caller) {
        try { adminPcsRef.current.caller.close(); } catch (e) {}
        adminPcsRef.current.caller = null;
      }
      if (adminPcsRef.current.receiver) {
        try { adminPcsRef.current.receiver.close(); } catch (e) {}
        adminPcsRef.current.receiver = null;
      }
      adminStreamsRef.current = { caller: null, receiver: null };
      adminPendingCandidatesRef.current = { caller: [], receiver: [] };
    };
  }, [inspectingSession]);

  // Real Users Management state
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [usersPage, setUsersPage] = useState(1);
  const [usersPagination, setUsersPagination] = useState({ total: 0, pages: 1, limit: 15 });

  // KYC state
  const [kycQueue, setKycQueue] = useState([]);
  const [rejectionNotes, setRejectionNotes] = useState({});

  // Payout state
  const [payouts, setPayouts] = useState([]);
  const [txnRefs, setTxnRefs] = useState({});

  // Safety Reports state
  const [reports, setReports] = useState([]);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);

  // Sync tab with URL
  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    const routes = {
      overview: '/admin/dashboard',
      'active-calls': '/admin/calls',
      users: '/admin/users',
      kyc: '/admin/verifications',
      payouts: '/admin/payments',
      reports: '/admin/reports',
      audit: '/admin/audit-logs',
      settings: '/admin/settings',
    };
    if (routes[tab]) {
      navigate(routes[tab], { replace: true });
    }
  };

  // Auto-refresh interval (every 10 seconds for live safety presence)
  useEffect(() => {
    loadData();

    let timer = null;
    if (autoRefresh) {
      timer = setInterval(() => {
        // Silently refresh active calls or overview
        if (activeTab === 'active-calls' || activeTab === 'overview') {
          loadData(true);
        }
      }, 10000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeTab, usersPage, roleFilter, statusFilter, autoRefresh]);

  const loadData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);

      if (activeTab === 'overview') {
        const res = await api.get('/admin/dashboard/overview');
        if (res.success && res.data) setOverview(res.data);
      } else if (activeTab === 'active-calls') {
        const res = await api.get('/admin/active-calls');
        if (res.success && res.data?.activeCalls) {
          setActiveCalls(res.data.activeCalls);
        }
      } else if (activeTab === 'users') {
        let endpoint = `/admin/users?page=${usersPage}&search=${encodeURIComponent(userSearch)}`;
        if (roleFilter !== 'ALL') endpoint += `&role=${roleFilter}`;
        if (statusFilter !== 'ALL') endpoint += `&status=${statusFilter}`;
        const res = await api.get(endpoint);
        if (res.success && res.data?.users) {
          setUsersList(res.data.users);
          if (res.data.pagination) setUsersPagination(res.data.pagination);
        }
      } else if (activeTab === 'kyc') {
        const res = await api.get('/admin/verification-queue');
        const queue = res.data?.queue || res.data || [];
        setKycQueue(Array.isArray(queue) ? queue : []);
      } else if (activeTab === 'payouts') {
        const res = await api.get('/admin/payouts');
        const list = res.data?.payouts || res.data || [];
        setPayouts(Array.isArray(list) ? list : []);
      } else if (activeTab === 'reports') {
        const res = await api.get('/admin/reports');
        if (res.success && res.data?.reports) setReports(res.data.reports);
      } else if (activeTab === 'audit') {
        const res = await api.get('/admin/audit-logs');
        if (res.success && res.data?.logs) setAuditLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      if (!isBackground) setError(err.message || 'Failed to load administrator data.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Force Terminate / Disconnect Active Video Call (Safety Measure)
  const handleForceTerminateCall = async (sessionId) => {
    if (!window.confirm('Are you sure you want to immediately terminate this live video call for safety compliance?')) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const res = await api.post(`/admin/calls/${sessionId}/terminate`, {
        reason: moderationReason,
        actionType: 'FORCE_DISCONNECT',
      });

      if (res.success) {
        setSuccessMsg(`Call session [${sessionId}] was immediately disconnected and safety-terminated.`);
        setActiveCalls((prev) => prev.filter((c) => c.sessionId !== sessionId));
        setInspectingSession(null);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      setError(err.message || 'Failed to terminate active video call.');
    } finally {
      setActionLoading(false);
    }
  };

  // Suspend / Reinstate User Account
  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      setActionLoading(true);
      setSuccessMsg('');
      setError(null);
      const newStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

      await api.patch(`/admin/users/${userId}/status`, {
        status: newStatus,
        reason: newStatus === 'SUSPENDED' ? 'Administrative suspension for platform safety compliance' : 'Account reinstated by safety administrator',
      });

      setSuccessMsg(`User status updated to ${newStatus}. Recorded in audit logs.`);
      setUsersList((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status: newStatus } : u))
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update user account status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Review KYC (Approve / Reject)
  const handleReviewCreator = async (creatorId, action) => {
    try {
      setActionLoading(true);
      setSuccessMsg('');
      setError(null);
      const rejectionReason =
        rejectionNotes[creatorId] || 'Identity documentation did not satisfy minimum clarity standards.';

      await api.patch(`/admin/verify-creator/${creatorId}`, {
        action,
        rejectionReason: action === 'REJECT' ? rejectionReason : undefined,
      });

      setSuccessMsg(`Creator application ${action === 'APPROVE' ? 'approved & verified' : 'rejected'}.`);
      setKycQueue((prev) => prev.filter((item) => (item.creator?._id || item._id) !== creatorId));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update verification status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Process Payout
  const handleProcessPayout = async (payoutId, status) => {
    try {
      setActionLoading(true);
      setSuccessMsg('');
      setError(null);
      const transactionReference = txnRefs[payoutId] || `TXN_${Date.now()}`;

      await api.patch(`/admin/payouts/${payoutId}`, {
        status,
        transactionReference: status === 'PROCESSED' ? transactionReference : undefined,
      });

      setSuccessMsg(`Payout marked as ${status}.`);
      setPayouts((prev) =>
        prev.map((p) =>
          p._id === payoutId
            ? { ...p, status, transactionReference: status === 'PROCESSED' ? transactionReference : p.transactionReference }
            : p
        )
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to process payout request.');
    } finally {
      setActionLoading(false);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Analytics Overview', icon: BarChart3 },
    {
      id: 'active-calls',
      label: 'Live Safety Monitor',
      icon: Radio,
      badge: overview?.activeCalls || activeCalls.length,
      badgeColor: 'bg-[#FF6347]',
    },
    { id: 'users', label: 'User Directory', icon: Users, badge: overview?.totalUsers },
    { id: 'kyc', label: 'Creator Verifications', icon: ShieldCheck, badge: kycQueue.length },
    { id: 'reports', label: 'Safety Reports', icon: Flag, badge: reports.length },
    { id: 'payouts', label: 'Payments & Payouts', icon: CreditCard },
    { id: 'audit', label: 'Audit Trail', icon: FileText },
    { id: 'settings', label: 'Policy Settings', icon: Sliders },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7FC] text-[#27243A] flex flex-col md:flex-row antialiased">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[#E8E4F0] sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#7960D8] text-white flex items-center justify-center font-black shadow-md shadow-[#7960D8]/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="font-black text-sm text-[#27243A]">Spotizan</span>
            <span className="text-[10px] text-[#7960D8] block font-bold leading-none">ADMIN CONSOLE</span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-[#F1EDFF] text-[#7960D8] hover:bg-[#e7e0ff]"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#E8E4F0] flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center gap-3 pb-6 border-b border-[#E8E4F0]">
            <div className="w-10 h-10 rounded-xl bg-[#7960D8] text-white flex items-center justify-center shadow-lg shadow-[#7960D8]/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg text-[#27243A] tracking-tight">Spotizan</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF6347] text-white">ADMIN</span>
              </div>
              <span className="text-[10px] text-[#777387] font-semibold block">Safety & Operations</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1 flex-1">
            <span className="text-[10px] font-bold text-[#777387] uppercase tracking-wider px-3 mb-2 block">
              Management Areas
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => switchTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#7960D8] text-white shadow-md shadow-[#7960D8]/20'
                      : 'text-[#777387] hover:text-[#27243A] hover:bg-[#F1EDFF]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {Boolean(item.badge) && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isActive
                          ? 'bg-white text-[#7960D8]'
                          : item.badgeColor || 'bg-[#F1EDFF] text-[#7960D8] border border-[#E8E4F0]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Status Pill */}
          <div className="pt-4 border-t border-[#E8E4F0] mt-4">
            <div className="p-3 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#7960D8]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#218A58] animate-pulse" />
                  MongoDB Live
                </span>
                <span className="text-[10px] font-mono text-[#777387]">v1.0.0</span>
              </div>
              <p className="text-[10px] text-[#777387] leading-tight">
                All platform metrics derived strictly from live collections.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-[#E8E4F0] bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#7960D8] text-white flex items-center justify-center font-bold text-xs">
                A
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-[#27243A] leading-none">Admin Staff</span>
                <span className="text-[10px] text-[#777387] leading-none mt-1 truncate max-w-[120px]">
                  {currentAdmin?.email || 'admin@spotizan.com'}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[#777387] hover:text-[#D92D20] hover:bg-[#FFF0EC] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-[#F1EDFF] text-[11px] font-bold text-[#7960D8] hover:bg-[#e7e0ff] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Return to User Website
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Control Bar */}
        <header className="bg-white border-b border-[#E8E4F0] px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#7960D8]">Admin Console</span>
              <ChevronRight className="w-3 h-3 text-[#777387]" />
              <span className="text-xs font-bold text-[#777387] capitalize">
                {activeTab.replace('-', ' ')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#27243A] mt-0.5">
              {activeTab === 'overview' && 'Platform Analytics & Live Aggregations'}
              {activeTab === 'active-calls' && 'Live Video Call Safety Monitor'}
              {activeTab === 'users' && 'Registered Users Directory'}
              {activeTab === 'kyc' && 'Creator KYC Verification Applications'}
              {activeTab === 'reports' && 'Safety & Incident Queue'}
              {activeTab === 'payouts' && 'Financial Settlements & Creator Payouts'}
              {activeTab === 'audit' && 'System Audit Trail & Incident Logs'}
              {activeTab === 'settings' && 'Platform Governance & Policies'}
            </h1>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Auto-Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                autoRefresh
                  ? 'border-[#218A58]/30 bg-emerald-50 text-[#218A58]'
                  : 'border-[#E8E4F0] bg-white text-[#777387]'
              }`}
              title="Toggle automatic 10s live presence polling"
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-[#218A58] animate-pulse' : 'bg-gray-400'}`} />
              Auto-Sync {autoRefresh ? 'ON' : 'OFF'}
            </button>

            {/* Manual Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() => loadData(false)}
              loading={loading}
              className="text-xs border-[#E8E4F0]"
            >
              Sync Live Data
            </Button>
          </div>
        </header>

        {/* Dynamic Alerts */}
        <div className="px-6 pt-4">
          {error && <Alert type="error" title="Moderation Alert">{error}</Alert>}
          {successMsg && <Alert type="success" title="Success">{successMsg}</Alert>}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 space-y-6">
          {/* TAB 1: OVERVIEW ANALYTICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-white border border-[#E8E4F0] shadow-sm">
                  <span className="text-[11px] text-[#777387] font-semibold block">Total Registered Accounts</span>
                  <div className="text-2xl font-black text-[#27243A] mt-1">{overview?.totalUsers ?? 0}</div>
                  <span className="text-[10px] text-[#218A58] font-medium block mt-1">Real MongoDB Users</span>
                </Card>

                <Card className="p-4 bg-white border border-[#E8E4F0] shadow-sm">
                  <span className="text-[11px] text-[#777387] font-semibold block">Adult Verified (18+)</span>
                  <div className="text-2xl font-black text-[#27243A] mt-1">{overview?.verifiedAdultUsers ?? 0}</div>
                  <span className="text-[10px] text-[#7960D8] font-medium block mt-1">Statutory age affirmed</span>
                </Card>

                <Card className="p-4 bg-white border border-[#E8E4F0] shadow-sm">
                  <span className="text-[11px] text-[#777387] font-semibold block">Approved Creators</span>
                  <div className="text-2xl font-black text-[#27243A] mt-1">{overview?.approvedCreators ?? 0}</div>
                  <span className="text-[10px] text-[#218A58] font-medium block mt-1">KYC approved & online</span>
                </Card>

                <Card className="p-4 bg-white border-2 border-[#FF6347]/40 shadow-sm bg-gradient-to-br from-white to-[#FFF0EC]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#FF6347] font-bold block">Live Call Sessions</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF6347] animate-pulse" />
                  </div>
                  <div className="text-3xl font-black text-[#FF6347] mt-1">{overview?.activeCalls ?? 0}</div>
                  <button
                    onClick={() => switchTab('active-calls')}
                    className="text-[10px] text-[#7960D8] font-bold mt-1 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    Open Stealth Monitor →
                  </button>
                </Card>

                <Card className="p-4 bg-white border border-[#E8E4F0] shadow-sm">
                  <span className="text-[11px] text-[#777387] font-semibold block">Completed Call Sessions</span>
                  <div className="text-2xl font-black text-[#27243A] mt-1">{overview?.completedCalls ?? 0}</div>
                  <div className="text-[10px] text-[#777387] mt-1 flex gap-2">
                    <span>Free: {overview?.freeCallsConsumed ?? 0}</span>
                    <span>•</span>
                    <span>Paid: {overview?.paidCallsCompleted ?? 0}</span>
                  </div>
                </Card>

                <Card className="p-4 bg-white border border-[#E8E4F0] shadow-sm">
                  <span className="text-[11px] text-[#777387] font-semibold block">Gross Payment Volume</span>
                  <div className="text-2xl font-black text-[#218A58] font-mono mt-1">
                    ₹{overview?.grossPaymentVolumeINR ?? '0.00'}
                  </div>
                  <span className="text-[10px] text-[#777387] font-medium block mt-1">Razorpay verified</span>
                </Card>

                <Card className="p-4 bg-white border border-[#E8E4F0] shadow-sm">
                  <span className="text-[11px] text-[#777387] font-semibold block">Net Platform Revenue</span>
                  <div className="text-2xl font-black text-[#7960D8] font-mono mt-1">
                    ₹{overview?.platformRevenueINR ?? '0.00'}
                  </div>
                  <span className="text-[10px] text-[#777387] font-medium block mt-1">30% call commission</span>
                </Card>

                <Card className="p-4 bg-white border border-[#E8E4F0] shadow-sm">
                  <span className="text-[11px] text-[#777387] font-semibold block">Safety Incidents</span>
                  <div className="text-2xl font-black text-[#D92D20] mt-1">{overview?.openReports ?? 0}</div>
                  <span className="text-[10px] text-[#777387] font-medium block mt-1">Pending admin reviews</span>
                </Card>
              </div>

              {/* Quick Actions Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 border-[#E8E4F0]">
                  <div className="flex items-center gap-2 mb-3">
                    <Radio className="w-5 h-5 text-[#FF6347]" />
                    <h3 className="font-bold text-base text-[#27243A]">Live Video Call Safety Observation</h3>
                  </div>
                  <p className="text-xs text-[#777387] mb-4 leading-relaxed">
                    Monitor active video calls in stealth mode as a safety compliance measure. Admin can view both feeds and force-disconnect any violating participant without alerting the callers.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Radio}
                    onClick={() => switchTab('active-calls')}
                  >
                    Open Live Calls Monitor ({overview?.activeCalls ?? 0} Active)
                  </Button>
                </Card>

                <Card className="p-6 border-[#E8E4F0]">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-[#7960D8]" />
                    <h3 className="font-bold text-base text-[#27243A]">Real User Management</h3>
                  </div>
                  <p className="text-xs text-[#777387] mb-4 leading-relaxed">
                    View registered users directly from MongoDB. Inspect statutory 18+ verification declarations, gender matching preferences, and execute immediate account suspensions.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Users}
                    onClick={() => switchTab('users')}
                  >
                    Manage Real Users ({overview?.totalUsers ?? 0})
                  </Button>
                </Card>
              </div>

              {/* PLATFORM ANALYSIS & LIVE OPERATIONS WORKFLOW */}
              <Card className="p-6 border-[#E8E4F0] bg-white shadow-card space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E8E4F0] gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#7960D8]" />
                      <h3 className="font-bold text-base text-[#27243A]">Platform Analysis & Operations Workflow</h3>
                    </div>
                    <p className="text-xs text-[#777387] mt-0.5">
                      End-to-end verified pipeline: Customer calling, female free receiving, live camera show observation, and payout settlement.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      All Workflows Operational
                    </span>
                  </div>
                </div>

                {/* 4-Step Interactive Pipeline */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-[#F8F7FC] border border-[#E8E4F0] space-y-2 hover:border-[#7960D8]/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-lg bg-[#7960D8] text-white font-bold text-xs flex items-center justify-center">1</span>
                      <Coins className="w-4 h-4 text-amber-500" />
                    </div>
                    <h4 className="font-bold text-sm text-[#27243A]">Male Caller Billing</h4>
                    <p className="text-[11px] text-[#777387]">
                      Male accounts debited ₹7/min (after 15s preview) via Razorpay wallet balance.
                    </p>
                    <div className="pt-2 text-[10px] text-[#7960D8] font-bold">
                      Completed: {overview?.completedCalls ?? 0} calls
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 space-y-2 hover:border-emerald-400 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h4 className="font-bold text-sm text-[#27243A]">Female Free Receive</h4>
                    <p className="text-[11px] text-[#777387]">
                      Females receive calls 100% free with ₹0 deduction; 70% share (₹4.90/min) credited.
                    </p>
                    <div className="pt-2 text-[10px] text-emerald-700 font-bold">
                      Guaranteed ₹0.00 Cost
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/60 space-y-2 hover:border-orange-400 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-lg bg-[#FF6347] text-white font-bold text-xs flex items-center justify-center">3</span>
                      <Radio className="w-4 h-4 text-[#FF6347]" />
                    </div>
                    <h4 className="font-bold text-sm text-[#27243A]">Live Camera Show</h4>
                    <p className="text-[11px] text-[#777387]">
                      Admin stealth video inspection: real-time dual camera feeds and immediate force disconnect.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => switchTab('active-calls')}
                        className="text-[10px] text-[#FF6347] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Inspect Active ({overview?.activeCalls ?? 0}) →
                      </button>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/60 space-y-2 hover:border-purple-400 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-lg bg-[#2A1B54] text-white font-bold text-xs flex items-center justify-center">4</span>
                      <CreditCard className="w-4 h-4 text-[#7960D8]" />
                    </div>
                    <h4 className="font-bold text-sm text-[#27243A]">Bank Payout Settlement</h4>
                    <p className="text-[11px] text-[#777387]">
                      Female creators submit bank & UPI details; Admin reviews, inputs UTR, and marks paid.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => switchTab('payouts')}
                        className="text-[10px] text-[#7960D8] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Review Payouts ({payouts.length}) →
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: LIVE VIDEO CALL SAFETY MONITOR (STEALTH VIEW & FORCE DISCONNECT) */}
          {activeTab === 'active-calls' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#F1EDFF] via-white to-[#FFF0EC] border border-[#E8E4F0]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6347] text-white flex items-center justify-center shadow-md shadow-[#FF6347]/20">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="font-black text-base text-[#27243A]">Stealth Safety Observation Console</h2>
                    <p className="text-xs text-[#777387]">
                      Administrative safety feature: View live peer video feeds and disconnect any violating session silently without alerting users.
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white border border-[#E8E4F0] text-xs font-bold text-[#FF6347] flex items-center gap-2 self-start sm:self-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6347] animate-ping" />
                  {activeCalls.length} Active Sessions
                </div>
              </div>

              {/* Active Calls Table */}
              <Card className="p-6 border-[#E8E4F0]">
                {loading ? (
                  <div className="py-16 text-center text-[#777387] text-sm">
                    Scanning active MongoDB call sessions...
                  </div>
                ) : activeCalls.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-[#E8E4F0] rounded-2xl p-8 space-y-3">
                    <Video className="w-12 h-12 text-[#B9A7F5] mx-auto opacity-70" />
                    <h3 className="font-bold text-base text-[#27243A]">No Active Video Calls In Progress</h3>
                    <p className="text-xs text-[#777387] max-w-md mx-auto">
                      Currently no participants are connected in the random queue or direct creator calls. When callers match, their sessions will appear here live with stealth observation controls.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#27243A]">
                      <thead className="bg-[#F1EDFF] text-[#777387] uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-3 px-3 rounded-l-lg">Session ID</th>
                          <th className="py-3 px-3">Caller (Peer 1)</th>
                          <th className="py-3 px-3">Receiver (Peer 2)</th>
                          <th className="py-3 px-3">Call Type</th>
                          <th className="py-3 px-3">Started</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3 rounded-r-lg text-right">Safety Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E4F0]">
                        {activeCalls.map((call) => (
                          <tr key={call.sessionId} className="hover:bg-[#F1EDFF]/40 transition-colors">
                            <td className="py-3.5 px-3 font-mono font-bold text-[11px] text-[#7960D8]">
                              {call.sessionId?.slice(0, 14)}...
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-[#27243A]">{call.callerId?.displayName || 'Caller'}</div>
                              <div className="text-[10px] text-[#777387]">{call.callerId?.email} • {call.callerId?.gender}</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-[#27243A]">{call.receiverId?.displayName || 'Receiver'}</div>
                              <div className="text-[10px] text-[#777387]">{call.receiverId?.email} • {call.receiverId?.gender}</div>
                            </td>
                            <td className="py-3.5 px-3 font-semibold text-[11px]">
                              {call.isFreeCall ? (
                                <span className="text-[#218A58]">Free Call (120s max)</span>
                              ) : (
                                <span className="text-[#7960D8]">Paid Call (₹{((call.ratePerMinutePaise || 700) / 100).toFixed(0)}/min)</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-[#777387]">
                              {call.startedAt ? new Date(call.startedAt).toLocaleTimeString() : 'Just now'}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                                {call.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={Eye}
                                  onClick={() => setInspectingSession(call)}
                                  className="text-[11px] py-1 bg-[#7960D8] hover:bg-[#684fc9]"
                                >
                                  Stealth View
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  icon={XCircle}
                                  disabled={actionLoading}
                                  onClick={() => handleForceTerminateCall(call.sessionId)}
                                  className="text-[11px] py-1"
                                >
                                  Disconnect
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* STEALTH VIDEO INSPECTION MODAL */}
              {inspectingSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                  <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-[#E8E4F0] flex flex-col max-h-[90vh]">
                    {/* Modal Header */}
                    <div className="p-5 bg-[#27243A] text-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FF6347] flex items-center justify-center text-white">
                          <Eye className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-base">Live Video Call Observation Studio</h3>
                            <Badge variant="adult" className="text-[10px] py-0 px-2 bg-emerald-500 text-white border-none">
                              REAL-TIME P2P WEBRTC
                            </Badge>
                          </div>
                          <p className="text-[11px] text-gray-300">
                            Admin live camera monitor: viewing real-time video stream of both caller and receiver.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAdminAudioMuted(!adminAudioMuted)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                            adminAudioMuted
                              ? 'bg-white/10 hover:bg-white/20 text-gray-300'
                              : 'bg-[#218A58] text-white shadow-md'
                          }`}
                          title={adminAudioMuted ? 'Listen in to audio' : 'Mute audio monitor'}
                        >
                          {adminAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          <span>{adminAudioMuted ? 'Listen Audio' : 'Mute Audio'}</span>
                        </button>
                        <button
                          onClick={() => setInspectingSession(null)}
                          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                      {/* Modal Dual Video Feeds */}
                      <div className="p-6 overflow-y-auto space-y-6 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Caller Feed Card */}
                          <div className="rounded-2xl bg-black border border-gray-800 p-3 text-white space-y-3">
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-800">
                              <span className="font-bold text-[#B9A7F5]">Caller (Peer 1): {inspectingSession.callerId?.displayName}</span>
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                {adminStreamStatus.caller === 'connected' ? 'Live Camera Feed' : 'Connecting Stream...'}
                              </span>
                            </div>
                            {/* Real Live Camera Video Element */}
                            <div className="relative aspect-video rounded-xl bg-gray-900 overflow-hidden flex items-center justify-center border border-gray-800">
                              <video
                                ref={adminCallerVideoRef}
                                autoPlay
                                playsInline
                                muted={adminAudioMuted}
                                className={`w-full h-full object-cover ${adminStreamStatus.caller === 'connected' ? 'block' : 'hidden'}`}
                              />
                              {adminStreamStatus.caller !== 'connected' && (
                                <div className="text-center z-20 space-y-2 p-4">
                                  <div className="w-14 h-14 rounded-full bg-[#7960D8] text-white flex items-center justify-center text-xl font-black mx-auto shadow-lg animate-pulse">
                                    {inspectingSession.callerId?.displayName?.charAt(0).toUpperCase() || 'C'}
                                  </div>
                                  <div className="font-bold text-sm text-white">
                                    {inspectingSession.callerId?.displayName}
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-white/20 text-white font-mono">
                                    Connecting Live Camera Stream...
                                  </span>
                                </div>
                              )}
                              <div className="absolute bottom-2 left-2 z-20 text-[10px] bg-black/70 px-2 py-0.5 rounded text-gray-300 font-mono">
                                Caller Live Video • {inspectingSession.callerId?.displayName}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 space-y-1">
                              <div>Email: <strong className="text-white">{inspectingSession.callerId?.email}</strong></div>
                              <div>Role: <strong className="text-[#B9A7F5]">{inspectingSession.callerId?.role}</strong> • Gender: <strong className="text-white">{inspectingSession.callerId?.gender || 'MALE'}</strong></div>
                            </div>
                          </div>

                          {/* Receiver Feed Card */}
                          <div className="rounded-2xl bg-black border border-gray-800 p-3 text-white space-y-3">
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-800">
                              <span className="font-bold text-[#FF6347]">Receiver (Peer 2): {inspectingSession.receiverId?.displayName}</span>
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                {adminStreamStatus.receiver === 'connected' ? 'Live Camera Feed' : 'Connecting Stream...'}
                              </span>
                            </div>
                            {/* Real Live Camera Video Element */}
                            <div className="relative aspect-video rounded-xl bg-gray-900 overflow-hidden flex items-center justify-center border border-gray-800">
                              <video
                                ref={adminReceiverVideoRef}
                                autoPlay
                                playsInline
                                muted={adminAudioMuted}
                                className={`w-full h-full object-cover ${adminStreamStatus.receiver === 'connected' ? 'block' : 'hidden'}`}
                              />
                              {adminStreamStatus.receiver !== 'connected' && (
                                <div className="text-center z-20 space-y-2 p-4">
                                  <div className="w-14 h-14 rounded-full bg-[#FF6347] text-white flex items-center justify-center text-xl font-black mx-auto shadow-lg animate-pulse">
                                    {inspectingSession.receiverId?.displayName?.charAt(0).toUpperCase() || 'R'}
                                  </div>
                                  <div className="font-bold text-sm text-white">
                                    {inspectingSession.receiverId?.displayName}
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-white/20 text-white font-mono">
                                    Connecting Live Camera Stream...
                                  </span>
                                </div>
                              )}
                              <div className="absolute bottom-2 left-2 z-20 text-[10px] bg-black/70 px-2 py-0.5 rounded text-gray-300 font-mono">
                                Receiver Live Video • {inspectingSession.receiverId?.displayName}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 space-y-1">
                              <div>Email: <strong className="text-white">{inspectingSession.receiverId?.email}</strong></div>
                              <div>Role: <strong className="text-[#FF6347]">{inspectingSession.receiverId?.role}</strong> • Gender: <strong className="text-pink-400 font-bold">{inspectingSession.receiverId?.gender || 'FEMALE'}</strong></div>
                            </div>
                          </div>
                        </div>

                      {/* Direct Moderation Control Box */}
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-[#D92D20]" />
                            <span className="font-bold text-sm text-rose-900">Direct Safety Intervention</span>
                          </div>
                          <span className="text-xs text-rose-700 font-medium">Session: {inspectingSession.sessionId}</span>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-rose-900 mb-1">
                            Intervention / Violation Reason
                          </label>
                          <input
                            type="text"
                            value={moderationReason}
                            onChange={(e) => setModerationReason(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-rose-300 text-xs text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            placeholder="State reason for disconnection or moderation action..."
                          />
                        </div>

                        <div className="flex flex-wrap gap-3 pt-1">
                          <Button
                            variant="danger"
                            size="md"
                            icon={XCircle}
                            disabled={actionLoading}
                            onClick={() => handleForceTerminateCall(inspectingSession.sessionId)}
                            className="bg-[#D92D20] text-white"
                          >
                            Disconnect / Terminate Call Now
                          </Button>

                          {inspectingSession.callerId?._id && (
                            <Button
                              variant="outline"
                              size="md"
                              disabled={actionLoading}
                              onClick={() => handleToggleUserStatus(inspectingSession.callerId._id, 'ACTIVE')}
                              className="border-rose-300 text-rose-800 hover:bg-rose-100"
                            >
                              Suspend Caller ({inspectingSession.callerId.displayName})
                            </Button>
                          )}

                          {inspectingSession.receiverId?._id && (
                            <Button
                              variant="outline"
                              size="md"
                              disabled={actionLoading}
                              onClick={() => handleToggleUserStatus(inspectingSession.receiverId._id, 'ACTIVE')}
                              className="border-rose-300 text-rose-800 hover:bg-rose-100"
                            >
                              Suspend Receiver ({inspectingSession.receiverId.displayName})
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REAL USERS DIRECTORY */}
          {activeTab === 'users' && (
            <Card className="p-6 border-[#E8E4F0]">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#27243A]">Real Registered Users</h2>
                  <p className="text-xs text-[#777387]">
                    Live MongoDB user accounts. No simulated or mock data. Showing real adult declarations and statuses.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Input */}
                  <div className="relative min-w-[220px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#777387]" />
                    <input
                      type="text"
                      placeholder="Search name or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadData()}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] text-xs text-[#27243A] focus:outline-none focus:border-[#7960D8]"
                    />
                  </div>

                  {/* Role Filter */}
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] text-xs text-[#27243A] focus:outline-none"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="CUSTOMER">Customers (Members)</option>
                    <option value="CREATOR">Creators</option>
                    <option value="ADMIN">Admins</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] text-xs text-[#27243A] focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="SUSPENDED">Suspended Only</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-[#777387] text-xs">
                  Retrieving genuine user records from MongoDB...
                </div>
              ) : usersList.length === 0 ? (
                <div className="py-16 text-center text-[#777387] text-xs border border-dashed border-[#E8E4F0] rounded-2xl">
                  No registered users match your query.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#27243A]">
                    <thead className="bg-[#F1EDFF] text-[#777387] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-3 px-3 rounded-l-lg">User Identity</th>
                        <th className="py-3 px-3">Phone & Mobile</th>
                        <th className="py-3 px-3">Aadhaar (UIDAI)</th>
                        <th className="py-3 px-3">Role & Gender</th>
                        <th className="py-3 px-3">Bank Details</th>
                        <th className="py-3 px-3">Age Verification</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 rounded-r-lg text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E4F0]">
                      {usersList.map((u) => (
                        <tr key={u._id} className="hover:bg-[#F1EDFF]/40 transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#7960D8] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {u.displayName?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-[#27243A]">{u.displayName}</div>
                                <div className="text-[11px] text-[#777387] font-mono">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            {u.phoneNumber ? (
                              <span className="font-mono font-bold text-xs text-[#27243A] flex items-center gap-1">
                                <Smartphone className="w-3.5 h-3.5 text-[#7960D8]" />
                                {u.phoneNumber}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs italic">Not Provided</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            {u.aadhaarNumber ? (
                              <span className="font-mono font-bold text-xs text-[#7960D8] bg-[#F1EDFF] px-2 py-0.5 rounded border border-[#E8E4F0]">
                                {u.aadhaarNumber}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs italic">Not Provided</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant={u.role === 'ADMIN' ? 'adult' : u.role === 'CREATOR' ? 'brand' : 'default'}>
                                {u.role}
                              </Badge>
                              <span className="text-[11px] font-semibold text-[#777387]">({u.gender || 'MALE'})</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            {u.bankDetails?.accountNumber ? (
                              <div className="text-[11px] space-y-0.5">
                                <span className="font-bold text-[#27243A] block">{u.bankDetails.bankName || 'Bank'}</span>
                                <span className="font-mono text-[#777387]">A/C: {u.bankDetails.accountNumber}</span>
                                <span className="text-[10px] text-gray-400 block font-mono">IFSC: {u.bankDetails.ifscCode}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            {u.isAdult ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#218A58]">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                18+ Legally Affirmed
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#D92D20] font-bold">Underage Rejected</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'ACTIVE'
                                  ? 'bg-[#E8F8F0] text-[#218A58]'
                                  : 'bg-[#FFF0EC] text-[#D92D20]'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            {u.role !== 'ADMIN' && (
                              <Button
                                variant={u.status === 'SUSPENDED' ? 'outline' : 'danger'}
                                size="sm"
                                disabled={actionLoading}
                                onClick={() => handleToggleUserStatus(u._id, u.status)}
                                className="text-[11px] py-1"
                              >
                                {u.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend Account'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination Controls */}
                  {usersPagination.pages > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#E8E4F0]">
                      <span className="text-xs text-[#777387]">
                        Page {usersPage} of {usersPagination.pages} ({usersPagination.total} registered users)
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={usersPage <= 1}
                          onClick={() => setUsersPage(usersPage - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={usersPage >= usersPagination.pages}
                          onClick={() => setUsersPage(usersPage + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* TAB 4: CREATOR KYC QUEUE */}
          {activeTab === 'kyc' && (
            <div className="space-y-4">
              {loading ? (
                <div className="py-20 text-center text-[#777387] text-sm">Loading KYC verification queue...</div>
              ) : kycQueue.length === 0 ? (
                <Card className="py-16 text-center text-[#777387] space-y-2 border-[#E8E4F0] bg-white">
                  <ShieldCheck className="w-12 h-12 mx-auto text-[#218A58]" />
                  <div className="text-[#27243A] font-bold text-base">KYC Verification Queue Clear</div>
                  <div className="text-xs">All pending creator verification applications have been reviewed.</div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {kycQueue.map((item) => {
                    const creator = item.creator || item;
                    const record = item.latestKycRecord || {};
                    const user = creator.userId || {};
                    const creatorId = creator._id;

                    return (
                      <Card key={creatorId} className="border-[#E8E4F0] bg-white shadow-card p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E4F0]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#7960D8] text-white flex items-center justify-center font-bold">
                              {creator.displayName?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-[#27243A]">{creator.displayName}</div>
                              <div className="text-xs text-[#777387]">{user.email || 'N/A'}</div>
                            </div>
                          </div>
                          <Badge variant="warning">PENDING KYC REVIEW</Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs bg-[#F1EDFF] p-3 rounded-xl border border-[#E8E4F0]">
                          <div>
                            <span className="text-[#777387] block text-[10px]">ID Type:</span>
                            <span className="font-bold text-[#27243A]">{record.idType || 'GOVT_ID'}</span>
                          </div>
                          <div>
                            <span className="text-[#777387] block text-[10px]">Phone Number:</span>
                            <span className="font-bold text-[#27243A]">{user.phoneNumber || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[#777387] block text-[10px]">Aadhaar (UIDAI):</span>
                            <span className="font-bold text-[#7960D8]">{user.aadhaarNumber || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[#777387] block text-[10px]">Declared Age:</span>
                            <span className="font-bold text-[#27243A]">{record.verifiedAgeYears || 21} Years</span>
                          </div>
                          <div>
                            <span className="text-[#777387] block text-[10px]">Proposed Rate:</span>
                            <span className="font-bold text-[#7960D8]">₹{(creator.pricePerMinutePaise / 100).toFixed(0)}/min</span>
                          </div>
                          <div>
                            <span className="text-[#777387] block text-[10px]">Gender:</span>
                            <span className="font-bold text-[#27243A]">{user.gender || 'FEMALE'}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleReviewCreator(creatorId, 'REJECT')}
                          >
                            Reject Application
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Check}
                            disabled={actionLoading}
                            onClick={() => handleReviewCreator(creatorId, 'APPROVE')}
                            className="bg-[#218A58] hover:bg-[#1a6e46]"
                          >
                            Approve & Verify Creator
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SAFETY REPORTS */}
          {activeTab === 'reports' && (
            <Card className="p-6 border-[#E8E4F0]">
              <h2 className="text-lg font-bold text-[#27243A] mb-1">Safety Reports Queue</h2>
              <p className="text-xs text-[#777387] mb-6">
                Active incident reports submitted by callers and creators for violations.
              </p>

              {reports.length === 0 ? (
                <div className="py-12 text-center text-[#777387] text-xs">
                  No open safety reports in queue.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#27243A]">
                    <thead className="bg-[#F1EDFF] text-[#777387] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Reporter</th>
                        <th className="py-2.5 px-3">Reported User</th>
                        <th className="py-2.5 px-3">Reason</th>
                        <th className="py-2.5 px-3">Severity</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E4F0]">
                      {reports.map((r) => (
                        <tr key={r._id} className="hover:bg-[#F1EDFF]/40">
                          <td className="py-3 px-3 font-semibold">{r.reporterId?.displayName || 'User'}</td>
                          <td className="py-3 px-3 font-semibold text-[#D92D20]">{r.reportedUserId?.displayName || 'Reported'}</td>
                          <td className="py-3 px-3">{r.reason}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              {r.severity || 'MEDIUM'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="warning">{r.status}</Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                api.patch(`/admin/reports/${r._id}/resolve`, { resolution: 'RESOLVED', notes: 'Actioned by admin' })
                                  .then(() => setReports((prev) => prev.filter((item) => item._id !== r._id)));
                              }}
                            >
                              Resolve
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 6: PAYMENTS & PAYOUTS */}
          {activeTab === 'payouts' && (
            <Card className="p-6 border-[#E8E4F0] space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-[#27243A]">Creator Payout Processing & Bank Settlements</h2>
                  <p className="text-xs text-[#777387]">
                    Review female creator bank details and Aadhaar, send amount, and approve or reject payout requests.
                  </p>
                </div>
                <Badge variant="adult" className="text-xs bg-[#218A58] text-white border-none">
                  Double-Entry Ledger Verified
                </Badge>
              </div>

              {payouts.length === 0 ? (
                <div className="py-16 text-center text-[#777387] space-y-2">
                  <CreditCard className="w-10 h-10 mx-auto text-gray-300" />
                  <div className="text-sm font-semibold text-[#27243A]">No Payout Requests in Queue</div>
                  <div className="text-xs">All female creator withdrawals have been processed or settled.</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#27243A]">
                    <thead className="bg-[#F1EDFF] text-[#777387] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-3 px-3 rounded-l-lg">Female Creator</th>
                        <th className="py-3 px-3">Phone & Aadhaar</th>
                        <th className="py-3 px-3">Withdrawal Amount</th>
                        <th className="py-3 px-3">Bank Account Details</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">UTR / Txn Ref</th>
                        <th className="py-3 px-3 rounded-r-lg text-right">Admin Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E4F0]">
                      {payouts.map((p) => {
                        const payoutKey = p.payoutId || p._id;
                        const creator = p.creatorId || {};
                        const phone = creator.phoneNumber || p.details?.phoneNumber || 'N/A';
                        const aadhaar = creator.aadhaarNumber || p.details?.aadhaarNumber || 'N/A';
                        const bankName = p.details?.bankName || creator.bankDetails?.bankName || 'Bank';
                        const acNumber = p.details?.bankAccountNumber || creator.bankDetails?.accountNumber || 'N/A';
                        const ifsc = p.details?.ifscCode || creator.bankDetails?.ifscCode || 'N/A';
                        const holderName = p.details?.accountHolderName || creator.bankDetails?.accountHolderName || creator.displayName;
                        const upi = p.details?.upiId || creator.bankDetails?.upiId || '';

                        return (
                          <tr key={p._id} className="hover:bg-[#F1EDFF]/40 transition-colors">
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-[#27243A] text-sm flex items-center gap-1.5">
                                <span>{creator.displayName || 'Female Creator'}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 font-bold">GIRL</span>
                              </div>
                              <div className="text-[11px] text-[#777387] font-mono">{creator.email || 'N/A'}</div>
                              <div className="text-[10px] text-gray-400 font-mono">ID: {payoutKey}</div>
                            </td>

                            <td className="py-3.5 px-3 space-y-1">
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#27243A]">
                                <Smartphone className="w-3.5 h-3.5 text-[#7960D8]" />
                                <span>{phone}</span>
                              </div>
                              <div className="text-[10px] font-mono font-bold text-[#7960D8] bg-[#F1EDFF] px-2 py-0.5 rounded inline-block">
                                UID: {aadhaar}
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="font-mono font-black text-base text-[#218A58]">
                                ₹{(p.amountPaise / 100).toFixed(2)}
                              </div>
                              <span className="text-[10px] text-[#777387]">{p.method}</span>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="p-2.5 rounded-xl bg-[#F1EDFF]/60 border border-[#E8E4F0] space-y-1 text-[11px]">
                                <div><strong className="text-[#27243A]">{holderName}</strong> ({bankName})</div>
                                <div className="font-mono text-[#27243A] font-bold">A/C: {acNumber}</div>
                                <div className="font-mono text-[#7960D8]">IFSC: {ifsc}</div>
                                {upi && <div className="font-mono text-emerald-700 font-semibold">UPI: {upi}</div>}
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <Badge variant={p.status === 'PROCESSED' ? 'success' : p.status === 'REJECTED' ? 'danger' : 'warning'}>
                                {p.status}
                              </Badge>
                              {p.transactionReference && (
                                <div className="text-[10px] text-gray-500 font-mono mt-1">Ref: {p.transactionReference}</div>
                              )}
                            </td>

                            <td className="py-3.5 px-3">
                              {p.status === 'PENDING' ? (
                                <input
                                  type="text"
                                  placeholder="Enter Bank UTR..."
                                  value={txnRefs[payoutKey] || ''}
                                  onChange={(e) => setTxnRefs({ ...txnRefs, [payoutKey]: e.target.value })}
                                  className="w-28 px-2 py-1 rounded-lg border border-[#E8E4F0] text-xs font-mono bg-white"
                                />
                              ) : (
                                <span className="text-gray-400 font-mono text-[11px]">{p.transactionReference || 'N/A'}</span>
                              )}
                            </td>

                            <td className="py-3.5 px-3 text-right">
                              {p.status === 'PENDING' ? (
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => handleProcessPayout(payoutKey, 'PROCESSED')}
                                    className="bg-[#218A58] hover:bg-[#1a6e46] text-white shadow-sm font-bold"
                                  >
                                    Accept & Send Amount
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => handleProcessPayout(payoutKey, 'REJECTED')}
                                    className="border-rose-300 text-rose-700 hover:bg-rose-50"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 font-semibold">
                                  {p.status === 'PROCESSED' ? 'Paid & Settled' : 'Rejected & Refunded'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 7: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <Card className="p-6 border-[#E8E4F0]">
              <h2 className="text-lg font-bold text-[#27243A] mb-1">Administrative Audit Trail</h2>
              <p className="text-xs text-[#777387] mb-6">
                Immutable, tamper-evident logs of all moderation and administrative actions.
              </p>

              {auditLogs.length === 0 ? (
                <div className="py-12 text-center text-[#777387] text-xs">
                  No administrative actions logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#27243A]">
                    <thead className="bg-[#F1EDFF] text-[#777387] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Admin</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Target</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E4F0]">
                      {auditLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-[#F1EDFF]/40">
                          <td className="py-3 px-3 font-semibold">{log.adminId?.displayName || 'Administrator'}</td>
                          <td className="py-3 px-3 font-mono font-bold text-[#7960D8]">{log.action}</td>
                          <td className="py-3 px-3 text-[#777387]">{log.targetType}: {log.targetId}</td>
                          <td className="py-3 px-3 text-[#777387]">{new Date(log.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 8: POLICY SETTINGS */}
          {activeTab === 'settings' && (
            <Card className="p-6 border-[#E8E4F0] space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#27243A]">Platform Governance & Cooldown Policies</h2>
                <p className="text-xs text-[#777387]">Configure server-side timers and settlement rules.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-1">
                  <span className="text-xs font-bold text-[#27243A]">Togilo 6-Hour Free Call Cooldown</span>
                  <div className="text-xl font-black text-[#7960D8]">6.0 Hours (21,600s)</div>
                  <span className="text-[10px] text-[#777387]">Server enforced with atomic claim reservations</span>
                </div>

                <div className="p-4 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-1">
                  <span className="text-xs font-bold text-[#27243A]">Maximum Free Call Duration</span>
                  <div className="text-xl font-black text-[#FF6347]">120 Seconds (2.0 min)</div>
                  <span className="text-[10px] text-[#777387]">Automatic disconnect upon timer expiry</span>
                </div>

                <div className="p-4 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-1">
                  <span className="text-xs font-bold text-[#27243A]">Platform Revenue Split</span>
                  <div className="text-xl font-black text-[#218A58]">30% Platform / 70% Creator</div>
                  <span className="text-[10px] text-[#777387]">Double-entry ledger settled automatically</span>
                </div>

                <div className="p-4 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-1">
                  <span className="text-xs font-bold text-[#27243A]">Statutory Age Gate</span>
                  <div className="text-xl font-black text-[#27243A]">18+ Strict Mandate</div>
                  <span className="text-[10px] text-[#777387]">Perjury legal affirmation recorded</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
export default AdminDashboardPage;
