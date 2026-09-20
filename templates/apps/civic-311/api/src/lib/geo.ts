/**
 * Riverton city-grid geometry — shared by the API (address derivation,
 * duplicate detection, watch-area matching) and mirrored on the app side
 * (`app/src/lib/geo.ts`) for the map picker preview.
 *
 * The city is FICTIONAL, so there is no geocoding service anywhere: a map
 * position is just a point on a 100x100 grid where one unit = one block.
 * The "address" shown to users is derived deterministically from the
 * coordinates:
 *
 *   - Avenues run north-south, one every 10 units on the x axis
 *     (1st Ave … 10th Ave). A point's avenue is the NEAREST one.
 *   - Streets run east-west, one every 2.5 units on the y axis
 *     (1st St … 40th St). A point's street is the NEAREST one.
 *   - The street carries an E/W prefix by which half of the city the pin
 *     is in: x < 50 is west ("W"), x >= 50 is east ("E").
 *
 * So the pin (34, 27) always reads "4th Ave & E 11th St" — same input,
 * same address, on every boot and in every locale.
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
 * Pure function of (x, y) — documented contract for the template.
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

/** Whether `point` lies inside the circle `area` (center + radius in blocks). */
export function isInsideArea(
  point: { x: number; y: number },
  area: { x: number; y: number; radius: number },
): boolean {
  return distanceInBlocks(point, area) <= area.radius
}
