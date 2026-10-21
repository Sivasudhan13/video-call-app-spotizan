import React from 'react';

const BADGE_VARIANTS = {
  adult: 'bg-[#FFF0EC] text-[#D92D20] border-[#FFC7BD] font-bold tracking-wider',
  verified: 'bg-[#E8F8F0] text-[#218A58] border-[#A8E6C5] font-medium',
  live: 'bg-[#FFF0EC] text-[#FF6347] border-[#FFC7BD] font-semibold',
  lavender: 'bg-[#F1EDFF] text-[#7960D8] border-[#B9A7F5] font-medium',
  info: 'bg-[#F1EDFF] text-[#7960D8] border-[#E8E4F0]',
  warning: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
  purple: 'bg-[#F1EDFF] text-[#7960D8] border-[#B9A7F5]',
  neutral: 'bg-white text-[#777387] border-[#E8E4F0]',
};

export function Badge({ children, variant = 'neutral', className = '', icon: Icon }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${BADGE_VARIANTS[variant]} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </span>
  );
}
