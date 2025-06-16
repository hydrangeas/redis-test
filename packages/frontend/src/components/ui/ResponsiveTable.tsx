import React from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
}: ResponsiveTableProps<T>) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  if (isMobile) {
    // モバイルではカード形式で表示
    return (
      <div className="space-y-4">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            className="bg-white rounded-lg shadow p-4 space-y-2"
          >
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div key={String(col.key)} className="flex justify-between">
                  <span className="text-gray-500 text-sm">{col.header}:</span>
                  <span className="font-medium">
                    {col.render
                      ? col.render(item[col.key], item)
                      : String(item[col.key])}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    );
  }

  // デスクトップでは通常のテーブル
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr key={keyExtractor(item)}>
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className="px-6 py-4 whitespace-nowrap"
                >
                  {col.render
                    ? col.render(item[col.key], item)
                    : String(item[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
