/**
 * Store sales-tax resolution.
 *
 * The store owner configures a "Tax Rate (%)" in admin settings
 * (`oauthData.adminSettings.tax.taxRate`, a PERCENT e.g. 8.25). Checkout and the
 * cart previously ignored it entirely — the server charged a flat
 * `STORE_TAX_RATE` env / 8% and the client hardcoded its own rate. Both the cart
 * total (display) and the order total (charge) now resolve the rate from here so
 * they agree and honor the configured value.
 *
 * @module
 */

const DEFAULT_TAX_RATE = 0.08

function parseOauthData(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch (_error) {
      // malformed oauthData JSON — fall through to the default
    }
  }
  return null
}

/**
 * The store's sales-tax rate as a FRACTION (e.g. 8.25% → 0.0825). Reads the
 * store owner's `adminSettings.tax.taxRate` (a percent) and divides by 100;
 * falls back to the `STORE_TAX_RATE` env (already a fraction) or 0.08 when the
 * owner is unknown or hasn't configured a rate.
 */
export function resolveTaxRate(owner: Record<string, unknown> | null): number {
  const envRaw = parseFloat(process.env.STORE_TAX_RATE ?? '')
  const fallback = Number.isFinite(envRaw) ? envRaw : DEFAULT_TAX_RATE
  const oauthData = parseOauthData(owner?.oauthData)
  const admin = oauthData?.adminSettings as { tax?: { taxRate?: unknown } } | undefined
  const pct = admin?.tax?.taxRate
  return typeof pct === 'number' && Number.isFinite(pct) && pct >= 0 ? pct / 100 : fallback
}
