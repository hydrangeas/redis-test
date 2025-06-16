import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const textareaVariants = cva(
  "w-full rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
  {
    variants: {
      variant: {
        default:
          "border-gray-300 focus:border-purple-500 focus:ring-purple-500",
        error: "border-red-500 focus:border-red-500 focus:ring-red-500",
        success: "border-green-500 focus:border-green-500 focus:ring-green-500",
      },
      size: {
        small: "px-2 py-1 text-sm",
        medium: "px-3 py-2",
        large: "px-4 py-3 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "medium",
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  error?: boolean;
  helperText?: string;
  label?: string;
  required?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant,
      size,
      error,
      helperText,
      label,
      required,
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId =
      id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const helperId = helperText ? `${textareaId}-helper` : undefined;

    const actualVariant = error ? "error" : variant;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={cn(
            textareaVariants({ variant: actualVariant, size }),
            className
          )}
          aria-invalid={error}
          aria-describedby={helperId}
          {...props}
        />

        {helperText && (
          <p
            id={helperId}
            className={cn(
              "mt-1 text-sm",
              error ? "text-red-600" : "text-gray-500"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
