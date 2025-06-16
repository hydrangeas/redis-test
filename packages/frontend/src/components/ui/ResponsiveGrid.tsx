import React from "react";
import { cn } from "@/utils/cn";

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { default: 1, md: 2, lg: 3 },
  gap = 6,
  className,
}) => {
  const gridClasses = [];

  // デフォルトのカラム数
  if (cols.default) {
    gridClasses.push(`grid-cols-${cols.default}`);
  }

  // レスポンシブカラム数
  if (cols.sm) {
    gridClasses.push(`sm:grid-cols-${cols.sm}`);
  }
  if (cols.md) {
    gridClasses.push(`md:grid-cols-${cols.md}`);
  }
  if (cols.lg) {
    gridClasses.push(`lg:grid-cols-${cols.lg}`);
  }
  if (cols.xl) {
    gridClasses.push(`xl:grid-cols-${cols.xl}`);
  }

  // ギャップ
  gridClasses.push(`gap-${gap}`);

  return (
    <div className={cn("grid", ...gridClasses, className)}>{children}</div>
  );
};
