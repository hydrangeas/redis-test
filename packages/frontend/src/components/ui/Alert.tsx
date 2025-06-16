import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";
import {
  CheckCircleIcon,
  ExclamationIcon,
  InformationCircleIcon,
  XCircleIcon,
  XIcon,
} from "@/components/icons";

const alertVariants = cva("flex p-4 rounded-lg", {
  variants: {
    variant: {
      info: "bg-blue-50 text-blue-800",
      success: "bg-green-50 text-green-800",
      warning: "bg-yellow-50 text-yellow-800",
      error: "bg-red-50 text-red-800",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const iconMap = {
  info: InformationCircleIcon,
  success: CheckCircleIcon,
  warning: ExclamationIcon,
  error: XCircleIcon,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = "info",
  title,
  children,
  dismissible = false,
  onDismiss,
  ...props
}) => {
  const Icon = iconMap[variant || "info"];

  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      role="alert"
      {...props}
    >
      <Icon className="flex-shrink-0 h-5 w-5 mr-3" aria-hidden="true" />

      <div className="flex-1">
        {title && <h3 className="text-sm font-medium mb-1">{title}</h3>}
        <div className="text-sm">{children}</div>
      </div>

      {dismissible && (
        <button
          onClick={onDismiss}
          className="ml-auto -mr-1.5 -my-1.5 p-1.5 inline-flex rounded-md hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-black focus:ring-opacity-20"
          aria-label="閉じる"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
