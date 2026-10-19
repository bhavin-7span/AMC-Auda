import type { ReactNode } from 'react';

/**
 * Filter bar container for list and report screens. Hosts the standard RFP filters
 * (date range, department, location, user, status, category) that feature screens
 * drop in as children. Layout + "clear" affordance only.
 */
export function FilterBar({
  children,
  onClear,
}: {
  children: ReactNode;
  onClear?: () => void;
}) {
  return (
    <div
      data-testid="filter-bar"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 p-3 dark:border-white/15"
    >
      {children}
      {onClear && (
        <button
          type="button"
          data-testid="filter-clear"
          onClick={onClear}
          className="ml-auto h-9 rounded-md px-3 text-sm text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.06]"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
