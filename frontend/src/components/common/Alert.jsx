import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const ALERT_STYLES = {
  warning: {
    container: 'bg-amber-950/40 border-amber-800/60 text-amber-200',
    icon: AlertTriangle,
  },
  error: {
    container: 'bg-rose-950/40 border-rose-800/60 text-rose-200',
    icon: XCircle,
  },
  success: {
    container: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200',
    icon: CheckCircle,
  },
  info: {
    container: 'bg-sky-950/40 border-sky-800/60 text-sky-200',
    icon: Info,
  },
};

export function Alert({ type = 'info', title, children, className = '' }) {
  const style = ALERT_STYLES[type] || ALERT_STYLES.info;
  const Icon = style.icon;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm backdrop-blur-md ${style.container} ${className}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-1 text-white">{title}</h4>}
        <div className="text-slate-300 text-xs md:text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
