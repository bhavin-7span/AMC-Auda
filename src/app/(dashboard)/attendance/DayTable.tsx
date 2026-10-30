'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarClock, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMinutes, type DaySummary } from '@/lib/data/attendance';
import { STATUS_BADGE, fmtTime } from './format';

export type DailyRow = Omit<DaySummary, 'punches' | 'attendance_date'>;

/** Day-wise attendance rows; clicking a row opens that employee's in/out detail. */
export function DayTable({ rows, date }: { rows: DailyRow[]; date: string }) {
  const router = useRouter();
  const detailHref = (r: DailyRow) => `/attendance/${r.user_id}?date=${date}`;

  return (
    <Table data-testid="data-table">
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>First in</TableHead>
          <TableHead>Last out</TableHead>
          <TableHead>Worked</TableHead>
          <TableHead>Punches</TableHead>
          <TableHead>Exceptions</TableHead>
          <TableHead className="w-14">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-8 text-center text-muted-foreground" data-testid="data-table-empty">
              No employees match this view.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((r) => (
            <TableRow key={r.user_id} className="cursor-pointer" onClick={() => router.push(detailHref(r))}>
              <TableCell>
                <Link
                  href={detailHref(r)}
                  className="font-semibold text-info hover:underline"
                  data-testid={`employee-${r.user_id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.full_name ?? '—'}
                </Link>
                <div className="text-xs text-muted-foreground">{r.employee_id ?? '—'}</div>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[r.status].variant} data-testid={`status-${r.status}`}>
                  <span aria-hidden className="size-1.5 rounded-full bg-current" />
                  {STATUS_BADGE[r.status].label}
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums">{fmtTime(r.first_in)}</TableCell>
              <TableCell className="tabular-nums">{fmtTime(r.last_out)}</TableCell>
              <TableCell className="tabular-nums">
                {r.status === 'absent' ? '—' : formatMinutes(r.worked_minutes)}
              </TableCell>
              <TableCell className="tabular-nums">{r.punch_count || '—'}</TableCell>
              <TableCell>
                {r.exception_count ? (
                  <Badge variant="destructive" data-testid={`exceptions-${r.user_id}`}>
                    {r.exception_count}
                    {r.outside_count ? ` · ${r.outside_count} outside` : ''}
                  </Badge>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="outline" size="icon" aria-label={`Actions for ${r.full_name ?? 'employee'}`} />}
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => router.push(detailHref(r))}>
                      <CalendarClock /> View punch log
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
