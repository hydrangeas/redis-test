import React from "react";
import { cn } from "@/utils/cn";

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const Form: React.FC<FormProps> = ({
  children,
  className,
  onSubmit,
  ...props
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <form
      className={cn("space-y-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      {children}
    </form>
  );
};

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {}

export const FormField: React.FC<FormFieldProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  );
};

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const FormLabel: React.FC<FormLabelProps> = ({
  children,
  className,
  required = false,
  ...props
}) => {
  return (
    <label
      className={cn("block text-sm font-medium text-gray-700", className)}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

interface FormHelperTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: boolean;
}

export const FormHelperText: React.FC<FormHelperTextProps> = ({
  children,
  className,
  error = false,
  ...props
}) => {
  return (
    <p
      className={cn(
        "text-sm",
        error ? "text-red-600" : "text-gray-500",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
};

interface FormErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FormError: React.FC<FormErrorProps> = ({
  children,
  className,
  ...props
}) => {
  if (!children) return null;
  
  return (
    <p
      className={cn("text-sm text-red-600", className)}
      role="alert"
      {...props}
    >
      {children}
    </p>
  );
};