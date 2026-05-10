'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  animating?: boolean;
}

export default function Input({
  label,
  error,
  helperText,
  animating = false,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary placeholder-text-tertiary',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          'disabled:bg-surface-hover disabled:cursor-not-allowed disabled:text-text-tertiary',
          error && 'border-danger focus:ring-danger/20 focus:border-danger',
          animating && 'typewriter-field bg-primary-50/30',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger mt-0.5">{error}</p>}
      {helperText && !error && <p className="text-xs text-text-tertiary mt-0.5">{helperText}</p>}
    </div>
  );
}
