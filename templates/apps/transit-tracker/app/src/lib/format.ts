/**
 * Board-facing time formatting — pure helpers shared by the arrivals board,
 * itinerary cards, and line pages. No React, so vitest covers them directly.
 *
 * @module
 */

/** Countdown cell: sub-minute arrivals read "due", else "N min". */
export function formatCountdown(secondsUntil: number): string {
  if (secondsUntil < 60) return 'due'
  return `${Math.floor(secondsUntil / 60)} min`
}

/**
 * Epoch ms → local clock time ("14:05"). Boards show 24h-ish locale time;
 * `toLocaleTimeString` without an explicit locale follows the browser.
 */
export function formatClockTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Seconds → "18 min" / "1 h 05 min" (totals on itinerary cards). */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')} min`
}

/** Headway seconds → "every 6 min" style frequency label fragment. */
export function formatHeadway(headwaySeconds: number): string {
  const minutes = Math.max(1, Math.round(headwaySeconds / 60))
  return `${minutes} min`
}

/**
 * Project [lat, lng] points into an SVG viewBox with a padding margin,
 * preserving aspect (no Web Mercator needed at city scale). Returns SVG
 * coordinates + the computed bounds so callers can place stop markers with
 * the exact same projection.
 */
export function projectToSvg(
  points: Array<[number, number]>,
  width: number,
  height: number,
  padding = 24,
): { x: number; y: number }[] {
  if (points.length === 0) return []
  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latSpan = maxLat - minLat
  const lngSpan = maxLng - minLng
  const EPSILON = 1e-9
  // Scale to fit the drawable box; lng maps to x, lat to y INVERTED (north up).
  const scale = Math.min(
    (width - padding * 2) / (lngSpan || EPSILON),
    (height - padding * 2) / (latSpan || EPSILON),
  )
  // Degenerate spans (a single point, or a perfectly N-S line) center the
  // collapsed axis instead of pinning it to the padding edge.
  const lngOffset = (lng: number): number => (lngSpan <= EPSILON ? lngSpan / 2 : lng - minLng)
  const latOffset = (lat: number): number => (latSpan <= EPSILON ? latSpan / 2 : lat - minLat)
  return points.map(([lat, lng]) => ({
    x: padding + (width - padding * 2 - lngSpan * scale) / 2 + lngOffset(lng) * scale,
    y: height - (padding + (height - padding * 2 - latSpan * scale) / 2 + latOffset(lat) * scale),
  }))
}
