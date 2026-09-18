/**
 * Resolve the items that ship in a subscription box.
 *
 * A box is assembled from the plan's `included_items`, minus the items the
 * subscriber chose to skip (Customize page → `preferences.excludedItems`). The
 * box-assembly path used to build box_items straight from `plan.included_items`,
 * ignoring the stored exclusions — so skipped items still shipped. This is the
 * pure item-resolution both the assembler and its test use.
 *
 * @module
 */

/**
 * The plan's included items with the subscriber's excluded items removed.
 *
 * @param planIncludedItems - the plan's `included_items` (array of item names)
 * @param subscriptionPreferences - the subscription's `preferences` (a JSON
 *   string as stored, or an already-parsed object); `excludedItems` is read from
 *   it. Malformed/missing preferences are treated as no exclusions.
 */
export function boxIncludedItems(
  planIncludedItems: unknown,
  subscriptionPreferences: unknown,
): string[] {
  const all = Array.isArray(planIncludedItems)
    ? (planIncludedItems as unknown[]).map((item) => String(item))
    : []

  let excluded: string[] = []
  try {
    const prefs = (
      typeof subscriptionPreferences === 'string'
        ? JSON.parse(subscriptionPreferences)
        : subscriptionPreferences
    ) as Record<string, unknown> | null | undefined
    if (prefs && Array.isArray(prefs.excludedItems)) {
      excluded = (prefs.excludedItems as unknown[]).map((item) => String(item))
    }
  } catch (_error) {
    // Malformed stored preferences JSON — treat as no exclusions.
  }

  return all.filter((item) => !excluded.includes(item))
}
