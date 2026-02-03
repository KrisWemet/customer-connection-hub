import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/TableSkeleton";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface EntityTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  isLoading?: boolean;
}

export function EntityTable<T>({
  columns,
  data,
  emptyMessage = "No records yet.",
  isLoading = false,
}: EntityTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton rows={5} columns={columns.length} />;
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 p-6 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            {columns.map((column, index) => (
              <th key={index} className={cn("px-4 py-3 text-left font-medium", column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-border/60">
              {columns.map((column, columnIndex) => (
                <td key={columnIndex} className={cn("px-4 py-3 text-foreground", column.className)}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
