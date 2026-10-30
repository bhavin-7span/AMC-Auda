"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminInspectionRow } from "@/lib/data/admin";
import { inspectionStatus } from "@/lib/inspection-status";
import { InspectionDrawer } from "./InspectionDrawer";
import {
  InspectionFilters,
  type FilterOption,
  type InspectionFilterValues,
} from "./InspectionFilters";

const TABS = [
  { value: "all", label: "All records", status: null },
  { value: "pending", label: "Pending review", status: "submitted" },
  { value: "completed", label: "Completed", status: "completed" },
] as const;

const OPTIONAL_COLUMNS = [
  { key: "type", label: "Type / location" },
  { key: "assignee", label: "Assigned officer" },
  { key: "scheduled", label: "Scheduled" },
  { key: "priority", label: "Priority" },
] as const;
type ColumnKey = (typeof OPTIONAL_COLUMNS)[number]["key"];

const fmtScheduled = (ts: string) =>
  new Date(ts).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Inspection register: status tabs, toolbar (search, status, filter sheet, column
 * picker), the server-paged table (admin_list_inspections) and pagination. Clicking a
 * row opens its detail in a drawer on the same route (`?inspection=<id>`).
 */
export function InspectionsList({
  rows,
  total,
  page,
  pageSize,
  current,
  pendingCount,
  departments,
  types,
  staff,
  assigneeNames,
}: {
  rows: AdminInspectionRow[];
  total: number;
  page: number;
  pageSize: number;
  current: InspectionFilterValues;
  pendingCount: number;
  departments: FilterOption[];
  types: FilterOption[];
  staff: FilterOption[];
  /** user_id → officer name, for the Assigned officer column. */
  assigneeNames: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>({
    type: true,
    assignee: true,
    scheduled: true,
    priority: true,
  });
  const openId = searchParams.get("inspection");
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const typeNames = new Map(types.map((t) => [t.id, t.name]));
  const deptNames = new Map(departments.map((d) => [d.id, d.name]));
  const tab =
    TABS.find((t) => t.status === (current.status ?? null))?.value ?? "all";
  const colSpan = 3 + OPTIONAL_COLUMNS.filter((c) => visible[c.key]).length;

  function hrefWith(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }
  const pageHref = (next: number) =>
    hrefWith((p) =>
      next > 0 ? p.set("page", String(next)) : p.delete("page"),
    );
  const detailHref = (id: string) => hrefWith((p) => p.set("inspection", id));
  const openDetail = (id: string) =>
    router.push(detailHref(id), { scroll: false });
  const closeDetail = () =>
    router.replace(
      hrefWith((p) => p.delete("inspection")),
      { scroll: false },
    );

  function selectTab(value: string) {
    const status = TABS.find((t) => t.value === value)?.status ?? null;
    router.replace(
      hrefWith((p) => {
        if (status) p.set("status", status);
        else p.delete("status");
        p.delete("page");
      }),
      { scroll: false },
    );
  }

  const columns = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="lg" data-testid="columns-toggle" />
        }
      >
        <Columns3 /> Columns
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show columns</DropdownMenuLabel>
          {OPTIONAL_COLUMNS.map((c) => (
            <DropdownMenuCheckboxItem
              key={c.key}
              checked={visible[c.key]}
              onCheckedChange={(checked) =>
                setVisible((v) => ({ ...v, [c.key]: Boolean(checked) }))
              }
            >
              {c.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <Card className="gap-0 py-0" data-testid="data-table">
        <Tabs
          value={tab}
          onValueChange={(v) => selectTab(String(v))}
          className="border-b px-4"
        >
          <TabsList variant="line" className="h-12 gap-5">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="flex-none px-0"
                data-testid={`tab-${t.value}`}
              >
                {t.label}
                {t.value === "pending" && pendingCount > 0 && (
                  <Badge
                    variant="warning"
                    className="h-4 min-w-4 px-1 text-[10px]"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="border-b p-4">
          <InspectionFilters
            departments={departments}
            types={types}
            staff={staff}
            current={current}
            right={columns}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Inspection ID</TableHead>
              {visible.type && <TableHead>Type / location</TableHead>}
              {visible.assignee && <TableHead>Assigned officer</TableHead>}
              {visible.scheduled && <TableHead>Scheduled</TableHead>}
              <TableHead>Status</TableHead>
              {visible.priority && <TableHead>Priority</TableHead>}
              <TableHead className="w-14">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="py-10 text-center text-muted-foreground"
                  data-testid="data-table-empty"
                >
                  No inspections found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const status = inspectionStatus(r.status);
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    data-state={openId === r.id ? "selected" : undefined}
                    onClick={() => openDetail(r.id)}
                  >
                    <TableCell>
                      <Link
                        href={detailHref(r.id)}
                        scroll={false}
                        data-testid={`inspection-link-${r.id}`}
                        className="font-semibold text-info hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.ref_no}
                      </Link>
                    </TableCell>
                    {visible.type && (
                      <TableCell>
                        <p className="font-medium">
                          {typeNames.get(r.inspection_type_id) ?? "Inspection"}
                        </p>
                        <p className="max-w-64 truncate text-xs text-muted-foreground">
                          {r.title}
                          {deptNames.get(r.department_id)
                            ? ` · ${deptNames.get(r.department_id)}`
                            : ""}
                        </p>
                      </TableCell>
                    )}
                    {visible.assignee && (
                      <TableCell data-testid={`assignee-${r.id}`}>
                        {r.assigned_to ? (
                          (assigneeNames[r.assigned_to] ?? "Assigned")
                        ) : (
                          <span className="text-muted-foreground">
                            Unassigned
                          </span>
                        )}
                      </TableCell>
                    )}
                    {visible.scheduled && (
                      <TableCell>{fmtScheduled(r.scheduled_at)}</TableCell>
                    )}
                    <TableCell>
                      <Badge variant={status.variant}>
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full bg-current"
                        />
                        {status.label}
                      </Badge>
                    </TableCell>
                    {visible.priority && (
                      <TableCell className="capitalize">{r.priority}</TableCell>
                    )}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label={`Actions for ${r.ref_no}`}
                              data-testid={`row-menu-${r.id}`}
                            />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openDetail(r.id)}>
                            <Eye /> View details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
          <span data-testid="data-table-range">
            Showing {from}–{to} of {total} records
          </span>
          <nav aria-label="Pagination" className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              nativeButton={false}
              render={
                <Link
                  href={pageHref(page - 1)}
                  scroll={false}
                  aria-disabled={page <= 0}
                  data-testid="page-prev"
                />
              }
              className={
                page <= 0 ? "pointer-events-none opacity-50" : undefined
              }
            >
              <ChevronLeft />
            </Button>
            {Array.from({ length: pageCount }, (_, i) => i)
              .filter(
                (i) =>
                  Math.abs(i - page) <= 2 || i === 0 || i === pageCount - 1,
              )
              .map((i, idx, arr) => (
                <span key={i} className="flex items-center gap-1">
                  {idx > 0 && i - arr[idx - 1] > 1 && (
                    <span className="px-1">…</span>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    nativeButton={false}
                    aria-current={i === page ? "page" : undefined}
                    className={
                      i === page
                        ? "border-info bg-info-soft text-info"
                        : undefined
                    }
                    render={<Link href={pageHref(i)} scroll={false} />}
                  >
                    {i + 1}
                  </Button>
                </span>
              ))}
            <span className="sr-only" data-testid="page-indicator">
              Page {page + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              nativeButton={false}
              render={
                <Link
                  href={pageHref(page + 1)}
                  scroll={false}
                  aria-disabled={page >= pageCount - 1}
                  data-testid="page-next"
                />
              }
              className={
                page >= pageCount - 1
                  ? "pointer-events-none opacity-50"
                  : undefined
              }
            >
              <ChevronRight />
            </Button>
          </nav>
        </div>
      </Card>

      <InspectionDrawer id={openId} onClose={closeDetail} />
    </>
  );
}
