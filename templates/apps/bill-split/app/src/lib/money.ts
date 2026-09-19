/**
 * Money + date display helpers.
 *
 * All amounts in this app are INTEGER CENTS end to end; these helpers exist
 * purely at the presentation edge. Keep every computation in cents and only
 * format at render time — floats must never touch a balance.
 */

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

/** Integer cents → "$12.50". Negative inputs render without a sign flip. */
export function formatCents(cents: number): string {
  return usd.format(cents / 100)
}

/** Integer cents → "$12.50" / "−$12.50", sign included, zero renders plain. */
export function formatSignedCents(cents: number): string {
  if (cents < 0) return '−' + usd.format(-cents / 100)
  return usd.format(cents / 100)
}

/** ISO timestamp → "Apr 21". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
