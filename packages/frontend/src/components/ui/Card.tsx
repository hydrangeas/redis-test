import React from "react";
import { cn } from "@/utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "none" | "small" | "medium" | "large";
  shadow?: "none" | "small" | "medium" | "large";
}

const paddingClasses = {
  none: "",
  small: "p-3",
  medium: "p-4 md:p-6",
  large: "p-6 md:p-8",
};

const shadowClasses = {
  none: "",
  small: "shadow-sm",
  medium: "shadow",
  large: "shadow-lg",
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
  padding = "medium",
  shadow = "medium",
  ...props
}) => {
  return (
    <div
      className={cn(
        "bg-white rounded-lg",
        paddingClasses[padding],
        shadowClasses[shadow],
        hover && "transition-shadow hover:shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn("pb-4 border-b border-gray-200", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <h3
      className={cn("text-lg font-semibold text-gray-900", className)}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <p
      className={cn("mt-1 text-sm text-gray-600", className)}
      {...props}
    >
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn("pt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn("pt-4 mt-4 border-t border-gray-200", className)}
      {...props}
    >
      {children}
    </div>
  );
};