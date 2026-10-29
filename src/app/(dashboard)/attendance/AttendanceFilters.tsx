'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { addDays } from '@/lib/data/attendance';

/**
 * URL-driven controls for the attendance screens, composed from shadcn primitives. Every
 * control rewrites search params (resetting `page`) so the server page re-queries.
 */
function useParamNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    mutate(params);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  };
}

/** Previous/next day, date input and jump to today (`?date=`, omitted for today). */
export function DayPicker({ date, today }: { date: string; today: string }) {
  const nav = useParamNav();
  const go = (next: string) =>
    nav((p) => (next === today ? p.delete('date') : p.set('date', next)));

  return (
    <div className="flex items-center gap-2" data-testid="day-picker">
      <Button variant="outline" size="icon-lg" aria-label="Previous day" data-testid="day-prev" onClick={() => go(addDays(date, -1))}>
        <ChevronLeft />
      </Button>
      <Input
        type="date"
        aria-label="Attendance date"
        value={date}
        max={today}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="h-9 w-40"
        data-testid="day-input"
      />
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Next day"
        data-testid="day-next"
        disabled={date >= today}
        onClick={() => go(addDays(date, 1))}
      >
        <ChevronRight />
      </Button>
      <Button variant="ghost" size="lg" disabled={date === today} onClick={() => go(today)}>
        Today
      </Button>
    </div>
  );
}

/**
 * Status tabs with counts. `exceptions` maps to `?exceptions=1` (kept from the old punch
 * log, the dashboard links to it); the others to `?status=`.
 */
export function StatusTabs({
  value,
  tabs,
}: {
  value: string;
  tabs: { key: string; label: string; count: number }[];
}) {
  const nav = useParamNav();

  return (
    <Tabs
      value={value}
      onValueChange={(next) =>
        nav((p) => {
          p.delete('status');
          p.delete('exceptions');
          if (next === 'exceptions') p.set('exceptions', '1');
          else if (next !== 'all') p.set('status', String(next));
        })
      }
    >
      <TabsList variant="line" className="h-12 flex-wrap gap-5">
        {tabs.map((t) => (
          <TabsTrigger
            key={t.key}
            value={t.key}
            data-testid={t.key === 'exceptions' ? 'filter-exceptions' : `filter-${t.key}`}
            className="flex-none px-0"
          >
            {t.label}
            <Badge variant={t.key === 'exceptions' && t.count > 0 ? 'warning' : 'outline'} className="h-4 min-w-4 px-1 text-[10px] tabular-nums">
              {t.count}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Employee name / ID search kept in `?q=` (applied on Enter or blur). */
export function EmployeeSearch({ value }: { value: string }) {
  const nav = useParamNav();
  const apply = (q: string) => {
    if (q.trim() === value) return;
    nav((p) => (q.trim() ? p.set('q', q.trim()) : p.delete('q')));
  };

  return (
    <div className="relative w-full sm:w-80">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search employee name or ID…"
        aria-label="Search employee"
        defaultValue={value}
        key={value}
        onKeyDown={(e) => e.key === 'Enter' && apply(e.currentTarget.value)}
        onBlur={(e) => apply(e.currentTarget.value)}
        className="h-9 pl-9"
        data-testid="attendance-search"
      />
    </div>
  );
}

/** Date range for an employee's detail (`?from=&to=`), with 7/30-day presets. */
export function RangePicker({ from, to, today }: { from: string; to: string; today: string }) {
  const nav = useParamNav();
  const go = (nextFrom: string, nextTo: string) => {
    if (!nextFrom || !nextTo) return;
    const [a, b] = nextFrom <= nextTo ? [nextFrom, nextTo] : [nextTo, nextFrom];
    nav((p) => {
      p.delete('date');
      p.set('from', a);
      p.set('to', b);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="range-picker">
      <Button variant="ghost" size="lg" onClick={() => go(addDays(to, -6), to)}>
        7 days
      </Button>
      <Button variant="ghost" size="lg" onClick={() => go(addDays(to, -29), to)}>
        30 days
      </Button>
      <Input
        type="date"
        aria-label="From"
        value={from}
        max={today}
        onChange={(e) => go(e.target.value, to)}
        className="h-9 w-40"
        data-testid="range-from"
      />
      <span className="text-sm text-muted-foreground">to</span>
      <Input
        type="date"
        aria-label="To"
        value={to}
        max={today}
        onChange={(e) => go(from, e.target.value)}
        className="h-9 w-40"
        data-testid="range-to"
      />
    </div>
  );
}
