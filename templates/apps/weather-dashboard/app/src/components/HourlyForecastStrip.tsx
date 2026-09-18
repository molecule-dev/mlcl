import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatTemperature, getUnitPreferences } from '../lib/units.js'

export interface HourlyForecastEntry {
  /** ISO timestamp for the hour. */
  time: string
  /** Temperature for the hour. */
  temperature: number
  /** Probability of precipitation 0..1 (or 0..100 — auto-detected). */
  precipitation_chance?: number | null
  /** Material symbol icon name for the hour's condition. */
  icon?: string | null
  /** Active hour flag — drives the highlighted backdrop. */
  active?: boolean
}

interface HourlyForecastStripProps {
  hours: ReadonlyArray<HourlyForecastEntry>
  unit?: string
  /** Reduce padding/font when embedded in a sidebar. */
  density?: 'comfortable' | 'compact'
}

function fmtHour(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hour = d.getHours()
  if (hour === 0) return '12a'
  if (hour === 12) return '12p'
  return hour < 12 ? `${hour}a` : `${hour - 12}p`
}

function precipPercent(value: number | null | undefined): number {
  if (value == null) return 0
  if (value <= 1) return Math.round(value * 100)
  return Math.round(value)
}

/**
 * Horizontal hourly forecast strip — scroll-snap row of glass-tile
 * cells. Each cell stacks an hour label, a Material Symbols glyph, the
 * thin-Inter temperature, and a rain-tinted precipitation percentage
 * when probability ≥ 30%.
 *
 * Translated from smart-home-dashboard's RoomTriad pattern (caps label
 * + icon + value + footnote) but rendered as a snapping horizontal
 * scroller to match DESIGN.md's "Hourly Forecast Strip" recipe.
 */
export function HourlyForecastStrip({
  hours,
  unit = '°',
  density = 'comfortable',
}: HourlyForecastStripProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  // The bare `°` suffix is unit-agnostic by design; only the numeric value is
  // converted to the user's chosen temperature unit.
  const tempPref = getUnitPreferences().temperature
  const cellSize = density === 'compact' ? 'min-w-[68px]' : 'min-w-[88px]'
  const padding = density === 'compact' ? cm.sp('p', 3) : cm.sp('p', 4)

  if (hours.length === 0) {
    return (
      <p
        className={cm.cn(
          cm.sp('p', 6),
          cm.textCenter,
          'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
        )}
      >
        {t('hourlyForecastStrip.empty', {}, { defaultValue: 'No hourly forecast available yet.' })}
      </p>
    )
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 4), 'bg-surface-container-lowest rounded-2xl overflow-x-auto')}
      style={{ scrollSnapType: 'x mandatory' }}
    >
      <ol className={cm.cn(cm.flex({ align: 'stretch', gap: 'sm' }), 'min-w-full')}>
        {hours.map((hour, idx) => {
          const precip = precipPercent(hour.precipitation_chance)
          return (
            <li
              key={`${hour.time}-${idx}`}
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 'xs' }),
                padding,
                'rounded-xl',
                cellSize,
                'border border-outline-variant/40',
                hour.active
                  ? 'bg-primary/15 border-primary/40 shadow-md shadow-primary/10'
                  : 'bg-surface-container/40 hover:bg-surface-container',
                'transition-colors',
              )}
              style={{ scrollSnapAlign: 'start' }}
            >
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] font-mono uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {fmtHour(hour.time)}
              </span>
              <span
                className={cm.cn(hour.active ? 'text-primary' : 'text-on-surface-variant')}
                aria-hidden="true"
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {hour.icon || 'partly_cloudy_day'}
                </span>
              </span>
              <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('lg'), 'tabular-nums')}>
                {t(
                  'hourlyForecastStrip.temp',
                  { degrees: formatTemperature(hour.temperature, tempPref).value, unit },
                  { defaultValue: '{{degrees}}{{unit}}' },
                )}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'tabular-nums',
                  precip >= 30 ? 'text-info' : 'text-on-surface-variant/60',
                )}
              >
                {t('hourlyForecastStrip.precip', { pct: precip }, { defaultValue: '{{pct}}%' })}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
