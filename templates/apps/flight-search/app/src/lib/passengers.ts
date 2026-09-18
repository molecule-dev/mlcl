/**
 * The traveler count chosen during search rides the URL (`?passengers=N`) from the results list
 * into flight detail and checkout, where it is BOTH the price multiplier and the persisted
 * `passenger_count`. Earlier the checkout dropped it — pricing and the saved booking were hardcoded
 * to a single seat — so parse it in one place and reuse it everywhere the count matters.
 *
 * Parsed defensively: a missing, non-numeric, or non-positive value means one traveler, and the
 * count is floored + clamped to `MAX_PASSENGERS` so a hand-edited URL can't fabricate a huge total.
 */
export const MAX_PASSENGERS = 9

export function parsePassengerCount(raw: string | null | undefined): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(MAX_PASSENGERS, Math.floor(n))
}
