import type { ReactNode } from 'react';

/**
 * Map container placeholder.
 *
 * The real map provider is an open FRS/SRS decision (AUDA-approved mapping service,
 * design §17 Q5). This component reserves a consistent, labeled, sized slot so
 * inspection maps, the geo-fence editor, attendance location and GIS dashboards all
 * share one integration point (the "map adapter" seam). Swap the inner render for the
 * chosen provider later without touching call sites.
 */
export function MapContainer({
  height = 320,
  label = 'Map',
  children,
}: {
  height?: number;
  label?: string;
  children?: ReactNode;
}) {
  return (
    <div
      data-testid="map-container"
      role="img"
      aria-label={label}
      style={{ height }}
      className="flex items-center justify-center rounded-lg border border-dashed border-black/20 bg-black/[.02] text-sm text-zinc-500 dark:border-white/20 dark:bg-white/[.03]"
    >
      {children ?? `${label} — provider pending FRS/SRS`}
    </div>
  );
}
