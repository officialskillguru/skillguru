import { useId, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SlidersHorizontal, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Download, Inbox } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { exportToCSV } from "@/utils/export";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  bulkActions?: { label: string; onClick: (rows: TData[]) => void; variant?: "secondary" | "destructive" }[];
  hideToolbar?: boolean;
  hidePagination?: boolean;
  /** Filename (without extension) to enable a built-in "Export CSV" toolbar button, exporting the filtered rows currently in view. */
  exportFilename?: string;
  /** Pin the header row so it stays visible while scrolling a tall table. */
  stickyHeader?: boolean;
  /** Shows animated skeleton rows instead of "No results found" while data is loading. */
  isLoading?: boolean;
  /** Custom empty state shown when there are zero rows and isLoading is false. Falls back to a generic one. */
  emptyState?: { title: string; description: string; primaryAction?: ReactNode; secondaryAction?: ReactNode };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  bulkActions,
  hideToolbar = false,
  hidePagination = false,
  exportFilename,
  stickyHeader = false,
  isLoading = false,
  emptyState,
}: Readonly<DataTableProps<TData, TValue>>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const pageSizeSelectId = useId();

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="space-y-4">
      {!hideToolbar && (
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            {searchKey && (
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
              />
            )}
            {bulkActions && Object.keys(rowSelection).length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {table.getFilteredSelectedRowModel().rows.length} selected
                </span>
                {bulkActions.map((action, i) => (
                  <Button
                    key={i}
                    variant={action.variant ?? "secondary"}
                    size="sm"
                    onClick={() => {
                      const selectedRows = table.getFilteredSelectedRowModel().rows.map(
                        (row) => row.original
                      );
                      action.onClick(selectedRows);
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {exportFilename && (
              <Button
                variant="outline"
                size="sm"
                className="hidden h-8 lg:flex"
                onClick={() =>
                  exportToCSV(
                    table.getFilteredRowModel().rows.map((row) => row.original as Record<string, unknown>),
                    exportFilename
                  )
                }
              >
                <Download className="mr-2 size-4" />
                Export
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden h-8 lg:flex">
                  <SlidersHorizontal className="mr-2 size-4" />
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" && column.getCanHide()
                  )
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {isLoading ? "Loading data…" : `${table.getRowModel().rows?.length ?? 0} rows loaded.`}
      </div>
      <div
        aria-busy={isLoading}
        className={`rounded-md border border-border bg-card shadow-sm ${stickyHeader ? "max-h-[70vh] overflow-auto" : "overflow-hidden"}`}
      >
        <Table>
          <TableHeader className={`bg-muted/30 ${stickyHeader ? "sticky top-0 z-10 backdrop-blur-sm" : ""}`}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="font-bold text-foreground">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="border-b-border/50">
                  {columns.map((_col, colIndex) => (
                    <TableCell key={colIndex} className="py-3">
                      <div aria-hidden="true" className="h-4 animate-pulse rounded bg-muted" style={{ width: colIndex === 0 ? "70%" : "45%" }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="border-b-border/50 transition hover:bg-muted/20">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState
                    className="border-0 bg-transparent"
                    icon={<Inbox className="size-8" aria-hidden="true" />}
                    title={emptyState?.title ?? "No results found"}
                    description={emptyState?.description ?? "Try adjusting your search or filters."}
                    primaryAction={emptyState?.primaryAction}
                    secondaryAction={emptyState?.secondaryAction}
                    headingLevel={2}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!hidePagination && (
        <div className="flex items-center justify-between px-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <label htmlFor={pageSizeSelectId} className="text-sm font-medium">Rows per page</label>
              <select
                id={pageSizeSelectId}
                className="h-8 w-[70px] rounded-md border border-border bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={table.getState().pagination.pageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value));
                }}
              >
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="hidden size-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
