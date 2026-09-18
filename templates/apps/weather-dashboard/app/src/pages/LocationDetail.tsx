import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AlertBanner, type WeatherAlertItem } from '../components/AlertBanner.js'
import { type DailyForecastEntry, DailyForecastRow } from '../components/DailyForecastRow.js'
import { type HourlyForecastEntry, HourlyForecastStrip } from '../components/HourlyForecastStrip.js'
import { MetricGaugeCard } from '../components/MetricGaugeCard.js'
import { WeatherHeroCard } from '../components/WeatherHeroCard.js'

interface LocationRecord {
  id: string
  name: string
  region?: string | null
  address?: string | null
  latitude?: number | string
  longitude?: number | string
}

interface CurrentForecast {
  temperature?: number | string
  feels_like?: number | string
  humidity?: number | string
  wind_speed?: number | string
  wind_dir?: number | string
  pressure?: number | string
  visibility?: number | string
  uv_index?: number | string
  condition?: string
  icon?: string
  fetched_at?: string
}

interface HourlyApiEntry {
  hour_at?: string
  time?: string
  temperature?: number | string
  precipitation_pct?: number | string
  icon?: string
}

interface DailyApiEntry {
  day_at?: string
  forecast_time?: string
  temp_high?: number | string
  temp_low?: number | string
  precipitation_pct?: number | string
  condition?: string
  icon?: string
}

function unwrapBody(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload
  const wrapper = payload as { data?: unknown }
  return 'data' in wrapper ? wrapper.data : payload
}

function unwrapList<T>(payload: unknown): T[] {
  const body = unwrapBody(payload)
  if (Array.isArray(body)) return body as T[]
  if (body && typeof body === 'object' && Array.isArray((body as { items?: unknown }).items)) {
    return (body as { items: T[] }).items
  }
  return []
}

function unwrapSingle<T>(payload: unknown): T | null {
  const body = unwrapBody(payload)
  if (!body || typeof body !== 'object') return null
  if ((body as { error?: unknown }).error) return null
  return body as T
}

const num = (value: unknown, fallback = 0): number => {
  if (value == null) return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const compass = (deg: number | null | undefined): string => {
  if (deg == null) return '—'
  const dirs = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ]
  return dirs[Math.round((deg % 360) / 22.5) % 16] ?? 'N'
}

interface ActivityVerdict {
  key: string
  icon: string
  label: string
  verdict: string
  tone: 'success' | 'warning' | 'error'
}

function deriveActivities(
  current: CurrentForecast | null,
  daily0: DailyForecastEntry | undefined,
): ActivityVerdict[] {
  const temp = num(current?.temperature, 60)
  const wind = num(current?.wind_speed, 5)
  const precip = num(daily0?.precipitation_chance, 0)
  const calmWind = wind < 12
  const dryDay = precip < 30
  const mild = temp >= 50 && temp <= 80
  const hot = temp > 85
  const cold = temp < 40

  const score = (good: boolean, warn: boolean): 'success' | 'warning' | 'error' =>
    good ? 'success' : warn ? 'warning' : 'error'

  return [
    {
      key: 'running',
      icon: 'directions_run',
      label: 'Running',
      verdict: mild && dryDay ? 'Great' : !cold && !hot && precip < 60 ? 'Fair' : 'Skip',
      tone: score(mild && dryDay, !cold && !hot && precip < 60),
    },
    {
      key: 'biking',
      icon: 'directions_bike',
      label: 'Biking',
      verdict: mild && calmWind && dryDay ? 'Great' : calmWind && dryDay ? 'Fair' : 'Skip',
      tone: score(mild && calmWind && dryDay, calmWind && dryDay),
    },
    {
      key: 'beach',
      icon: 'beach_access',
      label: 'Beach day',
      verdict: temp >= 75 && dryDay && wind < 18 ? 'Great' : temp >= 65 && dryDay ? 'Fair' : 'Skip',
      tone: score(temp >= 75 && dryDay && wind < 18, temp >= 65 && dryDay),
    },
    {
      key: 'gardening',
      icon: 'yard',
      label: 'Gardening',
      verdict: mild && dryDay ? 'Great' : dryDay ? 'Fair' : 'Skip',
      tone: score(mild && dryDay, dryDay),
    },
  ]
}

