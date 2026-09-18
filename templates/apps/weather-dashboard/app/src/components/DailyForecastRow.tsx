import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatTemperature, getUnitPreferences } from '../lib/units.js'

export interface DailyForecastEntry {
  /** ISO date for the day. */
  date: string
  /** Material Symbols icon name for the day's condition. */
  icon?: string | null
  /** Free-text condition (Partly cloudy, …). */
  condition?: string | null
  /** Day high temperature. */
  temperature_high: number
  /** Day low temperature. */
  temperature_low: number
  /** Probability of precipitation 0..1 or 0..100. */
  precipitation_chance?: number | null
}

interface DailyForecastRowProps {
  day: DailyForecastEntry
  /** Min low across the visible week — used to position the bar gradient. */
  minLow: number
  /** Max high across the visible week — used to position the bar gradient. */
  maxHigh: number
  unit?: string
}

function fmtDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

function precipPercent(value: number | null | undefined): number {
  if (value == null) return 0
  if (value <= 1) return Math.round(value * 100)
  return Math.round(value)
}

/**
 * Editorial daily forecast row — fixed day-of-week label, condition icon
 * + secondary text, and a hot-to-cold gradient temperature bar with
 * monospaced low/high values flanking it. Hover lifts the surface to
 * mirror the polished pattern catalogue's editorial-row treatment.
 *
 * Translated from personal-finance's AccountRecentTransactions row +
 * crm's ActivityFeed editorial row, but rendered as the DESIGN.md
 * "Daily Forecast Row" recipe (gradient bar + flanking mono labels).
 */
export function DailyForecastRow({ day, minLow, maxHigh, unit = '°' }: DailyForecastRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  // The `°` suffix is unit-agnostic; only the shown low/high values convert.
  // The bar ratio uses raw °F — the F→C affine transform preserves
  // (temp - minLow) / (maxHigh - minLow), so positions are identical either way.
  const tempPref = getUnitPreferences().temperature
  const range = Math.max(1, maxHigh - minLow)
  const lowRatio = (day.temperature_low - minLow) / range
  const highRatio = (day.temperature_high - minLow) / range
  const left = `${Math.max(0, Math.min(1, lowRatio)) * 100}%`
  const right = `${Math.max(0, Math.min(1, 1 - highRatio)) * 100}%`
  const precip = precipPercent(day.precipitation_chance)

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'rounded-xl hover:bg-surface-container/60 transition-colors',
      )}
    >
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'w-12 text-sm uppercase tracking-widest text-on-surface',
        )}
      >
        {fmtDay(day.date)}
      </span>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'w-32 shrink-0')}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            'bg-surface-container-low text-primary',
          )}
          aria-hidden="true"
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {day.icon || 'partly_cloudy_day'}
          </span>
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
          {day.condition || '—'}
        </span>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-1')}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'font-mono tabular-nums w-10 text-right text-on-surface-variant',
          )}
        >
          {t(
            'dailyForecastRow.low',
            { degrees: formatTemperature(day.temperature_low, tempPref).value, unit },
            { defaultValue: '{{degrees}}{{unit}}' },
          )}
        </span>
        <div
          className={cm.cn(
            'flex-1 h-1.5 rounded-full bg-surface-container relative overflow-hidden',
          )}
          aria-hidden="true"
        >
          <div
            className={cm.cn(
              'absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-primary via-warning to-error',
            )}
            style={{ left, right }}
          />
        </div>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'font-mono tabular-nums w-10 text-on-surface',
          )}
        >
          {t(
            'dailyForecastRow.high',
            { degrees: formatTemperature(day.temperature_high, tempPref).value, unit },
            { defaultValue: '{{degrees}}{{unit}}' },
          )}
        </span>
      </div>

      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'tabular-nums w-12 text-right',
          precip >= 30 ? 'text-info' : 'text-on-surface-variant/60',
        )}
      >
        {t('dailyForecastRow.precip', { pct: precip }, { defaultValue: '{{pct}}%' })}
      </span>
    </div>
  )
}
