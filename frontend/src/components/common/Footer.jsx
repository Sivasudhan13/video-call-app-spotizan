import React from 'react';
import { Shield, Lock, AlertCircle, HeartHandshake } from 'lucide-react';
import { Badge } from './Badge';

export function Footer() {
  return (
    <footer className="w-full bg-[#F1EDFF] border-t border-[#E8E4F0] pt-12 pb-8 text-[#777387] text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Compliance Banner */}
        <div className="bg-white border border-[#E8E4F0] p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-card">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#FFF0EC] border border-[#FFC7BD] text-[#FF6347] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[#27243A] text-sm">Age Verification & Compliance Notice</span>
                <Badge variant="adult">STRICTLY 18+</Badge>
              </div>
              <p className="text-[#777387] text-xs max-w-3xl leading-relaxed">
                Spotizan operates exclusively for consenting adults aged 18 and older. All creators undergo multi-factor identity and age verification prior to receiving incoming paid calls. Non-consensual recordings, illegal content, and underage access are strictly forbidden with immediate IP/account banning and statutory reporting.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 text-[#27243A] bg-[#F1EDFF] px-3.5 py-2 rounded-xl border border-[#E8E4F0] text-xs font-medium">
            <Lock className="w-4 h-4 text-[#218A58]" />
            <span>End-to-End P2P WebRTC Calling</span>
          </div>
        </div>

        {/* Navigation & Policies Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4">
          <div>
            <h4 className="text-[#27243A] font-bold mb-3 text-sm">Platform</h4>
            <ul className="space-y-2">
              <li><a href="/discover" className="hover:text-[#7960D8] transition-colors">Browse Creators</a></li>
              <li><a href="/queue" className="hover:text-[#7960D8] transition-colors">Random Matching</a></li>
              <li><a href="/premium" className="hover:text-[#7960D8] transition-colors">Premium Plans</a></li>
              <li><a href="/pricing" className="hover:text-[#7960D8] transition-colors">Wallet & Top Up (INR)</a></li>
              <li><a href="/register" className="hover:text-[#7960D8] transition-colors">Creator Onboarding</a></li>
              <li><a href="/admin" className="text-[#7960D8] hover:underline font-bold flex items-center gap-1">🛡️ Admin Console</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[#27243A] font-bold mb-3 text-sm">Trust & Safety</h4>
            <ul className="space-y-2">
              <li><a href="/safety" className="hover:text-[#7960D8] transition-colors">Safety Guidelines</a></li>
              <li><a href="/safety" className="hover:text-[#7960D8] transition-colors">Consent & Recording Policy</a></li>
              <li><a href="/register" className="hover:text-[#7960D8] transition-colors">Creator Verification (KYC)</a></li>
              <li><a href="/safety" className="hover:text-[#7960D8] transition-colors">Report Abuse</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[#27243A] font-bold mb-3 text-sm">Legal & Policies</h4>
            <ul className="space-y-2">
              <li><a href="/terms" className="hover:text-[#7960D8] transition-colors">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-[#7960D8] transition-colors">Privacy Policy</a></li>
              <li><a href="/refund" className="hover:text-[#7960D8] transition-colors">Refund & Cancellation</a></li>
              <li><a href="/terms" className="hover:text-[#7960D8] transition-colors">Intermediary Compliance</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[#27243A] font-bold mb-3 text-sm">Grievance & Support</h4>
            <p className="text-[#777387] mb-2 leading-relaxed">
              Designated Grievance Officer for India Intermediary Guidelines compliance.
            </p>
            <div className="text-[#27243A] font-mono text-[11px] bg-white p-2.5 rounded-lg border border-[#E8E4F0]">
              grievance@spotizan.local<br />
              Response SLA: &lt; 24 Hours
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-[#E8E4F0] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#777387] text-xs">
          <p>© {new Date().getFullYear()} Spotizan Platform Inc. All rights reserved. • <a href="/admin" className="text-[#7960D8] hover:underline font-semibold">Staff Admin Console</a></p>
          <p className="flex items-center gap-1.5 font-medium">
            <HeartHandshake className="w-4 h-4 text-[#7960D8]" />
            <span>Fair 70% Creator Revenue Share • Transparent Per-Minute Billing</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
