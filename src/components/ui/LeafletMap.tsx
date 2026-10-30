'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapPoint } from './map-types';

// Leaflet's default marker icons reference asset files via bundler-relative URLs that
// break under Next/Turbopack. Point them at the CDN copies so markers render.
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * Free, key-less map using OpenStreetMap tiles via Leaflet. Renders markers and an
 * optional route polyline. Client-only (Leaflet needs the DOM) — loaded via dynamic
 * import from MapContainer. OSM is open/royalty-free, matching the RFP's open-source
 * technology preference; the tile source can be swapped for an AUDA-approved provider
 * later without changing call sites.
 *
 * The Leaflet map is created and removed in one effect rather than through
 * react-leaflet's MapContainer, which keeps a removed map alive when React re-runs
 * effects (Strict Mode, or a cached route being hidden and shown again) and then
 * crashes with "Map container is being reused" / `appendChild` of undefined.
 *
 * Zoom is two-finger only, so the page keeps scrolling over a map: pinch on touch
 * screens, pinch on a trackpad, or Ctrl + scroll with a mouse. A plain scroll over the
 * map shows a short hint instead of zooming.
 */
export default function LeafletMap({
  points,
  route = false,
  height = 320,
  label = 'Map',
  onPick,
}: {
  points: MapPoint[];
  route?: boolean;
  height?: number;
  label?: string;
  /** When set, clicking the map reports the clicked coordinates (location picker). */
  onPick?: (lat: number, lon: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Kept in a ref so a new callback identity does not rebuild the map.
  const pickRef = useRef(onPick);
  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);
  const pickable = onPick != null;

  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const centeredRef = useRef(false);
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The map itself is created once (per picker mode); points are drawn into a layer
  // group below, so changing points never tears down and re-creates the map.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    // Ahmedabad (AUDA's jurisdiction) until there is a point to centre on.
    const map = L.map(node, {
      scrollWheelZoom: false, // replaced by the two-finger wheel handler below
      touchZoom: true, // pinch on touch screens
      zoomSnap: 0.25,
    }).setView([23.0225, 72.5714], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    centeredRef.current = false;

    // Trackpad pinch arrives as a wheel event with ctrlKey set (as does Ctrl + mouse
    // wheel). Zoom around the pointer for those; let any other scroll reach the page.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) {
        setHint(true);
        clearTimeout(hintTimer.current);
        hintTimer.current = setTimeout(() => setHint(false), 1500);
        return;
      }
      e.preventDefault();
      setHint(false);
      const zoom = Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), map.getZoom() - e.deltaY * 0.01));
      map.setZoomAround(map.mouseEventToContainerPoint(e), zoom, { animate: false });
    };
    node.addEventListener('wheel', onWheel, { passive: false });

    if (pickable) {
      node.style.cursor = 'crosshair';
      map.on('click', (e: L.LeafletMouseEvent) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
    }

    return () => {
      node.removeEventListener('wheel', onWheel);
      clearTimeout(hintTimer.current);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [pickable]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const valid = points.filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && !(p.lat === 0 && p.lon === 0),
    );
    if (route && valid.length > 1) {
      L.polyline(
        valid.map((p) => [p.lat, p.lon] as L.LatLngTuple),
        { color: '#2563EB' },
      ).addTo(layer);
    }
    for (const p of valid) {
      const marker = L.marker([p.lat, p.lon], { icon }).addTo(layer);
      if (p.label) {
        // Text node, not HTML: labels come from user-entered names.
        const content = document.createElement('span');
        content.textContent = p.label;
        marker.bindPopup(content);
      }
    }
    // Centre on the first point. A picker keeps the user's view once centred, so
    // moving the marker does not jump the map.
    if (valid.length && !(pickable && centeredRef.current)) {
      map.setView([valid[0].lat, valid[0].lon], pickable ? Math.max(map.getZoom(), 14) : 14);
      centeredRef.current = true;
    }
  }, [points, route, pickable]);

  return (
    // `isolate` gives the map its own stacking context: Leaflet's panes and controls use
    // z-index 400–1000, which would otherwise paint over dialogs, sheets and popovers.
    <div style={{ height }} className="relative isolate z-0 overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
      <div ref={containerRef} role="region" aria-label={label} style={{ height: '100%', width: '100%' }} />
      <div
        aria-hidden
        data-testid="map-zoom-hint"
        className={`pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-black/45 px-4 text-center text-sm font-medium text-white transition-opacity duration-200 ${hint ? 'opacity-100' : 'opacity-0'}`}
      >
        Use two fingers to zoom — pinch, or hold Ctrl while scrolling
      </div>
    </div>
  );
}
