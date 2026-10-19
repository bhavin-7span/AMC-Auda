'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import type { MapPoint } from './map-types';

// Leaflet touches the DOM, so load the real map only on the client (no SSR).
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{ height: 320 }}
      className="flex items-center justify-center rounded-lg border border-black/10 bg-black/[.02] text-sm text-zinc-500 dark:border-white/15 dark:bg-white/[.03]"
    >
      Loading map…
    </div>
  ),
});

/**
 * Map slot for the Admin Panel.
 *
 * When `points` are supplied, renders a real, free OpenStreetMap map (Leaflet) with
 * markers and an optional route polyline — no API key or licensing cost, matching the
 * RFP's open-source/royalty-free preference. With no points, shows a labeled placeholder
 * (the historical behavior) so callers that don't yet pass coordinates still render.
 * The tile provider can be swapped for an AUDA-approved service later without changing
 * any call site.
 */
export function MapContainer({
  height = 320,
  label = 'Map',
  points,
  route = false,
  children,
}: {
  height?: number;
  label?: string;
  points?: MapPoint[];
  route?: boolean;
  children?: ReactNode;
}) {
  const hasPoints = Array.isArray(points) && points.some((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  if (hasPoints) {
    return <LeafletMap points={points!} route={route} height={height} label={label} />;
  }

  return (
    <div
      data-testid="map-container"
      role="img"
      aria-label={label}
      style={{ height }}
      className="flex items-center justify-center rounded-lg border border-dashed border-black/20 bg-black/[.02] text-sm text-zinc-500 dark:border-white/20 dark:bg-white/[.03]"
    >
      {children ?? `${label} — no location data`}
    </div>
  );
}
