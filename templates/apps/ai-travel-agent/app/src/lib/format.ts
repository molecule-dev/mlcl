/** Money and time formatting shared by the trip, bill and pay pages. */

export function formatMoney(cents: number, currency: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100)
  } catch (_error) {
    // An unknown ISO code still formats as a number; the code is appended.
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

export function formatDateTime(iso: string, locale?: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTime(iso: string, locale?: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${String(h)}h ${String(m).padStart(2, '0')}m` : `${String(m)}m`
}
