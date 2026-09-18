/**
 * Invoice monetary breakdown resolution.
 *
 * The company's stored "Default tax rate" (Settings → `company_profile.
 * default_tax_rate_pct`) must actually seed a new invoice's tax when the
 * request doesn't specify a rate — the create path previously hardcoded
 * `tax_rate_pct ?? 0`, so the saved default influenced nothing.
 *
 * @module
 */

/** The client-supplied (all optional) monetary fields of an invoice create. */
export interface InvoiceTotalsInput {
  subtotal_cents?: number
  tax_rate_pct?: number
  tax_cents?: number
  total_cents?: number
  amount_cents?: number
}

/** The fully-resolved monetary breakdown persisted on the invoice row. */
export interface InvoiceTotals {
  subtotal_cents: number
  tax_rate_pct: number
  tax_cents: number
  total_cents: number
  amount_cents: number
}

/**
 * Resolve an invoice's monetary breakdown. Client-provided values always win
 * (so a fully-computed submission is untouched); anything omitted is derived
 * from the subtotal and the effective tax rate, which defaults to the
 * company's stored `default_tax_rate_pct` when the request doesn't specify
 * one. A non-positive/invalid company default means "no default" → 0.
 */
export function resolveInvoiceTotals(
  body: InvoiceTotalsInput,
  companyDefaultRatePct: number,
): InvoiceTotals {
  const subtotal_cents = body.subtotal_cents ?? 0
  const defaultRate =
    Number.isFinite(companyDefaultRatePct) && companyDefaultRatePct > 0 ? companyDefaultRatePct : 0
  const tax_rate_pct = body.tax_rate_pct ?? defaultRate
  const tax_cents = body.tax_cents ?? Math.round((subtotal_cents * tax_rate_pct) / 100)
  const total_cents = body.total_cents ?? subtotal_cents + tax_cents
  const amount_cents = body.amount_cents ?? total_cents
  return { subtotal_cents, tax_rate_pct, tax_cents, total_cents, amount_cents }
}
