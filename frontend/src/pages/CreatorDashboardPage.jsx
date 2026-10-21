import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Card, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import {
  ShieldCheck,
  ShieldAlert,
  Coins,
  CheckCircle2,
  Clock,
  Radio,
  FileText,
  Upload,
  User,
  Sparkles,
} from 'lucide-react';

export function CreatorDashboardPage() {
  const { user } = useAuth();

  // Creator studio is strictly reserved for female creator accounts; male users discover & call
  if (user && (user.gender === 'MALE' || user.role === 'CUSTOMER')) {
    return <Navigate to="/discover" replace />;
  }

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Profile Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [ratePaise, setRatePaise] = useState(900); // 900 paise = ₹9.00
  const [languages, setLanguages] = useState(['English', 'Hindi']);
  const [isUpdating, setIsUpdating] = useState(false);

  // KYC Form state
  const [idType, setIdType] = useState('AADHAAR');
  const [idNumberMasked, setIdNumberMasked] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [consentAffirmation, setConsentAffirmation] = useState(false);
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // First try application status (accessible to all authenticated adult users)
      const res = await api.get('/creators/me/application-status');
      if (res.success && res.data) {
        const { profile: p, verificationStatus, rejectionReason } = res.data;
        if (p) {
          setProfile(p);
          setDisplayName(p.displayName || '');
          setBio(p.bio || '');
          setRatePaise(p.pricePerMinutePaise || 900);
          setLanguages(p.languages || ['English', 'Hindi']);
        } else {
          setProfile({
            verificationStatus: verificationStatus || 'NOT_SUBMITTED',
            rejectionReason: rejectionReason || '',
            isVerified: false,
            availabilityStatus: 'OFFLINE',
            pricePerMinutePaise: 900,
          });
        }
      }
    } catch (err) {
      // Fallback to direct /creators/me if available
      try {
        const directRes = await api.get('/creators/me');
        if (directRes.success && directRes.data?.profile) {
          const p = directRes.data.profile;
          setProfile(p);
          setDisplayName(p.displayName || '');
          setBio(p.bio || '');
          setRatePaise(p.pricePerMinutePaise || 900);
          setLanguages(p.languages || ['English', 'Hindi']);
        }
      } catch (innerErr) {
        setError(innerErr.message || 'Failed to load creator status');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.put('/creators/me', {
        displayName,
        bio,
        pricePerMinutePaise: Number(ratePaise),
        languages,
      });

      if (res.success && res.data?.profile) {
        setProfile(res.data.profile);
        setSuccessMsg('Creator profile and calling rates updated successfully.');
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvailabilityToggle = async (newStatus) => {
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.patch('/creators/me/availability', {
        availabilityStatus: newStatus,
      });

      if (res.success) {
        setProfile((prev) => ({ ...prev, availabilityStatus: newStatus }));
        setSuccessMsg(`Availability updated to ${newStatus}.`);
      }
    } catch (err) {
      setError(err.message || 'Failed to update availability.');
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingKyc(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/creators/me/kyc', {
        idType,
        idNumberMasked,
        documentUrl: documentUrl || 'https://spotizan-storage.local/demo-aadhaar.pdf',
        consentAffirmation,
      });

      if (res.success) {
        setProfile((prev) => ({
          ...prev,
          verificationStatus: 'PENDING',
        }));
        setSuccessMsg('KYC application submitted. Platform administrators will review your identity proof.');
      }
    } catch (err) {
      setError(err.message || 'KYC submission failed.');
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-[#777387] text-sm bg-white">
        Loading creator studio...
      </div>
    );
  }

  const rateInRupees = (ratePaise / 100).toFixed(2);
  const creatorEarningsPerMin = ((ratePaise * 0.7) / 100).toFixed(2);
  const platformFeePerMin = ((ratePaise * 0.3) / 100).toFixed(2);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 flex-1 bg-white text-[#27243A]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-[#27243A] tracking-tight">Creator Studio</h1>
            <Badge variant="purple">CREATOR HUB</Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#777387]">
            Manage your verified per-minute rate, availability status, identity verification, and earnings.
          </p>
        </div>

        {/* Real-time Status Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F1EDFF] border border-[#E8E4F0] rounded-xl text-xs font-semibold">
          <button
            onClick={() => handleAvailabilityToggle('ONLINE')}
            disabled={!profile?.isVerified}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              profile?.availabilityStatus === 'ONLINE'
                ? 'bg-[#218A58] text-white shadow-sm'
                : 'text-[#777387] hover:text-[#27243A] disabled:opacity-40'
            }`}
            title={!profile?.isVerified ? 'KYC Approval required before going Online' : ''}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Online</span>
          </button>

          <button
            onClick={() => handleAvailabilityToggle('BUSY')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              profile?.availabilityStatus === 'BUSY'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-[#777387] hover:text-[#27243A]'
            }`}
          >
            Busy
          </button>

          <button
            onClick={() => handleAvailabilityToggle('OFFLINE')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              profile?.availabilityStatus === 'OFFLINE'
                ? 'bg-[#27243A] text-white shadow-sm'
                : 'text-[#777387] hover:text-[#27243A]'
            }`}
          >
            Offline
          </button>
        </div>
      </div>

      {error && <Alert type="error" title="Action Error">{error}</Alert>}
      {successMsg && <Alert type="success" title="Success">{successMsg}</Alert>}

      {/* Live Call Receiving Station Callout Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#2A1B54] to-[#7960D8] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-white">Live Call Receiving Station</h3>
              <Badge variant="adult" className="bg-emerald-400 text-slate-950 font-black text-[9px] py-0 border-none">100% FREE TO RECEIVE</Badge>
            </div>
            <p className="text-xs text-purple-200">
              Girls receive all incoming calls free. Check your camera clarity, preview lighting, and answer incoming customer calls directly.
            </p>
          </div>
        </div>
        <Link to="/receive-calls" className="shrink-0">
          <Button variant="primary" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold border-none shadow-md">
            Open Receiving Station →
          </Button>
        </Link>
      </div>

      {/* KYC Status Banner */}
      {!profile?.isVerified ? (
        <Card className="bg-[#FFF0EC] border border-[#FF6347]/30 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white border border-[#FF6347]/40 text-[#D92D20] shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-[#27243A] text-base">KYC Identity Verification Required</h3>
                <Badge variant={profile?.verificationStatus === 'PENDING' ? 'warning' : 'adult'}>
                  {profile?.verificationStatus || 'UNSUBMITTED'}
                </Badge>
              </div>
              <p className="text-xs text-[#777387] leading-relaxed mb-3">
                To protect both customers and creators, you cannot accept paid video calls until your government ID and 18+ age proof are reviewed and approved by platform staff.
              </p>

              {profile?.verificationStatus === 'PENDING' ? (
                <div className="text-xs text-[#218A58] bg-[#E8F8F0] p-3 rounded-xl border border-[#218A58]/30 flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-[#218A58]" />
                  <span>Application Under Staff Review. Typical approval SLA is under 24 hours.</span>
                </div>
              ) : (
                <form onSubmit={handleKycSubmit} className="space-y-4 pt-2 border-t border-[#FF6347]/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#27243A] mb-1">
                        Government ID Type
                      </label>
                      <select
                        value={idType}
                        onChange={(e) => setIdType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E4F0] text-xs text-[#27243A] focus:outline-none focus:border-[#7960D8]"
                      >
                        <option value="AADHAAR">Aadhaar Card (India)</option>
                        <option value="PAN">PAN Card</option>
                        <option value="PASSPORT">Passport</option>
                        <option value="VOTER_ID">Voter ID</option>
                        <option value="DRIVING_LICENSE">Driving License</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#27243A] mb-1">
                        Masked ID Number (Last 4 digits visible)
                      </label>
                      <input
                        type="text"
                        required
                        value={idNumberMasked}
                        onChange={(e) => setIdNumberMasked(e.target.value)}
                        placeholder="e.g. XXXX-XXXX-4589"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E4F0] text-xs text-[#27243A] placeholder-[#777387]/60 focus:outline-none focus:border-[#7960D8]"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="consentAffirmation"
                      required
                      checked={consentAffirmation}
                      onChange={(e) => setConsentAffirmation(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-[#FF6347] bg-white text-[#FF6347]"
                    />
                    <label htmlFor="consentAffirmation" className="text-xs text-[#27243A]">
                      I certify under penalty of perjury that this identification is authentic and strictly matches my 18+ legal adult age.
                    </label>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmittingKyc}
                    disabled={!consentAffirmation || !idNumberMasked}
                    className="shadow-tomato font-bold"
                  >
                    Submit for Staff KYC Review
                  </Button>
                </form>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <div className="p-4 bg-[#E8F8F0] border border-[#218A58]/30 rounded-2xl flex items-center justify-between text-xs text-[#218A58]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#218A58]" />
            <span className="font-bold">KYC Identity Verified & Approved for Live Paid Calls</span>
          </div>
          <Badge variant="verified">VERIFIED CREATOR</Badge>
        </div>
      )}

      {/* Profile & Rates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Profile Form */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 border border-[#E8E4F0] bg-white shadow-card space-y-5">
            <CardHeader
              title="Creator Public Profile"
              subtitle="Customize how you appear to callers across India"
            />

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#27243A] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-xs text-[#27243A] placeholder-[#777387]/60 focus:outline-none focus:border-[#7960D8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#27243A] mb-1">
                  Bio / Introduction
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell callers about your interests and availability..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-xs text-[#27243A] placeholder-[#777387]/60 focus:outline-none focus:border-[#7960D8]"
                />
              </div>

              {/* Rate Configuration */}
              <div className="p-4 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#27243A] flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#7960D8]" />
                    <span>Per-Minute Call Rate (INR)</span>
                  </span>
                  <Badge variant="purple">Tier: {profile?.pricingTier || 'STANDARD'}</Badge>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="700"
                    max="1500"
                    step="100"
                    value={ratePaise}
                    onChange={(e) => setRatePaise(Number(e.target.value))}
                    className="flex-1 accent-[#7960D8] cursor-pointer"
                  />
                  <div className="text-xl font-black text-[#27243A] px-3.5 py-1.5 bg-white rounded-xl border border-[#E8E4F0] min-w-[100px] text-center font-mono shadow-sm">
                    ₹{rateInRupees}<span className="text-xs text-[#777387] font-sans">/m</span>
                  </div>
                </div>

                <div className="flex justify-between text-[11px] text-[#777387] border-t border-[#E8E4F0] pt-2">
                  <span>
                    Your 70% Share: <strong className="text-[#218A58]">₹{creatorEarningsPerMin}/min</strong>
                  </span>
                  <span>
                    Platform 30% Fee: <span className="text-[#777387]">₹{platformFeePerMin}/min</span>
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isUpdating}
                className="w-full py-2.5 font-bold shadow-tomato"
              >
                Save Creator Settings
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Col: Performance & Earnings Snapshot */}
        <div className="space-y-6">
          <Card className="p-6 border border-[#E8E4F0] bg-white shadow-card space-y-4">
            <CardHeader title="Performance Overview" subtitle="Call metrics and earnings" />

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] flex justify-between items-center">
                <span className="text-xs text-[#777387] font-semibold">Total Completed Calls</span>
                <span className="text-base font-black text-[#27243A]">
                  {profile?.totalCallsCompleted || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] flex justify-between items-center">
                <span className="text-xs text-[#777387] font-semibold">Total Call Minutes</span>
                <span className="text-base font-black text-[#27243A]">
                  {profile?.totalCallMinutes || 0} mins
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] flex justify-between items-center">
                <span className="text-xs text-[#777387] font-semibold">Caller Rating</span>
                <span className="text-base font-black text-amber-500">
                  ★ {(profile?.ratingAverage || 5.0).toFixed(1)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#777387] leading-relaxed text-center pt-2">
              All creator payouts are settled securely via direct bank transfer or UPI with 0 platform delay.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
