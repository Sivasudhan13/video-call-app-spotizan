import React from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Shield, Lock, Eye, Trash2, Key } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="flex-1 bg-[#05070D] py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Digital Personal Data Protection (DPDP) Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            Privacy Policy & Data Retention Policy
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Last Updated: October 2026 • Principles of Data Minimization & Privacy by Design
          </p>
        </div>

        <div className="space-y-8 text-xs text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              1. Information We Collect
            </h2>
            <p className="text-slate-400">
              We collect the minimum information required to operate a secure, age-verified platform:
            </p>
            <ul className="list-disc list-inside text-slate-400 space-y-1 pl-2">
              <li><strong>Account Credentials:</strong> Display name, email address, date of birth, and salted bcrypt password hashes.</li>
              <li><strong>Financial Transactions:</strong> Razorpay payment order identifiers, ledger balance in integer paise, and transaction reference numbers. We never store raw payment credit/debit card numbers or CVVs.</li>
              <li><strong>Creator KYC Documentation:</strong> Government ID details and selfie liveness proofs stored encrypted and accessible strictly by authorized compliance personnel.</li>
              <li><strong>Technical Metadata:</strong> IP addresses and user agents recorded solely for fraud prevention and legal statutory age affirmations.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              2. Peer-to-Peer WebRTC Media Privacy
            </h2>
            <p className="text-slate-400">
              Live audio and video calls utilize peer-to-peer WebRTC connections protected by Datagram Transport Layer Security (DTLS) and Secure Real-time Transport Protocol (SRTP). Media frames are sent directly between participating browsers without passing through persistent recording servers. Spotizan does not capture, record, or retain copies of video calls.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-purple-400" />
              3. Automatic 24-Hour Ephemeral Chat Expiration
            </h2>
            <p className="text-slate-400">
              Text messages exchanged within live call rooms are tagged with a MongoDB TTL (Time-To-Live) index and permanently destroyed after 24 hours. No message logs are stored indefinitely.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              4. User Rights Under DPDP Act 2023 & GDPR
            </h2>
            <p className="text-slate-400">
              You possess statutory rights to access your account data, request corrections, or demand the permanent deletion of your profile and personal information. Deletion requests can be initiated by emailing grievance@spotizan.local or via your account settings.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
