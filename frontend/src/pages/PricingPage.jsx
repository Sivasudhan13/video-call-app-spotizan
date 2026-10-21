import React, { useState } from 'react';
import { Card, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Alert } from '../components/common/Alert';
import { Coins, CheckCircle, Shield, FileText, Scale, CreditCard } from 'lucide-react';
import { RazorpayCheckoutButton } from '../components/payment/RazorpayCheckoutButton';
import { useWallet } from '../context/WalletContext';

export function PricingPage() {
  const { wallet, refreshWallet } = useWallet();
  const [selectedTopup, setSelectedTopup] = useState(100); // 100 paise = ₹1
  const isLive = import.meta.env.VITE_RAZORPAY_KEY_ID?.startsWith('rzp_live_');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 flex-1 bg-white text-[#27243A]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl font-black text-[#27243A] tracking-tight">Transparent INR Pricing & Billing Policy</h1>
          <Badge variant="adult">18+</Badge>
        </div>
        <p className="text-sm text-[#777387] max-w-3xl leading-relaxed">
          Spotizan is committed to complete billing transparency. Rates are measured in exact Indian Rupees (INR) and calculated using integer paise to ensure zero floating-point discrepancies.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="space-y-4 border-[#E8E4F0] bg-white shadow-card">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#7960D8] uppercase">Tier 1</span>
            <Badge variant="info">Random Queue</Badge>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-[#27243A]">₹7.00</span>
            <span className="text-xs text-[#777387]">/ min (700 paise)</span>
          </div>
          <p className="text-xs text-[#777387]">
            Automated random queue matching rate with available participants.
          </p>
          <div className="pt-2 border-t border-[#E8E4F0] text-xs space-y-1.5 text-[#27243A]">
            <div className="flex justify-between">
              <span>Creator Payout (70%):</span>
              <span className="font-semibold text-[#218A58]">₹4.90 / min</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee (30%):</span>
              <span className="font-semibold text-[#777387]">₹2.10 / min</span>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 border-[#B9A7F5] bg-gradient-to-b from-[#F1EDFF] to-white shadow-card relative">
          <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-[#7960D8] text-white text-[10px] font-bold uppercase tracking-wider">
            Popular
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#7960D8] uppercase">Tier 2</span>
            <Badge variant="purple">Standard Creators</Badge>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-[#27243A]">₹9.00</span>
            <span className="text-xs text-[#777387]">/ min (900 paise)</span>
          </div>
          <p className="text-xs text-[#777387]">
            Standard rate for verified creators meeting platform activity standards.
          </p>
          <div className="pt-2 border-t border-[#E8E4F0] text-xs space-y-1.5 text-[#27243A]">
            <div className="flex justify-between">
              <span>Creator Payout (70%):</span>
              <span className="font-semibold text-[#218A58]">₹6.30 / min</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee (30%):</span>
              <span className="font-semibold text-[#777387]">₹2.70 / min</span>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 border-[#E8E4F0] bg-white shadow-card">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#FF6347] uppercase">Tier 3</span>
            <Badge variant="verified">Top Creators</Badge>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-[#27243A]">₹12 - ₹15</span>
            <span className="text-xs text-[#777387]">/ min</span>
          </div>
          <p className="text-xs text-[#777387]">
            Top rated creators with specialized categories and dedicated time slots.
          </p>
          <div className="pt-2 border-t border-[#E8E4F0] text-xs space-y-1.5 text-[#27243A]">
            <div className="flex justify-between">
              <span>Creator Payout (70%):</span>
              <span className="font-semibold text-[#218A58]">₹8.40 – ₹10.50</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee (30%):</span>
              <span className="font-semibold text-[#777387]">₹3.60 – ₹4.50</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Wallet Top-Up via Razorpay */}
      <Card className="p-6 md:p-8 space-y-6 bg-white border border-[#E8E4F0] shadow-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#7960D8]" />
              <h3 className="text-lg font-bold text-[#27243A]">Add Calling Credits to Wallet</h3>
            </div>
            <p className="text-xs text-[#777387] mt-1">
              Select a recharge package. Instant 100% wallet credit via Razorpay Standard Checkout.
            </p>
          </div>

          {wallet && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] text-xs font-semibold">
              <span className="text-[#777387]">Balance:</span>
              <span className="text-[#218A58] font-bold font-mono">
                ₹{(wallet.balancePaise / 100).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            {
              amountPaise: 100,
              label: '₹1',
              minutes: isLive ? 'Instant Verification' : 'Test Gateway',
              isTest: !isLive,
            },
            { amountPaise: 10000, label: '₹100', minutes: '~14 mins' },
            { amountPaise: 25000, label: '₹250', minutes: '~35 mins', popular: true },
            { amountPaise: 50000, label: '₹500', minutes: '~71 mins' },
            { amountPaise: 100000, label: '₹1,000', minutes: '~142 mins' },
          ].map((pack) => (
            <button
              key={pack.amountPaise}
              type="button"
              onClick={() => setSelectedTopup(pack.amountPaise)}
              className={`p-3.5 rounded-xl border text-left transition-all relative ${
                selectedTopup === pack.amountPaise
                  ? pack.isTest
                    ? 'border-[#FF6347] bg-[#FFF0EC] ring-2 ring-[#FF6347]/30 shadow-md'
                    : 'border-[#7960D8] bg-[#F1EDFF] ring-2 ring-[#7960D8]/30 shadow-md'
                  : pack.isTest
                  ? 'border-[#FFC7BD] bg-[#FFF0EC]/50 hover:border-[#FF6347]'
                  : 'border-[#E8E4F0] bg-white hover:border-[#B9A7F5]'
              }`}
            >
              {pack.isTest && (
                <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF6347] text-white uppercase tracking-wider">
                  Test
                </span>
              )}
              {pack.popular && (
                <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#7960D8] text-white uppercase tracking-wider">
                  Popular
                </span>
              )}
              <div className="text-xl font-black text-[#27243A]">{pack.label}</div>
              <div className="text-xs text-[#777387] mt-0.5">{pack.minutes}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E8E4F0]">
          <div className="text-xs text-[#777387] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#218A58] shrink-0" />
            <span>Payments encrypted via 256-bit Razorpay Gateway. Unused call reservations are refunded automatically in real time.</span>
          </div>
          <RazorpayCheckoutButton
            amount={selectedTopup}
            buttonText={`Recharge ₹${(selectedTopup / 100).toFixed(0)} via Razorpay`}
            className="w-full sm:w-auto bg-[#FF6347] hover:bg-[#e85338] text-white shadow-tomato font-bold px-6 py-2.5 rounded-xl"
            onSuccess={() => {
              refreshWallet();
            }}
          />
        </div>
      </Card>

      {/* Transparent Billing Rules */}
      <Card className="space-y-6 bg-white border border-[#E8E4F0] shadow-card">
        <CardHeader
          title="Core Billing Principles"
          subtitle="How our server enforces fair and auditable calling charges"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#27243A]">
          <div className="p-4 rounded-xl bg-[#F1EDFF]/60 border border-[#E8E4F0] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#7960D8]">
              <Scale className="w-4 h-4" />
              <span>Server-Side Elapsed Timestamping</span>
            </div>
            <p className="text-[#777387] leading-relaxed">
              Call durations are calculated solely by authoritative backend server clocks when WebRTC peer connection confirms media exchange, preventing client clock tampering.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F1EDFF]/60 border border-[#E8E4F0] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#7960D8]">
              <Shield className="w-4 h-4" />
              <span>15-Second Free Preview Guarantee</span>
            </div>
            <p className="text-[#777387] leading-relaxed">
              Every video call includes a mandatory 15-second free preview period. If either party hangs up or skips within 15 seconds, you are billed ₹0.00 and 100% of reserved funds are instantly restored.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F1EDFF]/60 border border-[#E8E4F0] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#218A58]">
              <Coins className="w-4 h-4" />
              <span>Real-Time Reservation Refunds</span>
            </div>
            <p className="text-[#777387] leading-relaxed">
              Unused call reservations are refunded automatically in real time upon call termination. If you pre-authorize 5 minutes and speak for 1 minute, the remaining 4 minutes are released back to your available balance immediately.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F1EDFF]/60 border border-[#E8E4F0] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#FF6347]">
              <FileText className="w-4 h-4" />
              <span>256-bit Encrypted Razorpay Gateway</span>
            </div>
            <p className="text-[#777387] leading-relaxed">
              Wallet top-ups are processed securely via 256-bit encrypted Razorpay payment gateway supporting UPI (Google Pay, PhonePe, Paytm), NetBanking, and credit/debit cards.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
