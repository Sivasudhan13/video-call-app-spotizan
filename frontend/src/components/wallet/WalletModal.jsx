import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Coins,
  History,
  Building2,
  Smartphone,
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

const PRESET_AMOUNTS = [1, 100, 250, 500, 1000, 2000];

export function WalletModal() {
  const {
    wallet,
    isWalletModalOpen,
    closeWalletModal,
    refreshWallet,
    topupOrder,
    verifyTopup,
    requestPayout,
    getLedger,
  } = useWallet();
  const { user } = useAuth();
  const isFemale = user?.gender === 'FEMALE';
  const isLiveMode = import.meta.env.VITE_RAZORPAY_KEY_ID?.startsWith('rzp_live_');

  const [activeTab, setActiveTab] = useState(isFemale ? 'payout' : 'topup');
  const [selectedAmount, setSelectedAmount] = useState(250);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Ledger state
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Payout state
  const [payoutAmount, setPayoutAmount] = useState(500);
  const [payoutMethod, setPayoutMethod] = useState('UPI');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    bankAccountNumber: '',
    ifscCode: '',
  });

  useEffect(() => {
    if (isWalletModalOpen) {
      refreshWallet();
      setSuccessMessage('');
      setErrorMessage('');
      if (activeTab === 'history') {
        loadLedger();
      }
    }
  }, [isWalletModalOpen, activeTab]);

  const loadLedger = async () => {
    try {
      setLedgerLoading(true);
      const res = await getLedger(1, 15);
      if (res.entries) {
        setLedgerEntries(res.entries);
      }
    } catch (err) {
      console.warn('Failed to load ledger:', err.message);
    } finally {
      setLedgerLoading(false);
    }
  };

  if (!isWalletModalOpen) return null;

  const currentAmount = customAmount ? Number(customAmount) : selectedAmount;

  const handleTopup = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (currentAmount < 1) {
      setErrorMessage('Minimum top-up amount is ₹1 (100 paise).');
      return;
    }
    if (currentAmount > 5000) {
      setErrorMessage('Maximum single top-up amount is ₹5,000.');
      return;
    }

    try {
      setProcessing(true);
      const amountPaise = currentAmount * 100;
      const order = await topupOrder(amountPaise);

      // Open Razorpay SDK popup when live Razorpay order is active
      if (window.Razorpay && order.isLiveRazorpay) {
        const options = {
          key: order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: order.amountPaise,
          currency: order.currency || 'INR',
          name: 'Spotizan 18+ Live Calling',
          description: `Wallet Re-charge: ₹${currentAmount}`,
          order_id: order.orderId,
          handler: async function (response) {
            try {
              setProcessing(true);
              await verifyTopup({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                amountPaise,
              });
              setSuccessMessage(`✨ Payment verified! ₹${currentAmount} added to your Spotizan Wallet.`);
              await refreshWallet();
              setCustomAmount('');
            } catch (err) {
              setErrorMessage(err.message || 'Signature verification failed.');
            } finally {
              setProcessing(false);
            }
          },
          prefill: {
            name: user?.displayName || '',
            email: user?.email || '',
          },
          theme: {
            color: '#6366f1',
          },
          modal: {
            ondismiss: function () {
              setProcessing(false);
              setErrorMessage('Payment cancelled by user.');
            },
          },
        };

        try {
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (failResponse) {
            setProcessing(false);
            const reason =
              failResponse.error?.description ||
              failResponse.error?.reason ||
              'Payment failed. Please try another card or UPI ID.';
            setErrorMessage(`Payment Failed: ${reason}`);
          });
          rzp.open();
          return;
        } catch (sdkErr) {
          console.warn('Razorpay SDK modal error:', sdkErr);
          setErrorMessage(`Razorpay checkout error: ${sdkErr.message}`);
          setProcessing(false);
          return;
        }
      }

      // Fast Dev / Sandbox simulation fallback ONLY when running without active Razorpay keys
      if (!order.isLiveRazorpay) {
        const paymentId = `pay_sim_${Date.now()}`;
        await verifyTopup({
          razorpayOrderId: order.orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: 'simulated_dev_payment_signature',
          amountPaise,
        });

        setSuccessMessage(`✨ Top-Up Successful: Added ₹${currentAmount} to your Spotizan Wallet!`);
        await refreshWallet();
        setCustomAmount('');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (payoutAmount < 500) {
      setErrorMessage('Minimum payout withdrawal is ₹500.');
      return;
    }
    if (payoutAmount * 100 > wallet.creatorPayablePaise) {
      setErrorMessage('Requested amount exceeds your available creator earnings.');
      return;
    }

    try {
      setProcessing(true);
      const details =
        payoutMethod === 'UPI'
          ? { upiId }
          : {
              accountHolderName: bankDetails.accountHolderName,
              bankAccountNumber: bankDetails.bankAccountNumber,
              ifscCode: bankDetails.ifscCode.toUpperCase(),
            };

      await requestPayout({
        amountPaise: payoutAmount * 100,
        method: payoutMethod,
        details,
      });

      setSuccessMessage(
        `Payout request of ₹${payoutAmount} submitted successfully! Transfers typically process within 24-48 hours.`
      );
      await refreshWallet();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit payout request.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/30">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Spotizan Wallet
                <Badge variant="success" className="text-[10px] py-0 px-1.5">
                  Secure INR
                </Badge>
              </h3>
              <p className="text-xs text-slate-400">18+ Per-minute calling credits & creator earnings</p>
            </div>
          </div>
          <button
            onClick={closeWalletModal}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Card Banner */}
        <div className="p-5 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 border-b border-slate-800/80">
          <div className="grid grid-cols-2 gap-4">
            {isFemale ? (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-900/40">
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Female User Status
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-white">100% Free</span>
                </div>
                <div className="mt-1 text-[11px] text-emerald-400 font-medium">Never charged for any calls</div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-900/40">
                <span className="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  Available Balance
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-white">
                    ₹{(wallet.balancePaise / 100).toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">INR</span>
                </div>
                {wallet.reservedPaise > 0 && (
                  <div className="mt-1 text-[11px] text-amber-400">
                    ₹{(wallet.reservedPaise / 100).toFixed(2)} locked in active call
                  </div>
                )}
              </div>
            )}

            {isFemale || user?.role === 'CREATOR' ? (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-900/40">
                <span className="text-xs text-purple-300 font-medium flex items-center gap-1.5">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                  Payable Creator Earnings
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-emerald-400">
                    ₹{(wallet.creatorPayablePaise / 100).toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">INR</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">70% revenue share credited</div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-center">
                <span className="text-xs text-slate-400 font-medium">Standard Calling Rate</span>
                <div className="mt-1 text-lg font-bold text-indigo-300">₹7 / minute</div>
                <span className="text-[11px] text-slate-500">First 15s always free preview</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 bg-slate-950/40">
          <div className="flex">
            {!isFemale && (
              <button
                onClick={() => setActiveTab('topup')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'topup'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Top-up Balance
              </button>
            )}

            {(isFemale || user?.role === 'CREATOR') && (
              <button
                onClick={() => setActiveTab('payout')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'payout'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Withdraw Earnings
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('history');
                loadLedger();
              }}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Ledger History
            </button>
          </div>

          {isFemale && (
            <a
              href="/earnings"
              onClick={closeWalletModal}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 py-1 px-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 transition-colors"
            >
              Full Earnings Page →
            </a>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: TOPUP */}
          {activeTab === 'topup' && (
            <div className="space-y-4">
              <label className="text-xs font-medium text-slate-300 block">
                Select Top-up Package
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_AMOUNTS.map((amt) => {
                  const isSelected = selectedAmount === amt && !customAmount;
                  const isTestPack = amt === 1;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amt);
                        setCustomAmount('');
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all relative ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                          : isTestPack
                          ? 'bg-amber-950/20 border-amber-500/40 text-amber-200 hover:bg-amber-900/30'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {isTestPack && !isLiveMode && (
                        <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider block">
                          Test
                        </span>
                      )}
                      <div className="text-sm font-bold">₹{amt}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {isTestPack ? '100 paise' : `~${Math.floor(amt / 7)} mins`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount Input */}
              <div className="pt-2">
                <label className="text-xs font-medium text-slate-400 block mb-1.5">
                  Or Enter Custom Amount (₹1 - ₹5,000)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Payments encrypted via 256-bit Razorpay Gateway. Unused call reservations are
                  refunded automatically in real time.
                </span>
              </div>

              <Button
                variant="primary"
                onClick={handleTopup}
                disabled={processing || !currentAmount}
                className="w-full py-3 text-sm font-semibold justify-center shadow-lg shadow-indigo-600/30"
                icon={CreditCard}
              >
                {processing ? 'Processing...' : `Add ₹${currentAmount || 0} to Wallet`}
              </Button>
            </div>
          )}

          {/* TAB 2: PAYOUT (FOR CREATORS) */}
          {activeTab === 'payout' && user?.role === 'CREATOR' && (
            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-300">
                Minimum payout request is ₹500. Available for withdrawal:{' '}
                <strong className="text-white">
                  ₹{(wallet.creatorPayablePaise / 100).toFixed(2)}
                </strong>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  min="500"
                  max={Math.floor(wallet.creatorPayablePaise / 100)}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-2">
                  Payout Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('UPI')}
                    className={`p-3 rounded-xl border flex items-center gap-2 justify-center text-xs font-semibold ${
                      payoutMethod === 'UPI'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Instant UPI
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutMethod('BANK_TRANSFER')}
                    className={`p-3 rounded-xl border flex items-center gap-2 justify-center text-xs font-semibold ${
                      payoutMethod === 'BANK_TRANSFER'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Direct Bank Transfer
                  </button>
                </div>
              </div>

              {payoutMethod === 'UPI' ? (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">
                    UPI Virtual Payment Address (VPA)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourname@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="As per bank passbook"
                      value={bankDetails.accountHolderName}
                      onChange={(e) =>
                        setBankDetails({ ...bankDetails, accountHolderName: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 123456789012"
                        value={bankDetails.bankAccountNumber}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, bankAccountNumber: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. HDFC0001234"
                        value={bankDetails.ifscCode}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })
                        }
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm uppercase focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={processing || wallet.creatorPayablePaise < 50000}
                className="w-full py-3 text-sm font-semibold justify-center"
              >
                {processing ? 'Submitting...' : `Submit Payout Request (₹${payoutAmount})`}
              </Button>
            </form>
          )}

          {/* TAB 3: LEDGER HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Double-entry financial audit records
                </span>
                <button
                  onClick={loadLedger}
                  disabled={ledgerLoading}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${ledgerLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {ledgerLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Loading ledger transactions...
                </div>
              ) : ledgerEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  No financial transactions recorded yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {ledgerEntries.map((entry) => {
                    const isCredit = entry.entryType === 'CREDIT';
                    return (
                      <div
                        key={entry._id || entry.entryId}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              isCredit
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200">
                              {entry.referenceType.replace('_', ' ')}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">
                              {entry.description}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-bold ${
                              isCredit ? 'text-emerald-400' : 'text-slate-300'
                            }`}
                          >
                            {isCredit ? '+' : '-'}₹{(entry.amountPaise / 100).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(entry.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
