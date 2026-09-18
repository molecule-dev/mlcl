/**
 * Format a monetary amount in a specific ISO currency code.
 *
 * The number is grouped/decimalized with the en-US locale, but the CURRENCY (symbol + code) is the
 * account's own — so a EUR account renders €1,234.00, not $1,234.00. Several per-account surfaces
 * hardcoded `currency: 'USD'` and dropped the account's stored `currency`. Falls back to USD when the
 * code is missing or invalid. Pure, so it is unit-testable.
 */
export function formatMoney(amount: number, currency?: string | null): string {
  const code = currency && currency.trim() ? currency.trim() : 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount)
  } catch (_error) {
    // An unknown/invalid ISO currency code makes Intl throw a RangeError — fall back to USD.
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }
}
