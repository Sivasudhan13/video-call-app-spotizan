import React from 'react';

const VARIANTS = {
  primary:
    'bg-[#FF6347] hover:bg-[#e85338] text-white shadow-md shadow-[#FF6347]/25 active:scale-[0.98]',
  secondary:
    'bg-[#7960D8] hover:bg-[#6950c4] text-white shadow-md shadow-[#7960D8]/20 active:scale-[0.98]',
  lavender:
    'bg-[#F1EDFF] hover:bg-[#e3dbff] text-[#7960D8] font-semibold border border-[#E8E4F0] active:scale-[0.98]',
  outline:
    'bg-white hover:bg-[#F1EDFF] text-[#27243A] border border-[#E8E4F0] hover:border-[#B9A7F5] active:scale-[0.98]',
  danger:
    'bg-[#D92D20] hover:bg-[#bd2519] text-white shadow-md shadow-[#D92D20]/20 active:scale-[0.98]',
  ghost:
    'bg-transparent hover:bg-[#F1EDFF] text-[#777387] hover:text-[#27243A]',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm font-semibold rounded-xl gap-2',
  lg: 'px-6 py-3 text-base font-semibold rounded-xl gap-2.5',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  isLoading = false,
  loading = false,
  icon: Icon,
  type = 'button',
  onClick,
  ...props
}) {
  const isBusy = isLoading || loading;
  return (
    <button
      type={type}
      disabled={disabled || isBusy}
      onClick={onClick}
      className={`inline-flex items-center justify-center transition-all duration-200 select-none ${VARIANTS[variant]} ${SIZES[size]} ${
        disabled || isBusy ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
      {...props}
    >
      {isBusy ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
