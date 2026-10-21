import React from 'react';

export function Card({
  children,
  className = '',
  hoverEffect = false,
  glow = false,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl bg-white border border-[#E8E4F0] p-5 md:p-6 shadow-card transition-all duration-300 ${
        hoverEffect
          ? 'hover:border-[#B9A7F5] hover:shadow-soft hover:-translate-y-0.5'
          : ''
      } ${glow ? 'ring-2 ring-[#B9A7F5]/50 border-[#B9A7F5]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div>
        <h3 className="text-lg font-bold text-[#27243A] tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-[#777387] mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
