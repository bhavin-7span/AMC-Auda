'use client';

import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { TrendPoint } from '@/lib/data/dashboard';

const TRACK = 'var(--border)';

/** Inspection workflow statuses, in workflow order, with their chart colour. */
export const STATUSES = [
  { code: 'new', label: 'New', color: 'var(--chart-8)' },
  { code: 'assigned', label: 'Assigned', color: 'var(--chart-5)' },
  { code: 'in_progress', label: 'In progress', color: 'var(--chart-1)' },
  { code: 'submitted', label: 'Submitted', color: 'var(--chart-6)' },
  { code: 'under_review', label: 'Under review', color: 'var(--chart-3)' },
  { code: 'rework', label: 'Rework', color: 'var(--chart-4)' },
  { code: 'completed', label: 'Completed', color: 'var(--chart-2)' },
  { code: 'closed', label: 'Closed', color: 'var(--chart-7)' },
] as const;

const trendConfig = {
  created: { label: 'Created', color: 'var(--chart-1)' },
  completed: { label: 'Completed', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const fmtDay = (date: string) =>
  new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
  });

/** Inspections created vs completed per day. */
export function ActivityChart({ data }: { data: TrendPoint[] }) {
  return (
    <ChartContainer config={trendConfig} className="aspect-auto h-64 w-full">
      <AreaChart data={data} margin={{ top: 8, left: 0, right: 8 }}>
        <defs>
          <linearGradient id="fill-created" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-created)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--color-created)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fill-completed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={fmtDay}
        />
        <YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" labelFormatter={(v) => fmtDay(String(v))} />}
        />
        <Area
          dataKey="created"
          type="monotone"
          stroke="var(--color-created)"
          strokeWidth={2}
          fill="url(#fill-created)"
          isAnimationActive={false}
        />
        <Area
          dataKey="completed"
          type="monotone"
          stroke="var(--color-completed)"
          strokeWidth={2}
          fill="url(#fill-completed)"
          isAnimationActive={false}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}

const donutConfig = Object.fromEntries(
  STATUSES.map((s) => [s.code, { label: s.label, color: s.color }]),
) satisfies ChartConfig;

/**
 * Status distribution donut with the total in the centre and a legend whose entries open
 * the inspection list filtered to that status (department scope preserved).
 */
export function StatusDonut({
  total,
  byStatus,
  departmentId,
}: {
  total: number;
  byStatus: Record<string, number>;
  departmentId?: string;
}) {
  const deptParam = departmentId ? `&department=${encodeURIComponent(departmentId)}` : '';
  const rows = STATUSES.map((s) => ({ ...s, count: byStatus[s.code] ?? 0 }));
  const slices = rows.some((r) => r.count > 0)
    ? rows.filter((r) => r.count > 0)
    : [{ code: 'empty', label: 'None', color: TRACK, count: 1 }];

  return (
    <div className="flex flex-col items-center gap-4">
      <ChartContainer config={donutConfig} className="aspect-square size-44 shrink-0">
        <PieChart>
          {total > 0 && <ChartTooltip content={<ChartTooltipContent nameKey="code" hideLabel />} />}
          <Pie
            data={slices}
            dataKey="count"
            nameKey="code"
            innerRadius={52}
            outerRadius={76}
            stroke="var(--card)"
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {slices.map((s) => (
              <Cell key={s.code} fill={s.color} />
            ))}
            <Label
              content={({ viewBox }) =>
                viewBox && 'cx' in viewBox ? (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                      {total}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                      Total
                    </tspan>
                  </text>
                ) : null
              }
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="grid w-full grid-cols-2 gap-x-6 text-sm">
        {rows.map((r) => (
          <li key={r.code}>
            <Link
              href={`/inspections?status=${r.code}${deptParam}`}
              data-testid={`status-${r.code}`}
              className="flex items-center gap-2 border-b py-1.5 hover:text-primary"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
              <span className="flex-1 truncate text-muted-foreground">{r.label}</span>
              <span className="font-semibold tabular-nums">{r.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Percentage ring (e.g. today's attendance rate) with the percentage in the centre. */
export function PercentRing({ percent, color = 'var(--chart-2)' }: { percent: number; color?: string }) {
  const value = Math.max(0, Math.min(100, percent));
  const slices = [
    { key: 'value', count: value, fill: color },
    { key: 'rest', count: 100 - value, fill: TRACK },
  ].filter((s) => s.count > 0);

  return (
    <ChartContainer config={{}} className="aspect-square size-28 shrink-0">
      <PieChart>
        <Pie
          data={slices}
          dataKey="count"
          nameKey="key"
          innerRadius={42}
          outerRadius={54}
          stroke="transparent"
          startAngle={90}
          endAngle={-270}
          isAnimationActive={false}
        >
          {slices.map((s) => (
            <Cell key={s.key} fill={s.fill} />
          ))}
          <Label
            value={`${Math.round(value)}%`}
            position="center"
            className="fill-foreground text-lg font-bold"
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
