import React from "react";
import { cn } from "@/utils/cn";

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  error?: boolean;
  helperText?: string;
  label?: string;
  required?: boolean;
  orientation?: "horizontal" | "vertical";
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  error,
  helperText,
  label,
  required,
  orientation = "vertical",
  className,
  ...props
}) => {
  const groupId = `radio-group-${Math.random().toString(36).substr(2, 9)}`;
  const helperId = helperText ? `${groupId}-helper` : undefined;

  return (
    <fieldset className={cn("space-y-2", className)} {...props}>
      {label && (
        <legend className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </legend>
      )}
      
      <div
        className={cn(
          orientation === "horizontal" ? "flex space-x-4" : "space-y-2"
        )}
        role="radiogroup"
        aria-describedby={helperId}
        aria-invalid={error}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            disabled={option.disabled}
            error={error}
          />
        ))}
      </div>
      
      {helperText && (
        <p
          id={helperId}
          className={cn(
            "text-sm",
            error ? "text-red-600" : "text-gray-500"
          )}
        >
          {helperText}
        </p>
      )}
    </fieldset>
  );
};

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: boolean;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      className,
      label,
      error,
      id,
      ...props
    },
    ref
  ) => {
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-center">
        <input
          id={radioId}
          ref={ref}
          type="radio"
          className={cn(
            "h-4 w-4 border-gray-300 text-purple-600 focus:ring-purple-500 transition-colors",
            error && "border-red-500",
            props.disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={radioId}
            className={cn(
              "ml-3 block text-sm font-medium text-gray-700",
              props.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Radio.displayName = "Radio";