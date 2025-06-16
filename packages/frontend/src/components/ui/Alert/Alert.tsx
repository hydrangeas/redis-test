import React, { forwardRef } from "react";
import { cn } from "../../../lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "info" | "success" | "warning" | "error";
  icon?: React.ReactNode;
  onClose?: () => void;
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    { className, variant = "default", icon, onClose, children, ...props },
    ref
  ) => {
    const baseStyles = "relative w-full rounded-lg p-4 transition-all";

    const variants = {
      default: "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
      info: "bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
      success:
        "bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800",
      warning:
        "bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
      error:
        "bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800",
    };

    const defaultIcons = {
      default: null,
      info: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      success: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      warning: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      error: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    };

    const displayIcon = icon !== undefined ? icon : defaultIcons[variant];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        <div className="flex">
          {displayIcon && (
            <div className="flex-shrink-0 mr-3">{displayIcon}</div>
          )}
          <div className="flex-1">{children}</div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-3 flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close alert"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";

export interface AlertTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

export const AlertTitle = forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h5
        ref={ref}
        className={cn(
          "mb-1 font-medium leading-none tracking-tight",
          className
        )}
        {...props}
      >
        {children}
      </h5>
    );
  }
);

AlertTitle.displayName = "AlertTitle";

export interface AlertDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export const AlertDescription = forwardRef<
  HTMLParagraphElement,
  AlertDescriptionProps
>(({ className, children, ...props }, ref) => {
  return (
    <p ref={ref} className={cn("text-sm opacity-90", className)} {...props}>
      {children}
    </p>
  );
});

AlertDescription.displayName = "AlertDescription";

export default Alert;
