/**
 * Small display formatters shared by the workspace pages.
 *
 * @module
 */

export function formatCents(cents: number | null | undefined): string {
  const value = Number(cents ?? 0)
  return (
    '$' +
    (value / 100).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  )
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDuration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(Number(seconds ?? 0)))
  const m = Math.floor(s / 60)
  return m > 0 ? m + 'm ' + (s % 60) + 's' : s + 's'
}

export function languageLabel(code: string | null | undefined): string {
  if (!code) return '—'
  try {
    return new Intl.DisplayNames(undefined, { type: 'language' }).of(code) ?? code
  } catch (_error) {
    return code
  }
}
