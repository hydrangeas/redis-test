import React from "react";
import { cn } from "@/utils/cn";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
}

export const Table: React.FC<TableProps> = ({
  children,
  className,
  striped = false,
  hoverable = false,
  bordered = false,
  ...props
}) => {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          "min-w-full divide-y divide-gray-200",
          bordered && "border border-gray-200",
          className
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ children, className, ...props }) => {
  return (
    <thead className={cn("bg-gray-50", className)} {...props}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ children, className, ...props }) => {
  return (
    <tbody
      className={cn("bg-white divide-y divide-gray-200", className)}
      {...props}
    >
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <tr
      className={cn("hover:bg-gray-50 transition-colors", className)}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableCell: React.FC<
  React.TdHTMLAttributes<HTMLTableCellElement>
> = ({ children, className, ...props }) => {
  return (
    <td
      className={cn("px-6 py-4 whitespace-nowrap text-sm", className)}
      {...props}
    >
      {children}
    </td>
  );
};

export const TableHeaderCell: React.FC<
  React.ThHTMLAttributes<HTMLTableCellElement>
> = ({ children, className, ...props }) => {
  return (
    <th
      className={cn(
        "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
};
