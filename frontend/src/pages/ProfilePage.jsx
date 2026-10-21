import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User as UserIcon,
  ShieldCheck,
  Video,
  Wallet,
  Settings,
  Clock,
  Heart,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Save,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { api } from '../services/api';

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { wallet, openWalletModal } = useWallet();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'calls' | 'transactions'
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [genderPreference, setGenderPreference] = useState(user?.genderPreference || 'ANY');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [aadhaarNumber, setAadhaarNumber] = useState(user?.aadhaarNumber || '');
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: user?.bankDetails?.accountHolderName || '',
    accountNumber: user?.bankDetails?.accountNumber || '',
    ifscCode: user?.bankDetails?.ifscCode || '',
    bankName: user?.bankDetails?.bankName || '',
    upiId: user?.bankDetails?.upiId || '',
  });
  const [languages, setLanguages] = useState(
    Array.isArray(user?.languages) ? user.languages.join(', ') : 'English, Hindi'
  );

  // Call History State
  const [callHistory, setCallHistory] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [callPagination, setCallPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Ledger / Payment History State
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setGenderPreference(user.genderPreference || 'ANY');
      setPhoneNumber(user.phoneNumber || '');
      setAadhaarNumber(user.aadhaarNumber || '');
      setBankDetails({
        accountHolderName: user.bankDetails?.accountHolderName || '',
        accountNumber: user.bankDetails?.accountNumber || '',
        ifscCode: user.bankDetails?.ifscCode || '',
        bankName: user.bankDetails?.bankName || '',
        upiId: user.bankDetails?.upiId || '',
      });
      setLanguages(
        Array.isArray(user.languages) ? user.languages.join(', ') : 'English, Hindi'
      );
    }
  }, [user]);

  // Load Call History when tab is active
  useEffect(() => {
    if (activeTab === 'calls') {
      fetchCallHistory(1);
    } else if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);

  const fetchCallHistory = async (page = 1) => {
    setLoadingCalls(true);
    try {
      const res = await api.get(`/calls/history?page=${page}&limit=10`);
      if (res.success && res.data) {
        setCallHistory(res.data.calls || []);
        setCallPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error('Failed to load call history:', err);
    } finally {
      setLoadingCalls(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const res = await api.get('/wallet/ledger?limit=25');
      if (res.success && res.data) {
        setTransactions(res.data.entries || []);
      }
    } catch (err) {
      console.error('Failed to load transaction ledger:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const langsArray = languages
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);

      await updateProfile({
        displayName,
        bio,
        genderPreference,
        phoneNumber,
        aadhaarNumber,
        bankDetails,
        languages: langsArray,
      });

      setSuccessMsg('Your profile, verification IDs, and bank details have been saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header Profile Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#F1EDFF] via-white to-[#FFF0EC] border border-[#E8E4F0] p-6 sm:p-8 mb-8 overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#7960D8] text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-[#7960D8]/20">
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-[#27243A]">
                  {user?.displayName || 'User'}
                </h1>
                <Badge variant={user?.role === 'CREATOR' ? 'brand' : 'default'} className="text-xs">
                  {user?.role}
                </Badge>
                {user?.isAdult && (
                  <Badge variant="success" className="text-xs flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    18+ VERIFIED
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[#777387] mt-1">{user?.email}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-[#777387]">
                <span>Gender: <strong className="text-[#27243A] font-semibold">{user?.gender || 'Unspecified'}</strong></span>
                <span>•</span>
                <span>Preference: <strong className="text-[#7960D8] font-semibold">{user?.genderPreference || 'ANY'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Wallet Stats */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-white border border-[#E8E4F0] shadow-sm">
              <span className="text-xs text-[#777387] block font-medium">Balance</span>
              <span className="text-xl font-black text-[#27243A]">
                ₹{(wallet?.balancePaise / 100 || 0).toFixed(0)}
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Wallet}
              onClick={openWalletModal}
            >
              Top Up
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E8E4F0] mb-8 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#7960D8] text-white shadow-md shadow-[#7960D8]/20'
              : 'text-[#777387] hover:text-[#27243A] hover:bg-[#F1EDFF]'
          }`}
        >
          <Settings className="w-4 h-4" />
          Profile & Preferences
        </button>

        <button
          onClick={() => setActiveTab('calls')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'calls'
              ? 'bg-[#7960D8] text-white shadow-md shadow-[#7960D8]/20'
              : 'text-[#777387] hover:text-[#27243A] hover:bg-[#F1EDFF]'
          }`}
        >
          <Video className="w-4 h-4" />
          Call History
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-[#7960D8] text-white shadow-md shadow-[#7960D8]/20'
              : 'text-[#777387] hover:text-[#27243A] hover:bg-[#F1EDFF]'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Payment History
        </button>
      </div>

      {/* TAB 1: Profile & Preferences */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-[#27243A] mb-1">Account Information</h2>
              <p className="text-sm text-[#777387] mb-6">
                Update your public profile and your preferred matching filters.
              </p>

              {successMsg && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-[#27243A] mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    maxLength={40}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E4F0] focus:ring-2 focus:ring-[#7960D8] focus:border-transparent text-sm font-medium text-[#27243A] outline-none"
                    placeholder="Your screen name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#27243A] mb-1.5">
                    Bio / Status
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={300}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E4F0] focus:ring-2 focus:ring-[#7960D8] focus:border-transparent text-sm font-medium text-[#27243A] outline-none resize-none"
                    placeholder="Tell callers about yourself, hobbies, or what you enjoy chatting about..."
                  />
                  <div className="text-right text-[11px] text-[#777387] mt-1">
                    {bio.length}/300 characters
                  </div>
                </div>

                {/* Verification IDs: Phone Number & Aadhaar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#F1EDFF]/50 border border-[#E8E4F0]">
                  <div>
                    <label className="block text-xs font-bold text-[#27243A] mb-1.5">
                      Phone Number (Visible to Admin)
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E4F0] bg-white text-xs font-medium text-[#27243A] outline-none focus:ring-2 focus:ring-[#7960D8]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#27243A] mb-1.5">
                      Aadhaar Number (UIDAI - Visible to Admin)
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value)}
                      placeholder="XXXX XXXX 1234"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E4F0] bg-white text-xs font-medium text-[#27243A] outline-none focus:ring-2 focus:ring-[#7960D8]"
                    />
                  </div>
                </div>

                {/* Bank Account Details (for Earnings Withdrawal) */}
                <div className="p-4 rounded-2xl bg-[#FFF0EC]/50 border border-[#FFC7BD] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#27243A] flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-[#FF6347]" />
                      Withdrawal Bank Details (For Creator Payouts)
                    </span>
                    <span className="text-[10px] text-[#777387]">Direct IMPS/NEFT transfer</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#27243A] mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={bankDetails.accountHolderName}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                        placeholder="As on Bank Passbook"
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E4F0] bg-white text-xs text-[#27243A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#27243A] mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankDetails.bankName}
                        onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                        placeholder="e.g. HDFC / SBI / ICICI"
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E4F0] bg-white text-xs text-[#27243A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#27243A] mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                        placeholder="e.g. 50100234567890"
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E4F0] bg-white text-xs font-mono text-[#27243A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#27243A] mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={bankDetails.ifscCode}
                        onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                        placeholder="e.g. HDFC0001234"
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E4F0] bg-white text-xs font-mono uppercase text-[#27243A] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#27243A] mb-1">
                      UPI ID (Instant VPA Option)
                    </label>
                    <input
                      type="text"
                      value={bankDetails.upiId}
                      onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                      placeholder="e.g. name@okhdfcbank"
                      className="w-full px-3 py-2 rounded-xl border border-[#E8E4F0] bg-white text-xs text-[#27243A] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#27243A] mb-1.5">
                    Languages (comma separated)
                  </label>
                  <input
                    type="text"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E4F0] focus:ring-2 focus:ring-[#7960D8] focus:border-transparent text-sm font-medium text-[#27243A] outline-none"
                    placeholder="e.g. English, Hindi, Spanish"
                  />
                </div>

                {/* Gender Preference Cards */}
                <div>
                  <label className="block text-sm font-bold text-[#27243A] mb-2">
                    Matching Preference (Who do you want to connect with?)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'ANY', label: 'Everyone', desc: 'Connect with any verified adult' },
                      { value: 'FEMALE', label: 'Female Only', desc: 'Prioritize female participants' },
                      { value: 'MALE', label: 'Male Only', desc: 'Prioritize male participants' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGenderPreference(opt.value)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          genderPreference === opt.value
                            ? 'border-[#7960D8] bg-[#F1EDFF] shadow-sm'
                            : 'border-[#E8E4F0] bg-white hover:border-[#B9A7F5]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-[#27243A]">{opt.label}</span>
                          {genderPreference === opt.value && (
                            <div className="w-2 h-2 rounded-full bg-[#7960D8]" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#777387] leading-tight">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    icon={Save}
                    loading={loading}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Statutory & Verification Info */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-[#218A58]" />
                <h3 className="font-bold text-[#27243A]">18+ Adult Certification</h3>
              </div>
              <p className="text-xs text-[#777387] mb-4">
                Your account is confirmed and recorded under the Spotizan statutory adult eligibility protocol.
              </p>
              <div className="space-y-2 text-xs bg-[#F1EDFF] p-3 rounded-xl border border-[#E8E4F0]">
                <div className="flex justify-between">
                  <span className="text-[#777387]">Status:</span>
                  <span className="font-bold text-[#218A58]">Legally Affirmed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#777387]">Registered Date:</span>
                  <span className="font-medium text-[#27243A]">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Calling Hub for Male Users vs Creator Studio for Female Accounts */}
            {user?.gender === 'MALE' ? (
              <Card className="p-6 bg-gradient-to-br from-[#F1EDFF] to-white border-[#B9A7F5] space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Video className="w-5 h-5 text-[#7960D8]" />
                    <h3 className="font-bold text-[#27243A]">Voice & Video Calling</h3>
                  </div>
                  <p className="text-xs text-[#777387] leading-relaxed">
                    Start random audio or video matchmaking, or browse verified female creators on Discover to connect instantly with live voice, video & messaging.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Link to="/random-call">
                    <Button variant="primary" size="sm" icon={Video} className="w-full">
                      Start Random Call
                    </Button>
                  </Link>
                  <Link to="/discover">
                    <Button variant="outline" size="sm" icon={ArrowRight} className="w-full">
                      Discover Female Creators
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : user?.role === 'CREATOR' ? (
              <Card className="p-6 bg-gradient-to-br from-[#F1EDFF] to-white border-[#B9A7F5]">
                <h3 className="font-bold text-[#7960D8] mb-1">Creator Studio</h3>
                <p className="text-xs text-[#777387] mb-4">
                  Manage your paid per-minute calling rates, availability, and view withdrawable earnings.
                </p>
                <Link to="/creator/dashboard">
                  <Button variant="primary" size="sm" icon={ArrowRight} className="w-full">
                    Go to Creator Studio
                  </Button>
                </Link>
              </Card>
            ) : (
              <Card className="p-6 border-[#E8E4F0]">
                <h3 className="font-bold text-[#27243A] mb-1">Earn as a Creator</h3>
                <p className="text-xs text-[#777387] mb-4">
                  Verified adult creators earn per-minute rates on one-to-one video calls with instant wallet settlements.
                </p>
                <Link to="/creator/apply">
                  <Button variant="outline" size="sm" icon={ExternalLink} className="w-full">
                    Apply for Creator Status
                  </Button>
                </Link>
              </Card>
            )}

            {/* Safety & Guidelines Links */}
            <Card className="p-6">
              <h3 className="font-bold text-[#27243A] mb-2">Safety & Controls</h3>
              <p className="text-xs text-[#777387] mb-3">
                Review community standards or submit reports regarding unwanted behavior.
              </p>
              <div className="flex flex-col gap-2">
                <Link to="/safety" className="text-xs text-[#7960D8] font-bold hover:underline">
                  → Community Safety Guidelines
                </Link>
                <Link to="/privacy" className="text-xs text-[#7960D8] font-bold hover:underline">
                  → Privacy & Data Retention Policy
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: Real Call History */}
      {activeTab === 'calls' && (
        <Card className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#27243A]">Call Session History</h2>
              <p className="text-sm text-[#777387]">
                Live records of your completed and attempted video calls from MongoDB.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() => fetchCallHistory(callPagination.page)}
              loading={loadingCalls}
            >
              Refresh
            </Button>
          </div>

          {loadingCalls ? (
            <div className="py-12 text-center text-sm text-[#777387]">
              Loading genuine call session history...
            </div>
          ) : callHistory.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-[#E8E4F0] rounded-2xl p-8">
              <Video className="w-10 h-10 text-[#B9A7F5] mx-auto mb-3" />
              <h3 className="font-bold text-[#27243A] text-base mb-1">No call sessions found</h3>
              <p className="text-xs text-[#777387] max-w-sm mx-auto mb-4">
                You have not participated in any random queue or direct video calls yet. Join the queue to make your first call!
              </p>
              <Link to="/queue">
                <Button variant="primary" size="sm" icon={Video}>
                  Start Video Chat
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E8E4F0] text-xs font-bold text-[#777387]">
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Peer</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3">Billing</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4F0]">
                  {callHistory.map((call) => {
                    const isCaller = call.callerId?._id === user?._id;
                    const peer = isCaller ? call.receiverId : call.callerId;

                    return (
                      <tr key={call._id || call.sessionId} className="hover:bg-[#F1EDFF]/50 transition-colors">
                        <td className="py-3.5 font-bold text-xs text-[#27243A]">
                          {call.callType === 'RANDOM_QUEUE' ? 'Random Queue' : 'Direct Call'}
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#7960D8] text-white flex items-center justify-center text-xs font-bold">
                              {peer?.displayName?.charAt(0).toUpperCase() || 'P'}
                            </div>
                            <span className="font-semibold text-xs text-[#27243A]">
                              {peer?.displayName || 'Anonymous Caller'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 font-medium text-xs text-[#27243A]">
                          {call.durationSeconds ? `${call.durationSeconds}s` : '0s'}
                        </td>
                        <td className="py-3.5 text-xs">
                          {call.isFreeCall ? (
                            <Badge variant="success" className="text-[10px]">
                              FREE CALL
                            </Badge>
                          ) : (
                            <span className="font-bold text-[#7960D8]">
                              ₹{((call.ratePerMinutePaise || 700) / 100).toFixed(0)}/min
                            </span>
                          )}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              call.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : call.status === 'ACTIVE'
                                ? 'bg-blue-100 text-blue-800 animate-pulse'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {call.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-xs text-[#777387]">
                          {call.createdAt ? new Date(call.createdAt).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {callPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#E8E4F0]">
                  <span className="text-xs text-[#777387]">
                    Page {callPagination.page} of {callPagination.totalPages} ({callPagination.total} total calls)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={callPagination.page <= 1}
                      onClick={() => fetchCallHistory(callPagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={callPagination.page >= callPagination.totalPages}
                      onClick={() => fetchCallHistory(callPagination.page + 1)}
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

      {/* TAB 3: Payment & Transaction Ledger History */}
      {activeTab === 'transactions' && (
        <Card className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#27243A]">Wallet & Payment Ledger</h2>
              <p className="text-sm text-[#777387]">
                Audit-verified double-entry transaction records from your Spotizan wallet.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Wallet}
              onClick={openWalletModal}
            >
              Add Money
            </Button>
          </div>

          {loadingTransactions ? (
            <div className="py-12 text-center text-sm text-[#777387]">
              Loading transaction history...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-[#E8E4F0] rounded-2xl p-8">
              <Wallet className="w-10 h-10 text-[#B9A7F5] mx-auto mb-3" />
              <h3 className="font-bold text-[#27243A] text-base mb-1">No transactions found</h3>
              <p className="text-xs text-[#777387] max-w-sm mx-auto mb-4">
                Your wallet has not recorded any top-ups or call deductions yet.
              </p>
              <Button variant="primary" size="sm" icon={Wallet} onClick={openWalletModal}>
                Top Up Wallet with Razorpay
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E8E4F0] text-xs font-bold text-[#777387]">
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Balance After</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4F0]">
                  {transactions.map((tx) => {
                    const isCredit = tx.entryType === 'CREDIT' || tx.amountPaise > 0;
                    return (
                      <tr key={tx._id} className="hover:bg-[#F1EDFF]/50 transition-colors">
                        <td className="py-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              tx.category === 'TOPUP'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.category === 'CALL_DEBIT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {tx.category || tx.entryType}
                          </span>
                        </td>
                        <td className="py-3.5 text-xs text-[#27243A] font-medium max-w-xs truncate">
                          {tx.description || 'Wallet transaction'}
                        </td>
                        <td className="py-3.5 font-bold text-xs">
                          <span className={isCredit ? 'text-[#218A58]' : 'text-[#D92D20]'}>
                            {isCredit ? '+' : '-'}₹{Math.abs(tx.amountPaise / 100).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3.5 text-xs text-[#777387]">
                          ₹{((tx.balanceAfterPaise || 0) / 100).toFixed(2)}
                        </td>
                        <td className="py-3.5 text-xs text-[#777387]">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'N/A'}
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
    </div>
  );
}
