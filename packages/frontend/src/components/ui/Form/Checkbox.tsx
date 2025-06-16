import React from "react";
import { cn } from "@/utils/cn";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: boolean;
  helperText?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const checkboxId =
      id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    const helperId = helperText ? `${checkboxId}-helper` : undefined;

    return (
      <div className="relative">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id={checkboxId}
              ref={ref}
              type="checkbox"
              className={cn(
                "h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 transition-colors",
                error && "border-red-500",
                props.disabled && "opacity-50 cursor-not-allowed",
                className
              )}
              aria-invalid={error}
              aria-describedby={helperId}
              {...props}
            />
          </div>
          {label && (
            <div className="ml-3 text-sm">
              <label
                htmlFor={checkboxId}
                className={cn(
                  "font-medium text-gray-700",
                  props.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {label}
              </label>
            </div>
          )}
        </div>

        {helperText && (
          <p
            id={helperId}
            className={cn(
              "mt-1 text-sm",
              error ? "text-red-600" : "text-gray-500",
              label && "ml-7"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
