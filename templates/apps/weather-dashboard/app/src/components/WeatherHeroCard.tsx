/**
 * Thin shim around @molecule/app-weather-card-react. Preserves the
 * app-local prop surface ({ feelsLike: number, high/low: number,
 * updatedAt: ISO string, alertLevel }) and translates them to the
 * pre-formatted ReactNode labels the package expects.
 *
 * The shared package owns rendering: gradient hero, glass condition
 * pill, alert badge, hi/lo chip, 24h temperature sparkline.
 */
import { useTranslation } from '@molecule/app-react'
import { type WeatherAlertLevel, WeatherCard } from '@molecule/app-weather-card-react'

import { formatTemperature, getUnitPreferences } from '../lib/units.js'

interface WeatherHeroCardProps {
  locationName: string
  region?: string | null
  temperature: number
  feelsLike?: number | null
  high?: number | null
  low?: number | null
  condition?: string | null
  conditionIcon?: string
  alertLevel?: WeatherAlertLevel | null
  updatedAt?: string | null
  trace?: ReadonlyArray<{ hour: string; temperature: number }>
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.max(0, Date.now() - t)
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

export function WeatherHeroCard({
  locationName,
  region,
  temperature,
  feelsLike,
  high,
  low,
  condition,
  conditionIcon = 'partly_cloudy_day',
  alertLevel,
  updatedAt,
  trace,
}: WeatherHeroCardProps) {
  const { t } = useTranslation()
  // Readings arrive in base °F; convert every temperature (current, feels-like,
  // hi/lo, and the sparkline trace) to the user's chosen unit and derive the label.
  const tempPref = getUnitPreferences().temperature
  const current = formatTemperature(temperature, tempPref)
  const unit = current.unit
  return (
    <WeatherCard
      locationName={locationName}
      region={region}
      temperature={current.value}
      condition={condition}
      conditionIcon={conditionIcon}
      alertLevel={alertLevel}
      alertLabel={
        alertLevel
          ? t(`weatherHeroCard.alert.${alertLevel}`, {}, { defaultValue: alertLevel })
          : null
      }
      updatedLabel={
        updatedAt
          ? t(
              'weatherHeroCard.updated',
              { time: formatRelative(updatedAt) },
              { defaultValue: 'Updated {{time}}' },
            )
          : null
      }
      unit={unit}
      eyebrow={t('weatherHeroCard.eyebrow', {}, { defaultValue: 'Right now' })}
      trace={trace?.map((point) => ({
        hour: point.hour,
        temperature: formatTemperature(point.temperature, tempPref).value,
      }))}
      feelsLikeLabel={
        feelsLike != null
          ? t(
              'weatherHeroCard.feelsLike',
              { degrees: formatTemperature(feelsLike, tempPref).value, unit },
              { defaultValue: 'Feels like {{degrees}}{{unit}}' },
            )
          : null
      }
      highLowLabel={
        high != null && low != null ? (
          <>
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              arrow_upward
            </span>
            {t(
              'weatherHeroCard.high',
              { degrees: formatTemperature(high, tempPref).value, unit },
              { defaultValue: '{{degrees}}{{unit}}' },
            )}
            <span className="px-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
              ·
            </span>
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              arrow_downward
            </span>
            {t(
              'weatherHeroCard.low',
              { degrees: formatTemperature(low, tempPref).value, unit },
              { defaultValue: '{{degrees}}{{unit}}' },
            )}
          </>
        ) : null
      }
    />
  )
}
