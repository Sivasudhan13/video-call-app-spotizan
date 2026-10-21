import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';
import { Button } from './Button';

export function AgeNoticeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem('spotizan_age_consent');
    if (!verified) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('spotizan_age_consent', 'true');
    setIsOpen(false);
  };

  const handleDecline = () => {
    window.location.href = 'https://www.google.com';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0F1626] border border-rose-900/60 rounded-2xl p-6 md:p-8 shadow-2xl shadow-rose-950/40">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 text-xs font-bold bg-rose-900/80 text-rose-200 border border-rose-700/60 rounded-full mb-1">
              STRICTLY 18+ ONLY
            </span>
            <h3 className="text-xl font-bold text-white">Age Verification Notice</h3>
          </div>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          Spotizan is an adult entertainment and paid creator calling marketplace. By entering, you declare and affirm that:
        </p>

        <ul className="text-xs text-slate-300 space-y-2.5 mb-6 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>You are at least 18 years of age (or legal majority age in your jurisdiction).</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Adult content and live video interactions are legal in your location.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>You understand all creators undergo KYC verification and calls operate under transparent per-minute INR billing.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>You will respect performer consent, privacy, and zero tolerance for harassment.</span>
          </li>
        </ul>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleAccept}
            variant="primary"
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold"
          >
            I am 18 or Older — Enter
          </Button>
          <Button
            onClick={handleDecline}
            variant="outline"
            className="flex-1 py-2.5 text-slate-400 hover:text-slate-200"
          >
            Under 18 — Exit
          </Button>
        </div>
      </div>
    </div>
  );
}
