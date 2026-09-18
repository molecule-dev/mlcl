/**
 * Store shipping-fee resolution.
 *
 * The store owner configures shipping in admin settings
 * (`oauthData.adminSettings.shipping`: `freeShippingThreshold` and `standardRate`,
 * both entered in whole store-currency units, e.g. dollars). Checkout and the
 * cart previously ignored it entirely — the server charged NO shipping at all,
 * and the client fell back to a hardcoded $50 threshold / $8.99 rate that matched
 * neither the admin config nor the amount actually charged (so the shopper was
 * shown a shipping line the order silently dropped). Both the cart total
 * (display) and the order total (charge) now resolve the fee from here so they
 * agree and honor the configured value.
 *
 * Monetary amounts in this store are denominated in CENTS (`products.price`, the
 * order `subtotal`/`tax`/`total`), but the admin config is entered in whole
 * dollars, so the resolved fee is returned in cents to match the subtotal it is
 * added to.
 *
 * (`expressRate` is also stored, but checkout offers no shipping-method choice
 * yet, so only the standard rate is applied — wiring an express option is a
 * separate feature, not part of this fee resolution.)
 *
 * @module
 */

const DEFAULT_FREE_SHIPPING_THRESHOLD_DOLLARS = 75
const DEFAULT_STANDARD_RATE_DOLLARS = 5.99

function parseOauthData(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch (_error) {
      // malformed oauthData JSON — fall through to the defaults
    }
  }
  return null
}

/** A finite, non-negative number, else the fallback. Preserves a valid 0. */
function nonNegativeNumberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

/**
 * The flat shipping fee (in CENTS) for an order, given the store owner's
 * configured `adminSettings.shipping` and the order `subtotal` (also in cents):
 * free at/above the configured free-shipping threshold, otherwise the configured
 * standard rate. Falls back to a $75 threshold / $5.99 rate when the owner is
 * unknown or hasn't configured shipping.
 */
export function resolveShipping(
  owner: Record<string, unknown> | null,
  subtotalCents: number,
): number {
  const oauthData = parseOauthData(owner?.oauthData)
  const admin = oauthData?.adminSettings as
    { shipping?: { freeShippingThreshold?: unknown; standardRate?: unknown } } | undefined
  const thresholdDollars = nonNegativeNumberOr(
    admin?.shipping?.freeShippingThreshold,
    DEFAULT_FREE_SHIPPING_THRESHOLD_DOLLARS,
  )
  const rateDollars = nonNegativeNumberOr(
    admin?.shipping?.standardRate,
    DEFAULT_STANDARD_RATE_DOLLARS,
  )
  const subtotal = Number.isFinite(subtotalCents) ? subtotalCents : 0
  return subtotal >= thresholdDollars * 100 ? 0 : Math.round(rateDollars * 100)
}
