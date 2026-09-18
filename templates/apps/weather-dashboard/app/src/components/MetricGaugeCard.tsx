import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMetricByKind, getUnitPreferences } from '../lib/units.js'

export type MetricKind =
  'humidity' | 'wind' | 'pressure' | 'visibility' | 'uv' | 'aqi' | 'feels_like' | 'dew_point'

interface MetricGaugeCardProps {
  kind: MetricKind
  /** Numeric reading in the API's base units (°F, mph, hPa, mi). */
  value: number
  /**
   * Unit suffix for non-convertible kinds (humidity `%`, UV `UVI`, AQI).
   * For `wind`/`pressure`/`visibility`/`feels_like`/`dew_point` the value +
   * suffix are converted to the user's saved unit preference and this prop is
   * ignored (see `formatMetricByKind`).
   */
  unit?: string
  /** Free-text qualitative label (Low / Moderate / High). */
  qualifier?: string | null
  /** Optional secondary line under the value. */
  hint?: string | null
  /** 0..1 fill ratio for the circular gauge — auto-derived if omitted. */
  ratio?: number
  /** Optional accent token override; if omitted defaults are picked per kind. */
  tone?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'error'
}

const KIND_ICON: Record<MetricKind, string> = {
  humidity: 'humidity_percentage',
  wind: 'air',
  pressure: 'compress',
  visibility: 'visibility',
  uv: 'wb_sunny',
  aqi: 'masks',
  feels_like: 'thermostat',
  dew_point: 'water_drop',
}

const DEFAULT_TONE: Record<MetricKind, NonNullable<MetricGaugeCardProps['tone']>> = {
  humidity: 'tertiary',
  wind: 'secondary',
  pressure: 'primary',
  visibility: 'primary',
  uv: 'warning',
  aqi: 'success',
  feels_like: 'warning',
  dew_point: 'tertiary',
}

const TONE_STROKE: Record<NonNullable<MetricGaugeCardProps['tone']>, string> = {
  primary: 'stroke-primary',
  secondary: 'stroke-secondary',
  tertiary: 'stroke-tertiary',
  success: 'stroke-success',
  warning: 'stroke-warning',
  error: 'stroke-error',
}

const TONE_TEXT: Record<NonNullable<MetricGaugeCardProps['tone']>, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  tertiary: 'text-tertiary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
}

function defaultRatio(kind: MetricKind, value: number): number {
  switch (kind) {
    case 'humidity':
    case 'aqi':
      return Math.max(0, Math.min(1, value / 100))
    case 'uv':
      return Math.max(0, Math.min(1, value / 11))
    case 'wind':
      return Math.max(0, Math.min(1, value / 40))
    case 'pressure':
      return Math.max(0, Math.min(1, (value - 980) / 60))
    case 'visibility':
      return Math.max(0, Math.min(1, value / 10))
    case 'dew_point':
    case 'feels_like':
      return Math.max(0, Math.min(1, (value + 10) / 110))
    default:
      return 0.5
  }
}

/**
 * Circular-arc gauge card — surface-container-lowest tile with a 6px
 * stroke arc, large thin Inter reading at the centre, qualifier pill,
 * and a tinted material-symbol chip in the corner. Tone keyed off the
 * metric kind (UV warns, AQI greens, humidity stays cyan).
 *
 * Translated from smart-home-dashboard's EnergyMeterCard pattern (single
 * primary number + utilization meter) but rendered as a circular dial
 * to match DESIGN.md's "Metric Gauge" recipe (UV/Humidity/Pressure).
 */
export function MetricGaugeCard({
  kind,
  value,
  unit,
  qualifier,
  hint,
  ratio,
  tone,
}: MetricGaugeCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = tone ?? DEFAULT_TONE[kind]
  // Gauge fill is computed from the RAW base-unit reading (the thresholds in
  // defaultRatio assume °F/mph/hPa/mi); only the displayed number+suffix are
  // converted to the user's chosen units.
  const fillRatio = ratio ?? defaultRatio(kind, value)
  const display = formatMetricByKind(kind, value, unit, getUnitPreferences())
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference * (1 - fillRatio)

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 5),
        'min-h-[180px] bg-surface-container-lowest rounded-2xl hover:-translate-y-0.5 hover:shadow-xl hover:shadow-on-surface/5 transition-all relative overflow-hidden',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }))}>
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(`metricGaugeCard.kind.${kind}`, {}, { defaultValue: kind.replace('_', ' ') })}
          </p>
          {qualifier ? (
            <p
              className={cm.cn(
                cm.sp('mt', 1),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                TONE_TEXT[accent],
                'uppercase tracking-widest',
              )}
            >
              {qualifier}
            </p>
          ) : null}
        </div>
        <div
          className={cm.cn(cm.sp('p', 2), 'rounded-xl', 'bg-surface shadow-sm', TONE_TEXT[accent])}
          aria-hidden="true"
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}>
            {KIND_ICON[kind]}
          </span>
        </div>
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mt', 2),
          'relative',
        )}
      >
        <svg
          width="120"
          height="80"
          viewBox="0 0 96 96"
          aria-hidden="true"
          className={cm.cn('-rotate-90')}
        >
          <circle
            cx="48"
            cy="48"
            r={radius}
            strokeWidth="6"
            className="stroke-surface-container"
            fill="none"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className={cm.cn('transition-all', TONE_STROKE[accent])}
          />
        </svg>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            'absolute inset-0',
          )}
        >
          <span
            className={cm.cn('tabular-nums text-on-surface')}
            style={{ fontSize: '1.75rem', fontWeight: 300, letterSpacing: '-0.02em' }}
          >
            {display.value}
          </span>
          {display.unit ? (
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'font-mono text-on-surface-variant uppercase tracking-widest',
              )}
            >
              {display.unit}
            </span>
          ) : null}
        </div>
      </div>

      {hint ? (
        <p
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('xs'),
            cm.textCenter,
            'text-on-surface-variant',
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}
