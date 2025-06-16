import React, { forwardRef } from "react";
import { cn } from "../../../lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, hint, leftIcon, rightIcon, id, ...props },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400">
                {leftIcon}
              </span>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "block w-full rounded-lg border px-3 py-2 text-gray-900 dark:text-gray-100",
              "placeholder:text-gray-500 dark:placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors",
              error
                ? "border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500",
              "bg-white dark:bg-gray-800",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400">
                {rightIcon}
              </span>
            </div>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="mt-1 text-sm text-gray-500 dark:text-gray-400"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
