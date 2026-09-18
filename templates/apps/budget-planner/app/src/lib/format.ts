import { useEffect, useState } from 'react'

import { useHttpClient } from '@molecule/app-react'

import { unwrapSingle } from './unwrap.js'

export interface MoneyFormatOptions {
  /** Fraction digits (default 2). */
  fractionDigits?: number
  /** Thousands grouping (default true). */
  grouping?: boolean
  /** Show a leading `+` for positive values (default false → only `-` on negatives). */
  signed?: boolean
}

/**
 * Format a cents amount in the given ISO-4217 currency. `Intl.NumberFormat`
 * handles the symbol/position/sign per the runtime locale; an invalid currency
 * code (Intl throws on bad codes) falls back to a plain grouped number.
 */
export function formatMoney(
  cents: number,
  currency: string,
  opts: MoneyFormatOptions = {},
): string {
  const { fractionDigits = 2, grouping = true, signed = false } = opts
  const value = cents / 100
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping: grouping,
      signDisplay: signed ? 'exceptZero' : 'auto',
    }).format(value)
  } catch (_error) {
    // invalid currency code (Intl throws on bad codes) — fall back to a plain number
    const sign = value < 0 ? '-' : signed && value > 0 ? '+' : ''
    return `${sign}${Math.abs(value).toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping: grouping,
    })}`
  }
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))

/**
 * Render an ISO date per a token pattern (the Settings "Date format" preference):
 * `yyyy`/`yy`, `MMMM`/`MMM`/`MM`/`M`, `dd`/`d`. Any other characters pass through
 * literally (e.g. "MMM d, yyyy" → "Mar 3, 2025", "yyyy-MM-dd" → "2025-03-03").
 * Returns '' for an invalid date.
 */
export function formatDate(iso: string, dateFormat: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad2 = (n: number): string => String(n).padStart(2, '0')
  const tokens: Record<string, string> = {
    yyyy: String(d.getFullYear()),
    yy: pad2(d.getFullYear() % 100),
    MMMM: MONTHS[d.getMonth()],
    MMM: MONTHS_SHORT[d.getMonth()],
    MM: pad2(d.getMonth() + 1),
    M: String(d.getMonth() + 1),
    dd: pad2(d.getDate()),
    d: String(d.getDate()),
  }
  return dateFormat.replace(/yyyy|yy|MMMM|MMM|MM|M|dd|d/g, (m) => tokens[m] ?? m)
}

// ---------------------------------------------------------------------------
// Display-currency preference (Settings → Preferences → Currency), stored on
// the profile at `preferences.currency`. It is cached at module scope so the
// many stateless money formatters can read it synchronously via getCurrency();
// a single usePreferences() hook mounted in the authenticated app shell fetches
// it once and re-renders the tree when it resolves. Previously every formatter
// hardcoded `$`, so changing the currency had no effect.
// ---------------------------------------------------------------------------

const DEFAULT_CURRENCY = 'USD'
const DEFAULT_DATE_FORMAT = 'MMM d, yyyy'
let cachedCurrency: string = DEFAULT_CURRENCY
let cachedDateFormat: string = DEFAULT_DATE_FORMAT

/** The user's display currency (defaults to USD until preferences load). */
export function getCurrency(): string {
  return cachedCurrency
}

/** The user's date-format preference (defaults to `MMM d, yyyy` until loaded). */
export function getDateFormat(): string {
  return cachedDateFormat
}

/** Seed the cached currency — e.g. right after the Settings page saves it. */
export function primeCurrency(currency: string | undefined): void {
  cachedCurrency = currency || DEFAULT_CURRENCY
}

/** Seed the cached date format — e.g. right after the Settings page saves it. */
export function primeDateFormat(dateFormat: string | undefined): void {
  cachedDateFormat = dateFormat || DEFAULT_DATE_FORMAT
}

interface ProfilePrefsResponse {
  preferences?: { currency?: string; dateFormat?: string }
}

/**
 * Fetch the signed-in user's display-currency preference once and keep the
 * module cache fresh. Mount this in the authenticated app shell (the layout
 * that wraps the money-displaying pages) so every formatter renders in the
 * chosen currency and re-renders when it loads.
 */
export function usePreferences(): string {
  const http = useHttpClient()
  const [currency, setCurrencyState] = useState<string>(cachedCurrency)
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const p = unwrapSingle<ProfilePrefsResponse>(res)
        const next = p?.preferences?.currency || DEFAULT_CURRENCY
        cachedCurrency = next
        cachedDateFormat = p?.preferences?.dateFormat || DEFAULT_DATE_FORMAT
        setCurrencyState(next)
      })
      .catch(() => {
        // keep the default; a failed profile load must not break rendering
      })
    return () => {
      cancelled = true
    }
  }, [http])
  return currency
}
