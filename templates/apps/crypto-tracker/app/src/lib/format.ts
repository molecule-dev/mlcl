/**
 * Shared numeric formatters for the Sigil terminal aesthetic. Prices,
 * deltas, and supply counts always render `tabular-nums` and use
 * compact suffixes once they cross 1K.
 */

export function fmtUsd(n: number, fractionDigits = 2): string {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`
  return `${sign}$${abs.toFixed(fractionDigits)}`
}

export function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function deltaClass(n: number): string {
  if (n > 0) return 'text-success'
  if (n < 0) return 'text-error'
  return ''
}

export function deltaIcon(n: number): string {
  if (n > 0) return 'trending_up'
  if (n < 0) return 'trending_down'
  return 'trending_flat'
}

export function priceFractionDigits(price: number): number {
  if (price >= 100) return 2
  if (price >= 1) return 4
  return 6
}
