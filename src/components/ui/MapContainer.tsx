'use client';

import dynamic from 'next/dynamic';
import { startTransition, useEffect, useState, type ReactNode } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import type { MapPoint } from './map-types';

// Leaflet touches the DOM, so load the real map only on the client (no SSR).
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <PageLoader />,
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
  onPick,
  children,
}: {
  height?: number;
  label?: string;
  points?: MapPoint[];
  route?: boolean;
  /** Location-picker mode: the map always renders and reports clicks. */
  onPick?: (lat: number, lon: number) => void;
  children?: ReactNode;
}) {
  const [plotted, setPlotted] = useState(points);

  useEffect(() => {
    startTransition(() => {
      setPlotted(
        points?.map((point) =>
          point.recordedAt
            ? {
                ...point,
                label: `${point.label ?? 'Staff'} — ${new Date(point.recordedAt).toLocaleString(
                  'en-IN',
                  { timeZone: 'Asia/Kolkata' },
                )}`,
              }
            : point,
        ),
      );
    });
  }, [points]);

  const hasPoints =
    Array.isArray(plotted) && plotted.some((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  if (hasPoints || onPick) {
    return <LeafletMap points={plotted ?? []} route={route} height={height} label={label} onPick={onPick} />;
  }

  return (
    <div
      data-testid="map-container"
      role="img"
      aria-label={label}
      style={{ height }}
      className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground"
    >
      {children ?? `${label} — no location data`}
    </div>
  );
}
