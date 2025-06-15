import React, { forwardRef } from 'react';
import { cn } from '../../../lib/utils';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  label?: string;
}

const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'md', variant = 'primary', label = 'Loading...', ...props }, ref) => {
    const sizes = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12',
    };

    const variants = {
      primary: 'text-purple-600 dark:text-purple-400',
      secondary: 'text-gray-600 dark:text-gray-400',
      white: 'text-white',
    };

    return (
      <div
        ref={ref}
        role="status"
        aria-label={label}
        className={cn('inline-flex items-center justify-center', className)}
        {...props}
      >
        <svg
          className={cn('animate-spin', sizes[size], variants[variant])}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
        <span className="sr-only">{label}</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  show?: boolean;
  label?: string;
  fullScreen?: boolean;
  blur?: boolean;
}

export const LoadingOverlay = forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ className, show = true, label = 'Loading...', fullScreen = false, blur = true, ...props }, ref) => {
    if (!show) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'absolute inset-0 z-50 flex items-center justify-center',
          blur && 'backdrop-blur-sm',
          fullScreen && 'fixed',
          'bg-white/80 dark:bg-gray-900/80',
          className
        )}
        {...props}
      >
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          {label && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </p>
          )}
        </div>
      </div>
    );
  }
);

LoadingOverlay.displayName = 'LoadingOverlay';

export default Spinner;