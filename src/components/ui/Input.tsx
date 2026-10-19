import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightAction, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="space-y-1.5 text-left w-full">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={inputId}
              className="block text-xs font-semibold text-[#252B2A] tracking-wide"
            >
              {label}
            </label>
            {rightAction && <div>{rightAction}</div>}
          </div>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737B76] pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`w-full py-2.5 text-xs bg-[#FAF8F2]/40 border rounded-xs text-[#252B2A] placeholder-[#737B76]/60 transition-colors focus:bg-white focus:outline-none focus:ring-1 ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } pr-3.5 ${
              error
                ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-600'
                : 'border-[#D4AF65]/40 focus:border-[#123D2A] focus:ring-[#123D2A]'
            } ${className}`}
            {...props}
          />
        </div>

        {error ? (
          <p className="text-[11px] text-rose-700 flex items-center gap-1 mt-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : hint ? (
          <p className="text-[10px] text-[#737B76] leading-relaxed mt-0.5">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
