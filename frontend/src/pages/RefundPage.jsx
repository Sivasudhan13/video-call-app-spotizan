import React from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export function RefundPage() {
  return (
    <div className="flex-1 bg-[#05070D] py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fair & Transparent Billing Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            Refund, Cancellation & Reservation Policy
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Automatic real-time reservation releases and transparent dispute resolution.
          </p>
        </div>

        {/* Real-time refund guarantee */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-800/60 space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>Instant Automatic Call Reservation Release</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            When you initiate a call, Spotizan temporarily places a reservation hold on your wallet to guarantee payment. <strong>Any unused balance is automatically released and returned to your available wallet balance the exact millisecond the call terminates.</strong> You are only ever charged for verified billable minutes exceeded past the 15-second free preview.
          </p>
        </div>

        <div className="space-y-8 text-xs text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Unused Wallet Balance Refunds</h2>
            <p className="text-slate-400">
              Users may request a full refund of unspent, deposited wallet funds within 7 days of purchase provided no services or calls were consumed using those specific credits. Approved refunds are credited back to the original payment source (UPI, Debit/Credit Card, Net Banking) via Razorpay within 5–7 business days.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Free 15-Second Preview Guarantee</h2>
            <p className="text-slate-400">
              Every random call provides an initial 15-second free preview window. If you skip or disconnect prior to 15 seconds, your wallet is billed exactly ₹0.00 (zero paise), and 100% of any pre-authorized hold is instantly restored.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Network Drops & Disconnection Disputes</h2>
            <p className="text-slate-400">
              In the rare event of a severe technical outage or premature WebRTC stream disconnection where billing occurred, users can submit a dispute ticket with the Call Session ID within 48 hours. Our support team reviews server connection logs and credits disputed charges directly back to your wallet.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">4. Premium Subscription Cancellation</h2>
            <p className="text-slate-400">
              Monthly subscriptions (Premium / VIP) can be cancelled at any time from your account settings. Upon cancellation, benefits remain active until the end of the current 30-day billing cycle, with no subsequent auto-renewals.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