export function LocationDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const http = useHttpClient()
  const [location, setLocation] = useState<LocationRecord | null>(null)
  const [current, setCurrent] = useState<CurrentForecast | null>(null)
  const [hourly, setHourly] = useState<HourlyForecastEntry[]>([])
  const [daily, setDaily] = useState<DailyForecastEntry[]>([])
  const [alerts, setAlerts] = useState<WeatherAlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    async function load() {
      try {
        const id = params.id
        if (!id) {
          setError(t('locationDetail.invalid', {}, { defaultValue: 'Invalid location.' }))
          return
        }
        const loc = await http.get<LocationRecord>(`/api/locations/${id}`).catch(() => null)
        const parsed = unwrapSingle<LocationRecord>(loc)
        if (cancelled) return
        if (!parsed) {
          setError(
            t(
              'locationDetail.notFound',
              {},
              {
                defaultValue: 'That location no longer exists.',
              },
            ),
          )
          return
        }
        setLocation(parsed)
        const [cur, hr, dy, al] = await Promise.all([
          http.get<CurrentForecast>(`/api/forecasts/current/${id}`).catch(() => null),
          http.get<HourlyApiEntry[]>(`/api/forecasts/hourly/${id}?hours=24`).catch(() => null),
          http.get<DailyApiEntry[]>(`/api/forecasts/daily/${id}?days=10`).catch(() => null),
          http.get<WeatherAlertItem[]>(`/api/alerts/location/${id}`).catch(() => null),
        ])
        if (cancelled) return
        setCurrent(unwrapSingle<CurrentForecast>(cur))
        setHourly(
          unwrapList<HourlyApiEntry>(hr).map((h) => ({
            time: h.time ?? h.hour_at ?? new Date().toISOString(),
            temperature: num(h.temperature),
            precipitation_chance: num(h.precipitation_pct) / 100,
            icon: h.icon ?? 'partly_cloudy_day',
          })),
        )
        setDaily(
          unwrapList<DailyApiEntry>(dy).map((d) => ({
            date: (d.day_at ?? d.forecast_time ?? new Date().toISOString()) as string,
            icon: d.icon ?? 'partly_cloudy_day',
            condition: d.condition ?? '',
            temperature_high: num(d.temp_high),
            temperature_low: num(d.temp_low),
            precipitation_chance: num(d.precipitation_pct),
          })),
        )
        setAlerts(unwrapList<WeatherAlertItem>(al))
      } catch (error) {
        logError('locationDetail.load', error)
        if (!cancelled) {
          setError(
            t('locationDetail.loadError', {}, { defaultValue: 'Could not load this location.' }),
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, params.id, t])

  const dailyRange = useMemo(() => {
    if (daily.length === 0) return { minLow: 0, maxHigh: 0 }
    const lows = daily.map((d) => d.temperature_low)
    const highs = daily.map((d) => d.temperature_high)
    return { minLow: Math.min(...lows), maxHigh: Math.max(...highs) }
  }, [daily])

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 24), cm.textCenter, 'text-on-surface-variant')}>
        {t('locationDetail.loading', {}, { defaultValue: 'Reading the local sky…' })}
      </p>
    )
  }
  if (error || !location) {
    return (
      <div className={cm.cn(cm.sp('py', 24), cm.textCenter, cm.stack(4))}>
        <p className="text-error">{error}</p>
        <Link
          to="/locations"
          className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
        >
          {t('locationDetail.back', {}, { defaultValue: 'All locations' })}
        </Link>
      </div>
    )
  }

  const activities = deriveActivities(current, daily[0])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <Link
          to="/locations"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
            aria-hidden="true"
          >
            arrow_back
          </span>
          {t('locationDetail.back', {}, { defaultValue: 'All locations' })}
        </Link>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'tracking-tight',
          )}
        >
          {location.name}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            'font-mono uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {location.region || location.address || ''}
          {location.latitude != null && location.longitude != null
            ? `${location.region || location.address ? ' · ' : ''}${Number(location.latitude).toFixed(3)}, ${Number(location.longitude).toFixed(3)}`
            : ''}
        </p>
      </header>

      {alerts.length > 0 ? (
        <div className={cm.stack(2)}>
          {alerts.map((a) => (
            <AlertBanner key={a.id} alert={a} />
          ))}
        </div>
      ) : null}

      {current ? (
        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
        >
          <WeatherHeroCard
            locationName={location.name}
            region={location.region ?? location.address ?? null}
            temperature={num(current.temperature)}
            feelsLike={current.feels_like != null ? num(current.feels_like) : null}
            high={daily[0]?.temperature_high ?? null}
            low={daily[0]?.temperature_low ?? null}
            condition={current.condition ?? null}
            conditionIcon={current.icon ?? 'partly_cloudy_day'}
            alertLevel={alerts.length > 0 ? 'warning' : null}
            updatedAt={current.fetched_at ?? null}
            trace={hourly.map((h) => ({ hour: h.time, temperature: h.temperature }))}
          />
          <div className={cm.cn('lg:col-span-4 grid grid-cols-2 gap-4')}>
            <MetricGaugeCard
              kind="humidity"
              value={num(current.humidity)}
              unit="%"
              qualifier={
                num(current.humidity) > 70
                  ? t('locationDetail.humid.muggy', {}, { defaultValue: 'Muggy' })
                  : t('locationDetail.humid.comfort', {}, { defaultValue: 'Comfortable' })
              }
            />
            <MetricGaugeCard
              kind="wind"
              value={num(current.wind_speed)}
              unit="mph"
              qualifier={compass(current.wind_dir != null ? Number(current.wind_dir) : null)}
            />
            <MetricGaugeCard
              kind="visibility"
              value={num(current.visibility, 10)}
              unit="mi"
              qualifier={t('locationDetail.visibility.clear', {}, { defaultValue: 'Clear' })}
            />
            <MetricGaugeCard
              kind="dew_point"
              value={num(current.feels_like)}
              unit="°F"
              qualifier={t('locationDetail.dew.label', {}, { defaultValue: 'Feels like' })}
            />
          </div>
        </section>
      ) : null}

      {hourly.length > 0 ? (
        <section className={cm.stack(4)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('locationDetail.hourlyHeading', {}, { defaultValue: 'Next 24 hours' })}
          </h2>
          <HourlyForecastStrip hours={hourly} unit="°" />
        </section>
      ) : null}

      {daily.length > 0 ? (
        <section className={cm.stack(4)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('locationDetail.dailyHeading', {}, { defaultValue: '10-day breakdown' })}
          </h2>
          <div
            className={cm.cn('bg-surface-container-lowest rounded-2xl', cm.sp('p', 6), cm.stack(1))}
          >
            {daily.map((d) => (
              <DailyForecastRow
                key={d.date}
                day={d}
                minLow={dailyRange.minLow}
                maxHigh={dailyRange.maxHigh}
              />
            ))}
          </div>
        </section>
      ) : null}

      {current ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl',
            cm.flex({ direction: 'col', gap: 'md' }),
          )}
        >
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t('locationDetail.activitiesHeading', {}, { defaultValue: 'Today’s outlook' })}
            </h2>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {activities.map((a) => (
              <div
                key={a.key}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'xs' }),
                  cm.sp('p', 4),
                  'rounded-xl',
                  'bg-surface-container/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    'bg-surface text-primary shadow-sm',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">{a.icon}</span>
                </span>
                <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), cm.sp('mt', 2))}>
                  {t(`locationDetail.activity.${a.key}.label`, {}, { defaultValue: a.label })}
                </p>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest',
                    a.tone === 'success'
                      ? 'text-success'
                      : a.tone === 'warning'
                        ? 'text-warning'
                        : 'text-error',
                  )}
                >
                  {t(
                    `locationDetail.activity.${a.key}.verdict.${a.tone}`,
                    {},
                    { defaultValue: a.verdict },
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
