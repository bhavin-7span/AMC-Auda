/** A single point to plot on the map (marker, or vertex of a route polyline). */
export interface MapPoint {
  lat: number;
  lon: number;
  /** Stable key + popup label (optional). */
  id?: string;
  label?: string;
  /** ISO timestamp. Formatted on the client so prerender does not read the clock. */
  recordedAt?: string;
}
