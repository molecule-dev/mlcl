/**
 * Riverton city-grid geometry — app-side mirror of api/src/lib/geo.ts.
 *
 * The city is FICTIONAL, so there is no geocoding service anywhere: a map
 * position is just a point on a 100x100 grid where one unit = one block.
 * The "address" shown to users is derived deterministically from the
 * coordinates (see the API copy of this module for the full contract):
 *
 *   - Avenues run north-south, one every 10 units on the x axis.
 *   - Streets run east-west, one every 2.5 units on the y axis.
 *   - x < 50 is the west side ("W"), x >= 50 the east side ("E").
 *
 * So the pin (34, 27) always reads "4th Ave & E 11th St" — same input,
 * same address, in the picker preview and in the stored row (the API
 * derives + persists it server-side; this copy only powers the preview).
 *
 * @module
 */

/** The city grid is 100x100 blocks; valid coordinates are in [0, 100). */
export const GRID_SIZE = 100

/** Blocks between avenues (north-south roads, on the x axis). */
const AVENUE_SPACING = 10

/** Blocks between streets (east-west roads, on the y axis). */
const STREET_SPACING = 2.5

/** Default "is this a duplicate?" radius in blocks. */
export const DUPLICATE_RADIUS = 5

const ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
  '13th',
  '14th',
  '15th',
  '16th',
  '17th',
  '18th',
  '19th',
  '20th',
  '21st',
  '22nd',
  '23rd',
  '24th',
  '25th',
  '26th',
  '27th',
  '28th',
  '29th',
  '30th',
  '31st',
  '32nd',
  '33rd',
  '34th',
  '35th',
  '36th',
  '37th',
  '38th',
  '39th',
  '40th',
] as const

function ordinal(n: number): string {
  return ORDINALS[n - 1] ?? `${n}th`
}

const clampCoordinate = (v: number): number => Math.min(GRID_SIZE - 0.01, Math.max(0, v))

/** 1-based index of the avenue nearest to x. */
export function nearestAvenue(x: number): number {
  const cx = clampCoordinate(x)
  return Math.min(10, Math.max(1, Math.round(cx / AVENUE_SPACING)))
}

/** 1-based index of the street nearest to y. */
export function nearestStreet(y: number): number {
  const cy = clampCoordinate(y)
  return Math.min(40, Math.max(1, Math.round(cy / STREET_SPACING)))
}

/**
 * Deterministic fake address for a grid point, e.g. "4th Ave & E 11th St".
 * Pure function of (x, y) — must stay byte-identical to the API copy.
 */
export function deriveAddress(x: number, y: number): string {
  const avenue = nearestAvenue(x)
  const street = nearestStreet(y)
  const side = clampCoordinate(x) < GRID_SIZE / 2 ? 'W' : 'E'
  return `${ordinal(avenue)} Ave & ${side} ${ordinal(street)} St`
}

/** Euclidean distance between two grid points, in blocks. */
export function distanceInBlocks(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
