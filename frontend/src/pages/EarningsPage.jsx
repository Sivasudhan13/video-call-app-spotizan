import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { api } from '../services/api';
import { Card, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import {
  Coins,
  CreditCard,
  Building2,
  Smartphone,
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Radio,
  FileText,
  PhoneCall,
  History,
  TrendingUp,
} from 'lucide-react';

export function EarningsPage() {
  const { user, updateUser } = useAuth();
  const { wallet, refreshWallet, requestPayout, getLedger } = useWallet();

  // Strict Protection: Female creators / receivers only
  if (user && user.gender === 'MALE' && user.role !== 'ADMIN') {
    return <Navigate to="/discover" replace />;
  }

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Earnings summary state
  const [summary, setSummary] = useState({
    availablePayablePaise: 0,
    lifetimeEarnedPaise: 0,
    totalWithdrawnPaise: 0,
    pendingWithdrawalPaise: 0,
    recentPayouts: [],
  });

  // Call settlement ledger state
  const [callLedger, setCallLedger] = useState([]);

  // Bank & UPI Profile Form State
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: user?.bankDetails?.accountHolderName || user?.displayName || '',
    accountNumber: user?.bankDetails?.accountNumber || '',
    ifscCode: user?.bankDetails?.ifscCode || '',
    bankName: user?.bankDetails?.bankName || '',
    upiId: user?.bankDetails?.upiId || '',
  });
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [aadhaarNumber, setAadhaarNumber] = useState(user?.aadhaarNumber || '');
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Payout Request Form State
  const [payoutMethod, setPayoutMethod] = useState('UPI'); // 'UPI' | 'BANK_TRANSFER'
  const [payoutAmountINR, setPayoutAmountINR] = useState(500);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  // Fetch earnings summary from backend
  const fetchEarningsData = async () => {
    try {
      const [earningsRes, ledgerRes] = await Promise.allSettled([
        api.get('/wallet/creator-earnings'),
        getLedger(1, 10, 'CALL_SETTLEMENT'),
      ]);

      if (earningsRes.status === 'fulfilled' && earningsRes.value.success) {
        setSummary(earningsRes.value.data);
      }

      if (ledgerRes.status === 'fulfilled' && ledgerRes.value?.entries) {
        setCallLedger(ledgerRes.value.entries);
      }
    } catch (err) {
      console.warn('Earnings fetch note:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  // Update bank details whenever user object changes
  useEffect(() => {
    if (user) {
      setBankDetails({
        accountHolderName: user.bankDetails?.accountHolderName || user.displayName || '',
        accountNumber: user.bankDetails?.accountNumber || '',
        ifscCode: user.bankDetails?.ifscCode || '',
        bankName: user.bankDetails?.bankName || '',
        upiId: user.bankDetails?.upiId || '',
      });
      if (user.phoneNumber) setPhoneNumber(user.phoneNumber);
      if (user.aadhaarNumber) setAadhaarNumber(user.aadhaarNumber);
    }
  }, [user]);

  // Handle saving Bank & UPI details to User Profile
  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    setIsSavingBank(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.put('/auth/profile', {
        phoneNumber: phoneNumber.trim(),
        aadhaarNumber: aadhaarNumber.trim(),
        bankDetails: {
          accountHolderName: bankDetails.accountHolderName.trim(),
          accountNumber: bankDetails.accountNumber.trim(),
          ifscCode: bankDetails.ifscCode.trim().toUpperCase(),
          bankName: bankDetails.bankName.trim(),
          upiId: bankDetails.upiId.trim(),
        },
      });

      if (res.success && res.data?.user) {
        updateUser(res.data.user);
        setSuccessMsg('Your bank and payout settlement details have been safely updated.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save bank details.');
    } finally {
      setIsSavingBank(false);
    }
  };

  // Handle Payout Request submission
  const handleRequestPayout = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const amountInPaise = Math.round(Number(payoutAmountINR) * 100);

    if (amountInPaise < 50000) {
      setError('Minimum withdrawal request is ₹500.00.');
      return;
    }

    const availablePaise = summary.availablePayablePaise || wallet.creatorPayablePaise || 0;
    if (amountInPaise > availablePaise) {
      setError(`Requested amount ₹${payoutAmountINR} exceeds your available payable balance of ₹${(availablePaise / 100).toFixed(2)}.`);
      return;
    }

    let detailsPayload = {};
    if (payoutMethod === 'UPI') {
      const upi = bankDetails.upiId.trim();
      if (!upi || !upi.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. yourname@oksbi or mobile@upi).');
        return;
      }
      detailsPayload = {
        upiId: upi,
        phoneNumber: phoneNumber.trim(),
        aadhaarNumber: aadhaarNumber.trim(),
      };
    } else {
      if (!bankDetails.accountNumber.trim() || !bankDetails.ifscCode.trim() || !bankDetails.accountHolderName.trim()) {
        setError('Please complete Account Holder Name, Bank Account Number, and IFSC Code.');
        return;
      }
      detailsPayload = {
        accountHolderName: bankDetails.accountHolderName.trim(),
        bankAccountNumber: bankDetails.accountNumber.trim(),
        ifscCode: bankDetails.ifscCode.trim().toUpperCase(),
        bankName: bankDetails.bankName.trim() || 'Bank',
        phoneNumber: phoneNumber.trim(),
        aadhaarNumber: aadhaarNumber.trim(),
      };
    }

    try {
      setIsSubmittingPayout(true);
      await requestPayout({
        amountPaise: amountInPaise,
        method: payoutMethod,
        details: detailsPayload,
      });

      setSuccessMsg(`Withdrawal request of ₹${Number(payoutAmountINR).toFixed(2)} submitted successfully! Administrator will review and disburse.`);
      await refreshWallet();
      await fetchEarningsData();
    } catch (err) {
      setError(err.message || 'Failed to submit withdrawal request.');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshWallet();
    await fetchEarningsData();
  };

  const availablePayablePaise = summary.availablePayablePaise || wallet.creatorPayablePaise || 0;
  const availableINR = (availablePayablePaise / 100).toFixed(2);
  const lifetimeINR = (summary.lifetimeEarnedPaise / 100).toFixed(2);
  const withdrawnINR = (summary.totalWithdrawnPaise / 100).toFixed(2);
  const pendingINR = (summary.pendingWithdrawalPaise / 100).toFixed(2);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 bg-white text-[#27243A]">
      {/* Top Banner Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#2A1B54] via-[#7960D8] to-[#FF6347] text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-spin" />
                Female Creator Monetization
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase">
                70% Revenue Share Guaranteed
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              My Earnings & Bank Payouts
            </h1>
            <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
              Track your live call earnings, manage verified bank and UPI settlement accounts, and withdraw payable earnings directly to your bank. Female users never pay for calls.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 text-xs font-bold cursor-pointer"
              title="Refresh Balance"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link to="/receive-calls">
              <Button variant="primary" size="md" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold border-none shadow-lg">
                <Radio className="w-4 h-4 text-white animate-pulse" />
                <span>Receive Calls (Earn More)</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {error && <Alert type="error" title="Notice">{error}</Alert>}
      {successMsg && <Alert type="success" title="Success">{successMsg}</Alert>}

      {/* 4 Stat Cards Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Payable Balance */}
        <Card className="p-5 bg-gradient-to-br from-[#F1EDFF] to-white border-2 border-[#7960D8]/30 shadow-card space-y-2">
          <div className="flex items-center justify-between text-xs text-[#777387]">
            <span className="font-semibold">Available Payable Balance</span>
            <div className="w-7 h-7 rounded-lg bg-[#7960D8] text-white flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#7960D8] font-mono">
            ₹{availableINR}
          </div>
          <p className="text-[11px] text-[#218A58] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready for instant bank withdrawal
          </p>
        </Card>

        {/* Lifetime Total Earnings */}
        <Card className="p-5 bg-[#F8F7FC] border border-[#E8E4F0] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#777387]">
            <span className="font-semibold">Lifetime Total Earned</span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-[#27243A] font-mono">
            ₹{lifetimeINR}
          </div>
          <p className="text-[11px] text-[#777387]">
            70% net share of all calls received
          </p>
        </Card>

        {/* Total Successfully Withdrawn */}
        <Card className="p-5 bg-[#F8F7FC] border border-[#E8E4F0] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#777387]">
            <span className="font-semibold">Total Paid to Bank</span>
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600 font-mono">
            ₹{withdrawnINR}
          </div>
          <p className="text-[11px] text-[#777387]">
            Disbursed via direct NEFT / UPI
          </p>
        </Card>

        {/* Pending In Review */}
        <Card className="p-5 bg-[#F8F7FC] border border-[#E8E4F0] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#777387]">
            <span className="font-semibold">Pending Admin Review</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600 font-mono">
            ₹{pendingINR}
          </div>
          <p className="text-[11px] text-[#777387]">
            Awaiting administrator disbursement
          </p>
        </Card>
      </div>

      {/* 2-Column: Payout Request Form & Bank Settlement Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Request Payout Withdrawal */}
        <Card className="p-6 md:p-8 border border-[#E8E4F0] bg-white shadow-card space-y-6">
          <div className="border-b border-[#E8E4F0] pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#27243A] flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-[#7960D8]" />
                Request Withdrawal Payout
              </h2>
              <Badge variant="purple">MIN ₹500</Badge>
            </div>
            <p className="text-xs text-[#777387] mt-1">
              Transfer your payable earnings directly to your bank account or UPI ID.
            </p>
          </div>

          <form onSubmit={handleRequestPayout} className="space-y-5">
            {/* Payment Method Switcher */}
            <div>
              <label className="block text-xs font-bold text-[#27243A] mb-2">
                Select Payout Transfer Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('UPI')}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                    payoutMethod === 'UPI'
                      ? 'border-[#7960D8] bg-[#F1EDFF] shadow-sm'
                      : 'border-[#E8E4F0] bg-white hover:border-[#B9A7F5]'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${payoutMethod === 'UPI' ? 'bg-[#7960D8] text-white' : 'bg-[#F1EDFF] text-[#7960D8]'}`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-[#27243A]">Instant UPI</div>
                    <div className="text-[10px] text-[#777387]">GPay, PhonePe, Paytm</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('BANK_TRANSFER')}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                    payoutMethod === 'BANK_TRANSFER'
                      ? 'border-[#7960D8] bg-[#F1EDFF] shadow-sm'
                      : 'border-[#E8E4F0] bg-white hover:border-[#B9A7F5]'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${payoutMethod === 'BANK_TRANSFER' ? 'bg-[#7960D8] text-white' : 'bg-[#F1EDFF] text-[#7960D8]'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-[#27243A]">Bank Transfer</div>
                    <div className="text-[10px] text-[#777387]">NEFT / IMPS Transfer</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-[#27243A]">
                  Withdrawal Amount (INR)
                </label>
                <span className="text-xs text-[#777387]">
                  Available: <strong className="text-[#7960D8]">₹{availableINR}</strong>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-[#777387]">
                  ₹
                </span>
                <input
                  type="number"
                  min="500"
                  max={Math.floor(availablePayablePaise / 100)}
                  step="10"
                  value={payoutAmountINR}
                  onChange={(e) => setPayoutAmountINR(e.target.value)}
                  placeholder="500"
                  className="w-full pl-8 pr-20 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-sm font-mono font-bold text-[#27243A] focus:outline-none focus:border-[#7960D8]"
                />
                <button
                  type="button"
                  onClick={() => setPayoutAmountINR(Math.max(500, Math.floor(availablePayablePaise / 100)))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-[#F1EDFF] text-[#7960D8] text-[10px] font-black uppercase hover:bg-[#e7e0ff]"
                >
                  Max
                </button>
              </div>
              <p className="text-[11px] text-[#777387] mt-1.5">
                Minimum payout: ₹500.00 • No withdrawal processing fees charged to creators.
              </p>
            </div>

            {/* Destination Preview */}
            <div className="p-3.5 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] text-xs space-y-1">
              <span className="text-[#777387] font-semibold block text-[10px] uppercase">
                Settlement Destination:
              </span>
              {payoutMethod === 'UPI' ? (
                bankDetails.upiId ? (
                  <div className="font-mono font-bold text-[#27243A] flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#7960D8]" />
                    <span>UPI ID: {bankDetails.upiId}</span>
                  </div>
                ) : (
                  <span className="text-[#D92D20] font-medium">
                    ⚠️ No UPI ID saved. Please add your UPI ID on the right form.
                  </span>
                )
              ) : bankDetails.accountNumber ? (
                <div className="space-y-0.5">
                  <div className="font-bold text-[#27243A]">{bankDetails.accountHolderName} ({bankDetails.bankName || 'Bank'})</div>
                  <div className="font-mono text-[#7960D8]">A/C: {bankDetails.accountNumber} • IFSC: {bankDetails.ifscCode}</div>
                </div>
              ) : (
                <span className="text-[#D92D20] font-medium">
                  ⚠️ No Bank Account saved. Please fill your bank details on the right form.
                </span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmittingPayout}
              disabled={
                availablePayablePaise < 50000 ||
                (payoutMethod === 'UPI' && !bankDetails.upiId) ||
                (payoutMethod === 'BANK_TRANSFER' && !bankDetails.accountNumber)
              }
              className="w-full shadow-tomato font-bold py-3 text-sm"
              icon={ArrowDownToLine}
            >
              Submit Withdrawal Request (₹{Number(payoutAmountINR || 0).toFixed(2)})
            </Button>
          </form>
        </Card>

        {/* Right Column: Manage Bank & UPI Settlement Details */}
        <Card className="p-6 md:p-8 border border-[#E8E4F0] bg-white shadow-card space-y-6">
          <div className="border-b border-[#E8E4F0] pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#27243A] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#218A58]" />
                Bank & UPI Settlement Account
              </h2>
              <Badge variant="verified">SECURE STORAGE</Badge>
            </div>
            <p className="text-xs text-[#777387] mt-1">
              Your details are encrypted and only visible to administrators for payout verification.
            </p>
          </div>

          <form onSubmit={handleSaveBankDetails} className="space-y-4 text-xs">
            {/* Phone & Aadhaar for Admin verification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#27243A] mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E4F0] text-xs text-[#27243A] focus:outline-none focus:border-[#7960D8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#27243A] mb-1">
                  Aadhaar Number (UIDAI)
                </label>
                <input
                  type="text"
                  required
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  placeholder="e.g. 1234 5678 9012"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E4F0] text-xs text-[#27243A] focus:outline-none focus:border-[#7960D8]"
                />
              </div>
            </div>

            {/* UPI ID */}
            <div>
              <label className="block font-semibold text-[#27243A] mb-1">
                UPI ID (Virtual Payment Address)
              </label>
              <input
                type="text"
                value={bankDetails.upiId}
                onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                placeholder="e.g. username@okhdfcbank or 9876543210@upi"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E4F0] text-xs text-[#27243A] focus:outline-none focus:border-[#7960D8]"
              />
            </div>

            {/* Bank Details Fields */}
            <div className="pt-2 border-t border-[#E8E4F0] space-y-4">
              <div>
                <label className="block font-semibold text-[#27243A] mb-1">
                  Account Holder Name (as per Bank Passbook)
                </label>
                <input
                  type="text"
                  required
                  value={bankDetails.accountHolderName}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                  placeholder="Full name on bank account"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E4F0] text-xs text-[#27243A] focus:outline-none focus:border-[#7960D8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#27243A] mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    placeholder="e.g. State Bank of India, HDFC"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E4F0] text-xs text-[#27243A] focus:outline-none focus:border-[#7960D8]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#27243A] mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={bankDetails.ifscCode}
                    onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBIN0001234"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E4F0] text-xs font-mono uppercase text-[#27243A] focus:outline-none focus:border-[#7960D8]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#27243A] mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                  placeholder="e.g. 10023456789"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E4F0] text-xs font-mono text-[#27243A] focus:outline-none focus:border-[#7960D8]"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="md"
              isLoading={isSavingBank}
              className="w-full font-bold border border-[#E8E4F0] hover:bg-[#F1EDFF]"
            >
              Save Bank & UPI Details
            </Button>
          </form>
        </Card>
      </div>

      {/* Payout History Table */}
      <Card className="p-6 md:p-8 border border-[#E8E4F0] bg-white shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E4F0] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#27243A] flex items-center gap-2">
              <History className="w-5 h-5 text-[#7960D8]" />
              Withdrawal & Payout History
            </h2>
            <p className="text-xs text-[#777387]">
              Real-time audit log of your submitted withdrawal requests and bank settlement status.
            </p>
          </div>
          <Badge variant="adult">LEDGER AUDITED</Badge>
        </div>

        {summary.recentPayouts?.length === 0 ? (
          <div className="py-12 text-center text-[#777387] space-y-2">
            <CreditCard className="w-10 h-10 mx-auto text-gray-300" />
            <div className="text-sm font-semibold text-[#27243A]">No Payout Requests Yet</div>
            <p className="text-xs">
              When your payable earnings reach ₹500, request a withdrawal above to receive funds in your bank.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#27243A]">
              <thead className="bg-[#F1EDFF] text-[#777387] uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-3 rounded-l-lg">Request Date</th>
                  <th className="py-3 px-3">Payout ID</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Method & Details</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 rounded-r-lg">Bank UTR / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4F0]">
                {summary.recentPayouts.map((p) => {
                  const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : 'Recent';

                  return (
                    <tr key={p._id || p.payoutId} className="hover:bg-[#F1EDFF]/30 transition-colors">
                      <td className="py-3 px-3 font-medium text-[#777387] whitespace-nowrap">{dateStr}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#7960D8] font-bold">{p.payoutId || p._id}</td>
                      <td className="py-3 px-3 font-mono font-black text-sm text-[#218A58]">
                        ₹{(p.amountPaise / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold">{p.method}</span>
                        {p.details?.upiId && <div className="text-[11px] font-mono text-[#777387]">{p.details.upiId}</div>}
                        {p.details?.bankAccountNumber && (
                          <div className="text-[11px] font-mono text-[#777387]">
                            A/C: {p.details.bankAccountNumber} ({p.details.ifscCode})
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            p.status === 'PROCESSED'
                              ? 'success'
                              : p.status === 'REJECTED'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        {p.transactionReference ? (
                          <div className="font-mono text-[11px] text-[#218A58] font-bold">
                            UTR: {p.transactionReference}
                          </div>
                        ) : p.adminNotes ? (
                          <div className="text-[11px] text-[#777387] italic">{p.adminNotes}</div>
                        ) : (
                          <span className="text-[10px] text-gray-400">Processing by admin</span>
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
    </div>
  );
}
