import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export type Column<T = any> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

type Props<T = any> = {
  columns: Column<T>[];
  data: T[];
  className?: string;
  rowKey?: string | ((row: T, index: number) => string);
  noDataMessage?: string;
};

/**
 * Reusable DataTable component.
 * - columns: array of { key, label, render? }
 * - data: array of row objects
 * - rowKey: string property name or function to generate unique key per row
 */
export default function DataTable<T = any>({
  columns,
  data,
  className = '',
  rowKey = 'id',
  noDataMessage = 'No data available',
}: Props<T>) {
  const getRowKey = (row: T, index: number) => {
    if (typeof rowKey === 'function') return rowKey(row, index);
    // @ts-ignore
    return (row as any)[rowKey] ?? String(index);
  };

  return (
    <div className={className}>
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className ?? ''}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell className="text-center text-muted-foreground" colSpan={columns.length}>
                {noDataMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow key={getRowKey(row, i)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className ?? ''}>
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
