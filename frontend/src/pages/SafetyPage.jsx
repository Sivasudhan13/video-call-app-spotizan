import React from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Shield, Lock, EyeOff, UserCheck, AlertTriangle, UserX, FileText } from 'lucide-react';

export function SafetyPage() {
  return (
    <div className="flex-1 bg-[#05070D] py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span>Trust, Safety & Law Enforcement Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            Community Guidelines & Safety Standards
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto">
            Spotizan operates strictly for consenting adults aged 18 and older. We enforce zero tolerance against illegal activity, underage participation, and non-consensual behavior.
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-slate-900/50 border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Mandatory 18+ Verification</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every participant affirms legal majority under penalty of perjury. Creators undergo document and liveness KYC checks before receiving incoming calls or earnings.
            </p>
          </Card>

          <Card className="p-6 bg-slate-900/50 border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800 text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Encrypted WebRTC P2P</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Video and audio streams are directly routed between peer browsers using DTLS-SRTP encryption. Spotizan never records, stores, or sells live peer video streams.
            </p>
          </Card>

          <Card className="p-6 bg-slate-900/50 border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-400">
                <EyeOff className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Ephemeral In-Call Chat</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Text messages exchanged during video calls are automatically wiped from our database within 24 hours pursuant to data minimization and privacy standards.
            </p>
          </Card>

          <Card className="p-6 bg-slate-900/50 border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400">
                <UserX className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Instant 1-Click Block & Skip</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Encountered inappropriate or non-consensual behavior? Click 'Block & Next' directly inside the call. Blocked users are permanently excluded from ever matching with you again.
            </p>
          </Card>
        </div>

        {/* Prohibited Conduct */}
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-4">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Strictly Prohibited Behavior (Instant Termination & Statutory Reporting)</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
            <li>Any attempt by minors (under 18) to access, view, or participate on the platform.</li>
            <li>Non-consensual screen recording, capturing, or distribution of any participant's likeness.</li>
            <li>Harassment, stalking, extortion, hate speech, or commercial solicitations.</li>
            <li>Use of virtual camera software, pre-recorded videos, deepfakes, or impersonation.</li>
            <li>Payment fraud, chargeback abuse, or laundering funds through creator call sessions.</li>
          </ul>
        </div>

        {/* Grievance Officer */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 text-xs">
          <h3 className="font-bold text-white text-sm">Designated Grievance Redressal Mechanism</h3>
          <p className="text-slate-400 leading-relaxed">
            In compliance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, users may file grievance reports regarding any content or platform misconduct.
          </p>
          <div className="font-mono bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 space-y-1">
            <p><strong>Grievance Officer:</strong> Spotizan Redressal Cell</p>
            <p><strong>Email:</strong> grievance@spotizan.local</p>
            <p><strong>Acknowledgment:</strong> Within 24 Hours • <strong>Resolution SLA:</strong> Within 15 Days</p>
          </div>
        </div>
      </div>
    </div>
  );
}
