import React from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { FileText, Scale, Shield, AlertCircle } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="flex-1 bg-[#05070D] py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Scale className="w-3.5 h-3.5 text-indigo-400" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            Terms of Service & User Agreement
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Last Updated: October 2026 • Effective Immediately Upon Registration
          </p>
        </div>

        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Please read these Terms carefully. By accessing Spotizan, registering an account, purchasing wallet credits, or participating in random or creator video calls, you enter into a legally binding contract governed by the laws of India.
          </p>
        </div>

        <div className="space-y-8 text-xs text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Statutory 18+ Age Eligibility & Representation</h2>
            <p className="text-slate-400">
              Spotizan is strictly an adult entertainment and social discovery marketplace intended exclusively for consenting individuals aged 18 years or older. You represent and warrant under penalty of law that you are of legal age in your jurisdiction. Providing false age declarations will result in immediate permanent account termination and forfeiture of any remaining wallet balance.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Creator Monetization, Billing & 15-Second Free Preview</h2>
            <p className="text-slate-400">
              Users may initiate paid video calls with verified creators or enter random queue sessions. The first 15 seconds of any random session constitute a free preview. Following 15 seconds, calls are billed in integer increments at the published per-minute rate (e.g., ₹7.00/min or 700 paise). Billed duration is tracked authoritatively by the platform server.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Creator Revenue Share & Payout Terms</h2>
            <p className="text-slate-400">
              Verified creators receive 70% of billable call gross proceeds (credited in integer paise). Spotizan retains a 30% platform commission to cover payment gateway processing, TURN relay infrastructure, and moderation costs. Creator earnings are eligible for withdrawal to verified Indian bank accounts or UPI VPA IDs upon meeting the minimum withdrawal threshold of ₹500 (50,000 paise).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">4. Prohibition of Screen Capture & Likeness Recording</h2>
            <p className="text-slate-400">
              Users are strictly prohibited from taking screenshots, recording screen activity, or capturing audio/video streams of other participants without express, verified written consent. Violating this provision constitutes a material breach of contract and actionable civil and criminal copyright/privacy infringement.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">5. Limitation of Liability & Intermediary Status</h2>
            <p className="text-slate-400">
              Spotizan acts as an intermediary platform facilitating peer-to-peer real-time communication under Section 79 of the Information Technology Act, 2000. Spotizan does not pre-screen or exercise editorial control over live peer-to-peer video streams. Users assume full personal responsibility for interactions with other participants.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
