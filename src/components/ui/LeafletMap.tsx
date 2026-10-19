'use client';

import { MapContainer as LeafletContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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
 */
export default function LeafletMap({
  points,
  route = false,
  height = 320,
  label = 'Map',
}: {
  points: MapPoint[];
  route?: boolean;
  height?: number;
  label?: string;
}) {
  const valid = points.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && !(p.lat === 0 && p.lon === 0),
  );

  // Center on the first point, else on Ahmedabad (AUDA's jurisdiction).
  const center: [number, number] = valid.length
    ? [valid[0].lat, valid[0].lon]
    : [23.0225, 72.5714];
  const zoom = valid.length ? 14 : 11;

  return (
    <div style={{ height }} className="overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
      <LeafletContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        aria-label={label}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route && valid.length > 1 && (
          <Polyline positions={valid.map((p) => [p.lat, p.lon])} pathOptions={{ color: '#2563EB' }} />
        )}
        {valid.map((p, i) => (
          <Marker key={p.id ?? i} position={[p.lat, p.lon]} icon={icon}>
            {p.label && <Popup>{p.label}</Popup>}
          </Marker>
        ))}
      </LeafletContainer>
    </div>
  );
}
