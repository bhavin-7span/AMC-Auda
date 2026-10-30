'use client';

import { Collapsible } from '@base-ui/react/collapsible';
import { ChevronDown, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { MapContainer } from '@/components/ui/MapContainer';
import type { MapPoint } from '@/components/ui/map-types';
import type { AttendanceRow } from '@/lib/data/attendance';
import { punchLabel } from './format';

/**
 * Collapsible map of one day's punch locations on the employee attendance page. The
 * panel unmounts while closed, so Leaflet is only created once it has a real size.
 * Renders nothing when no punch has usable coordinates.
 */
export function DayMap({ date, punches }: { date: string; punches: AttendanceRow[] }) {
  const points = useMemo<MapPoint[]>(
    () =>
      punches
        .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && !(p.latitude === 0 && p.longitude === 0))
        .map((p) => ({
          id: p.id,
          lat: p.latitude,
          lon: p.longitude,
          label: `${punchLabel(p.punch_type)}${p.work_location_name ? ` · ${p.work_location_name}` : ''}`,
          recordedAt: p.punched_at,
        })),
    [punches],
  );

  if (points.length === 0) return null;

  return (
    <Collapsible.Root className="border-t">
      <Collapsible.Trigger
        data-testid={`day-map-toggle-${date}`}
        className="group flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <MapPin className="size-4 text-muted-foreground" />
        Locations on map
        <span className="text-muted-foreground">
          ({points.length} pin{points.length === 1 ? '' : 's'})
        </span>
        <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
      </Collapsible.Trigger>
      <Collapsible.Panel className="px-4 pb-4" data-testid={`day-map-${date}`}>
        <MapContainer height={320} label={`Punch locations on ${date}`} points={points} fitAll />
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
