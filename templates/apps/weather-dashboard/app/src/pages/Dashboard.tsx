import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AlertBanner, type WeatherAlertItem } from '../components/AlertBanner.js'
import { type DailyForecastEntry, DailyForecastRow } from '../components/DailyForecastRow.js'
import { type HourlyForecastEntry, HourlyForecastStrip } from '../components/HourlyForecastStrip.js'
import { LocationCard, type LocationSummary } from '../components/LocationCard.js'
import { MetricGaugeCard } from '../components/MetricGaugeCard.js'
import { WeatherHeroCard } from '../components/WeatherHeroCard.js'

interface CurrentForecast {
  id?: string
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

interface DailyApiEntry extends Omit<DailyForecastEntry, 'temperature_high' | 'temperature_low'> {
  day_at?: string
  forecast_time?: string
  temp_high?: number | string
  temp_low?: number | string
  precipitation_pct?: number | string
}

interface HourlyApiEntry {
  hour_at?: string
  time?: string
  temperature?: number | string
  precipitation_pct?: number | string
  icon?: string
}

interface ApiLocation {
  id: string
  name: string
  region?: string | null
  address?: string | null
  is_default?: boolean
  latitude?: number
  longitude?: number
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

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [defaultLocation, setDefaultLocation] = useState<ApiLocation | null>(null)
  const [current, setCurrent] = useState<CurrentForecast | null>(null)
  const [hourly, setHourly] = useState<HourlyForecastEntry[]>([])
  const [daily, setDaily] = useState<DailyForecastEntry[]>([])
  const [alerts, setAlerts] = useState<WeatherAlertItem[]>([])
  const [nearby, setNearby] = useState<LocationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    async function load() {
      try {
        const def = await http.get('/api/locations/default').catch(() => null)
        const defaultLoc = unwrapSingle<ApiLocation>(def)
        if (cancelled) return
        if (!defaultLoc) {
          setDefaultLocation(null)
          setCurrent(null)
          setHourly([])
          setDaily([])
          setAlerts([])
          setNearby([])
          return
        }
        setDefaultLocation(defaultLoc)
        const [cur, hr, dy, al, locs] = await Promise.all([
          http.get<CurrentForecast>(`/api/forecasts/current/${defaultLoc.id}`).catch(() => null),
          http
            .get<HourlyApiEntry[]>(`/api/forecasts/hourly/${defaultLoc.id}?hours=12`)
            .catch(() => null),
          http
            .get<DailyApiEntry[]>(`/api/forecasts/daily/${defaultLoc.id}?days=7`)
            .catch(() => null),
          http.get<WeatherAlertItem[]>(`/api/alerts/location/${defaultLoc.id}`).catch(() => null),
          http.get<ApiLocation[]>('/api/locations?limit=4').catch(() => null),
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
        const dailyRaw = unwrapList<DailyApiEntry>(dy)
        setDaily(
          dailyRaw.map((d) => ({
            date: (d.day_at ?? d.forecast_time ?? new Date().toISOString()) as string,
            icon: d.icon ?? 'partly_cloudy_day',
            condition: d.condition ?? '',
            temperature_high: num(d.temp_high),
            temperature_low: num(d.temp_low),
            precipitation_chance: num(d.precipitation_pct),
          })),
        )
        setAlerts(unwrapList<WeatherAlertItem>(al))
        const locList = unwrapList<ApiLocation>(locs)
        setNearby(
          locList.map((l) => ({
            id: l.id,
            name: l.name,
            region: l.region ?? l.address ?? null,
            is_default: l.is_default,
          })),
        )
      } catch (error) {
        logError('dashboard.load', error)
        if (!cancelled)
          setError(t('dashboard.loadError', {}, { defaultValue: 'Could not load the dashboard.' }))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, t])

  const dailyRange = useMemo(() => {
    if (daily.length === 0) return { minLow: 0, maxHigh: 0 }
    const lows = daily.map((d) => d.temperature_low)
    const highs = daily.map((d) => d.temperature_high)
    return { minLow: Math.min(...lows), maxHigh: Math.max(...highs) }
  }, [daily])

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 24), cm.textCenter, 'text-on-surface-variant')}>
        {t('dashboard.loading', {}, { defaultValue: 'Reading the sky…' })}
      </p>
    )
  }
  if (error) {
    return <p className={cm.cn(cm.sp('py', 24), cm.textCenter, 'text-error')}>{error}</p>
  }

  if (!defaultLocation) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          cm.maxW('3xl'),
          cm.mxAuto,
          cm.stack(6),
          cm.textCenter,
        )}
      >
        <span className={cm.cn('material-symbols-outlined', cm.textSize('5xl'), 'text-primary')}>
          place
        </span>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('dashboard.empty.title', {}, { defaultValue: 'Add your first location' })}
        </h1>
        <p className="text-on-surface-variant">
          {t(
            'dashboard.empty.body',
            {},
            {
              defaultValue:
                'Save a location to see real-time weather, hourly forecasts, alerts, and a 7-day outlook on this dashboard.',
            },
          )}
        </p>
        <div>
          <Link
            to="/locations"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              'rounded-full bg-primary text-on-primary font-bold inline-flex items-center gap-2 hover:opacity-90',
            )}
          >
            <span className="material-symbols-outlined">add_location</span>
            {t('dashboard.empty.cta', {}, { defaultValue: 'Add a location' })}
          </Link>
        </div>
      </div>
    )
  }

  const heroAlert = alerts[0] ?? null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('status.today', {}, { defaultValue: 'Today' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('dashboard.heading', {}, { defaultValue: 'Your sky, right now' })}
        </h1>
      </header>

      {heroAlert ? <AlertBanner alert={heroAlert} /> : null}

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
      >
        <WeatherHeroCard
          locationName={defaultLocation.name}
          region={defaultLocation.region ?? defaultLocation.address ?? null}
          temperature={num(current?.temperature)}
          feelsLike={current?.feels_like != null ? num(current.feels_like) : null}
          high={daily[0]?.temperature_high ?? null}
          low={daily[0]?.temperature_low ?? null}
          condition={current?.condition ?? null}
          conditionIcon={current?.icon ?? 'partly_cloudy_day'}
          alertLevel={heroAlert ? 'watch' : null}
          updatedAt={current?.fetched_at ?? null}
          trace={hourly.map((h) => ({ hour: h.time, temperature: h.temperature }))}
        />
        <div className={cm.cn('lg:col-span-4 grid grid-cols-2 gap-4')}>
          <MetricGaugeCard
            kind="humidity"
            value={num(current?.humidity)}
            unit="%"
            qualifier={
              num(current?.humidity) > 70
                ? t('dashboard.humid.muggy', {}, { defaultValue: 'Muggy' })
                : t('dashboard.humid.comfort', {}, { defaultValue: 'Comfortable' })
            }
          />
          <MetricGaugeCard
            kind="wind"
            value={num(current?.wind_speed)}
            unit="mph"
            qualifier={compass(current?.wind_dir != null ? Number(current.wind_dir) : null)}
            hint={t('dashboard.windHint', {}, { defaultValue: 'Light breeze' })}
          />
          <MetricGaugeCard
            kind="uv"
            value={num(current?.uv_index)}
            unit="UVI"
            qualifier={
              num(current?.uv_index) >= 6
                ? t('dashboard.uv.high', {}, { defaultValue: 'High' })
                : t('dashboard.uv.moderate', {}, { defaultValue: 'Moderate' })
            }
          />
          <MetricGaugeCard
            kind="pressure"
            value={num(current?.pressure)}
            unit="hPa"
            qualifier={t('dashboard.pressureHint', {}, { defaultValue: 'Steady' })}
          />
        </div>
      </section>

      {hourly.length > 0 ? (
        <section className={cm.stack(4)}>
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t('dashboard.hourlyHeading', {}, { defaultValue: 'Next 12 hours' })}
            </h2>
            <Link
              to="/trends"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
            >
              {t('dashboard.viewTrends', {}, { defaultValue: 'See trends →' })}
            </Link>
          </div>
          <HourlyForecastStrip hours={hourly} unit="°" />
        </section>
      ) : null}

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12')}>
        {daily.length > 0 ? (
          <div
            className={cm.cn(
              'lg:col-span-7 bg-surface-container-lowest rounded-2xl',
              cm.sp('p', 6),
            )}
          >
            <div
              className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), cm.sp('mb', 4))}
            >
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
                {t('dashboard.dailyHeading', {}, { defaultValue: '7-day outlook' })}
              </h2>
              <Link
                to={`/location/${defaultLocation.id}`}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-primary hover:underline',
                )}
              >
                {t('dashboard.viewDetail', {}, { defaultValue: 'Full detail →' })}
              </Link>
            </div>
            <div className={cm.stack(1)}>
              {daily.map((d) => (
                <DailyForecastRow
                  key={d.date}
                  day={d}
                  minLow={dailyRange.minLow}
                  maxHigh={dailyRange.maxHigh}
                />
              ))}
            </div>
          </div>
        ) : null}

        {nearby.length > 0 ? (
          <div className={cm.cn('lg:col-span-5', cm.stack(4))}>
            <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
                {t('dashboard.savedHeading', {}, { defaultValue: 'Saved locations' })}
              </h2>
              <Link
                to="/locations"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-primary hover:underline',
                )}
              >
                {t('dashboard.viewAllLocations', {}, { defaultValue: 'Manage →' })}
              </Link>
            </div>
            <div className={cm.stack(2)}>
              {nearby.slice(0, 4).map((loc) => (
                <LocationCard key={loc.id} location={loc} to={`/location/${loc.id}`} />
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
