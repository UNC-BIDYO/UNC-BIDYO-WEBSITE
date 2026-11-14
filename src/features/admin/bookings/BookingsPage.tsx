import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Search,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import {
  eventDates,
  fullName,
  StatusBadge,
  submittedAt,
  type Booking,
  type BookingStatus,
} from "../format";

type Tab = BookingStatus | "all";

const sortButton = (label: string) =>
  function SortHeader({
    column,
  }: {
    column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" };
  }) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {label}
        <ArrowUpDown />
      </Button>
    );
  };

const columns: ColumnDef<Booking>[] = [
  {
    id: "event",
    header: "Event",
    accessorFn: (b) => `${b.event_title} ${b.organization}`,
    cell: ({ row }) => (
      <div className="min-w-40">
        <p className="font-medium">{row.original.event_title}</p>
        <p className="text-muted-foreground">{row.original.organization}</p>
      </div>
    ),
  },
  {
    id: "requester",
    header: "Requester",
    accessorFn: (b) => `${fullName(b)} ${b.email}`,
    cell: ({ row }) => (
      <div className="min-w-40">
        <p>{fullName(row.original)}</p>
        <p className="text-muted-foreground">{row.original.email}</p>
      </div>
    ),
  },
  {
    id: "date",
    accessorKey: "start_date",
    header: sortButton("Event date"),
    cell: ({ row }) => <span className="whitespace-nowrap">{eventDates(row.original)}</span>,
  },
  { accessorKey: "shooters", header: "Shooters", enableGlobalFilter: false },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    enableGlobalFilter: false,
    filterFn: (row, _id, value: Tab) => value === "all" || row.original.status === value,
    cell: ({ row }) => {
      const b = row.original;
      return (
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge status={b.status} />
          {b.auto_declined && (
            <Badge variant="outline">
              <Zap />
              Auto
            </Badge>
          )}
          {b.status === "approved" && b.calendar_sync_error && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-destructive">
                  <CalendarX2 />
                  Not on calendar
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{b.calendar_sync_error}</TooltipContent>
            </Tooltip>
          )}
          {b.status === "pending" && b.calendar_sync_error && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-destructive">
                  <TriangleAlert />
                  Check date
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{b.calendar_sync_error}</TooltipContent>
            </Tooltip>
          )}
        </div>
      );
    },
  },
  {
    id: "submitted",
    accessorKey: "created_at",
    header: sortButton("Submitted"),
    enableGlobalFilter: false,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {submittedAt(row.original.created_at)}
      </span>
    ),
  },
];

/* shadcn/ui Data Table (Table + TanStack Table): status tabs, search, sorting, pagination.
   Clicking a row opens the booking. */
export function BookingsPage({
  bookings,
  loading,
  onOpen,
}: {
  bookings: Booking[];
  loading: boolean;
  onOpen: (booking: Booking) => void;
}) {
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "submitted", desc: true }]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { pending: 0, approved: 0, declined: 0, all: bookings.length };
    for (const b of bookings) c[b.status ?? "pending"] += 1;
    return c;
  }, [bookings]);

  // Stable references: a new array each render would look like a filter change to TanStack,
  // which sends the table back to page 1 on every render (breaking "Next page").
  const columnFilters = useMemo(() => [{ id: "status", value: tab }], [tab]);

  const table = useReactTable({
    data: bookings,
    columns,
    state: { sorting, globalFilter: search, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
    autoResetPageIndex: true,
  });

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            {(["pending", "approved", "declined", "all"] as const).map((t) => (
              <TabsTrigger key={t} value={t} className="capitalize">
                {t}
                <Badge variant="secondary" className="ml-1 rounded-full px-1.5">
                  {counts[t]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event, organization, name…"
            aria-label="Search bookings"
            className="pl-8"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading && bookings.length === 0 ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  tabIndex={0}
                  onClick={() => onOpen(row.original)}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") &&
                    (e.preventDefault(), onOpen(row.original))
                  }
                  className="cursor-pointer"
                  aria-label={`Open ${row.original.event_title}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {search
                    ? "No bookings match your search."
                    : `No ${tab === "all" ? "" : tab} bookings.`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} booking
          {table.getFilteredRowModel().rows.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
            <span className="sr-only">Previous page</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
