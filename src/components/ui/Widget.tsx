import type { ReactNode } from 'react';

/**
 * Dashboard KPI widget. A titled card with a primary value and optional trend/footer.
 * Dashboard screens (Phase 7) feed it role-scoped data; drill-down wraps it in a link.
 */
export function Widget({
  title,
  value,
  hint,
  footer,
}: {
  title: string;
  value: ReactNode;
  hint?: string;
  footer?: ReactNode;
}) {
  return (
    <div
      data-testid="widget"
      className="rounded-lg border border-black/10 p-4 dark:border-white/15"
    >
      <p className="text-sm text-zinc-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight" data-testid="widget-value">
        {value}
      </p>
      {/* zinc-500 (not zinc-400) to meet WCAG AA contrast on white (>= 4.5:1). */}
      {hint && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
      {footer && <div className="mt-2 text-sm">{footer}</div>}
    </div>
  );
}
