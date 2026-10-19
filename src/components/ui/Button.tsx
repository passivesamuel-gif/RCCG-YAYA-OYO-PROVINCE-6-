import React from 'react';
import { RefreshCw } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'destructive' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-heading font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#123D2A] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'text-[11px] px-3.5 py-2 min-h-[36px] gap-1.5',
    md: 'text-xs px-5 py-2.5 min-h-[42px] gap-2',
    lg: 'text-xs sm:text-sm px-7 py-3.5 min-h-[48px] gap-2.5',
  }[size];

  const variantStyles = {
    primary:
      'bg-[#123D2A] text-white hover:bg-[#1A543A] active:bg-[#0B2519] border border-transparent shadow-xs',
    secondary:
      'bg-white text-[#123D2A] border border-[#123D2A] hover:bg-[#EEF5F0] active:bg-[#EEF5F0]/80',
    quiet:
      'bg-transparent text-[#737B76] hover:text-[#123D2A] hover:bg-[#EEF5F0]/50 border border-transparent',
    destructive:
      'bg-rose-700 text-white hover:bg-rose-800 active:bg-rose-900 border border-transparent shadow-xs',
    gold:
      'bg-[#D4AF65] text-[#123D2A] hover:bg-[#E8D39E] active:bg-[#B99346] border border-transparent shadow-xs',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
