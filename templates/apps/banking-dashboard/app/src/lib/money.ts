/**
 * Currency-aware money formatting.
 *
 * Every account row carries its own `currency` (accounts.ts stores it and
 * returns it via maskRow), but the per-account displays hardcoded a `$` / USD
 * formatter — so a non-USD account rendered its balance with the wrong symbol.
 * `formatMoney` reads the account's currency instead.
 *
 * Cross-account aggregates (net worth, the global transactions list) can't be
 * expressed in a single currency when accounts differ, so those keep the USD
 * default; honoring each account's own currency on its own surfaces is the
 * scoped fix here.
 */

/**
 * Format an integer cents amount in the given ISO-4217 currency (default USD),
 * e.g. `formatMoney(123456, 'EUR')` → `€1,234.56`. Falls back to a plain
 * `<code> <amount>` string for unknown/invalid currency codes.
 */
export function formatMoney(cents: number, currency: string = 'USD'): string {
  const amount = cents / 100
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch (_error) {
    // Intl throws RangeError for a malformed currency code — degrade gracefully
    // to a signed amount prefixed with the raw code rather than crash the render.
    const sign = amount < 0 ? '-' : ''
    const abs = Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `${sign}${currency} ${abs}`
  }
}
