import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type HourlyForecastEntry, HourlyForecastStrip } from '../components/HourlyForecastStrip.js'
import { formatTemperature, formatWind, getUnitPreferences } from '../lib/units.js'

interface ApiLocation {
  id: string
  name: string
  region?: string | null
  address?: string | null
}

interface CurrentForecast {
  temperature?: number | string
  feels_like?: number | string
  humidity?: number | string
  wind_speed?: number | string
  pressure?: number | string
  uv_index?: number | string
  condition?: string
  icon?: string
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
  temp_high?: number | string
  temp_low?: number | string
  precipitation_pct?: number | string
}

interface CompareLocation {
  id: string
  name: string
  region: string
  current: CurrentForecast | null
  daily0: DailyApiEntry | null
  hourly: HourlyForecastEntry[]
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

const ACTIVITY_VERDICTS = [
  { key: 'running', icon: 'directions_run', label: 'Running' },
  { key: 'biking', icon: 'directions_bike', label: 'Biking' },
  { key: 'beach', icon: 'beach_access', label: 'Beach' },
] as const

function verdict(loc: CompareLocation, key: string): { tone: string; label: string } {
  const temp = num(loc.current?.temperature, 60)
  const wind = num(loc.current?.wind_speed, 5)
  const precip = num(loc.daily0?.precipitation_pct, 0)
  if (key === 'running') {
    if (temp >= 50 && precip < 30 && wind < 15) return { tone: 'text-success', label: 'Great' }
    if (precip >= 30 || wind >= 15) return { tone: 'text-warning', label: 'Fair' }
    return { tone: 'text-error', label: 'Skip' }
  }
  if (key === 'biking') {
    if (precip < 20 && wind < 12) return { tone: 'text-success', label: 'Great' }
    if (precip < 50) return { tone: 'text-warning', label: 'Fair' }
    return { tone: 'text-error', label: 'Skip' }
  }
  if (temp >= 70 && precip < 10) return { tone: 'text-success', label: 'Great' }
  if (temp >= 60) return { tone: 'text-warning', label: 'Fair' }
  return { tone: 'text-error', label: 'Skip' }
}

export function Compare() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Display units come from Settings; the temp/wind values above (Great/Fair
  // scoring) stay in base units since those thresholds assume °F/mph.
  const unitPrefs = getUnitPreferences()
  const http = useHttpClient()
  const [locations, setLocations] = useState<CompareLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    async function load() {
      try {
        const list = await http.get<ApiLocation[]>('/api/locations?limit=4')
        const items = unwrapList<ApiLocation>(list)
        if (cancelled) return
        if (items.length === 0) {
          setLocations([])
          return
        }
        const enriched = await Promise.all(
          items.slice(0, 4).map(async (loc) => {
            const [cur, hr, dy] = await Promise.all([
              http.get<CurrentForecast>(`/api/forecasts/current/${loc.id}`).catch(() => null),
              http
                .get<HourlyApiEntry[]>(`/api/forecasts/hourly/${loc.id}?hours=12`)
                .catch(() => null),
              http.get<DailyApiEntry[]>(`/api/forecasts/daily/${loc.id}?days=1`).catch(() => null),
            ])
            return {
              id: loc.id,
              name: loc.name,
              region: loc.region ?? loc.address ?? '',
              current: unwrapSingle<CurrentForecast>(cur),
              daily0: unwrapList<DailyApiEntry>(dy)[0] ?? null,
              hourly: unwrapList<HourlyApiEntry>(hr).map((h) => ({
                time: h.time ?? h.hour_at ?? new Date().toISOString(),
                temperature: num(h.temperature),
                precipitation_chance: num(h.precipitation_pct) / 100,
                icon: h.icon ?? 'partly_cloudy_day',
              })),
            }
          }),
        )
        if (!cancelled) setLocations(enriched)
      } catch (error) {
        logError('compare.load', error)
        if (!cancelled) {
          setError(t('compare.loadError', {}, { defaultValue: 'Could not load locations.' }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, t])

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
          {t('compare.eyebrow', {}, { defaultValue: 'Side by side' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('compare.heading', {}, { defaultValue: 'Where would you rather be?' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant max-w-xl')}>
          {t(
            'compare.subheading',
            {},
            {
              defaultValue:
                'Compare current conditions, hourly outlook, and activity verdicts across saved locations.',
            },
          )}
        </p>
      </header>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('compare.loading', {}, { defaultValue: 'Comparing skies…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : locations.length < 2 ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.textCenter,
            cm.stack(3),
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('5xl'), 'text-primary')}>
            compare_arrows
          </span>
          <p className={cm.fontWeight('bold')}>
            {t(
              'compare.empty.title',
              {},
              { defaultValue: 'Add at least two locations to compare' },
            )}
          </p>
          <p>
            {t(
              'compare.empty.body',
              {},
              { defaultValue: 'Side-by-side comparison needs at least two saved cities.' },
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
              {t('compare.empty.cta', {}, { defaultValue: 'Manage locations' })}
            </Link>
          </div>
        </div>
      ) : (
        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
        >
          {locations.map((loc) => (
            <article
              key={loc.id}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl border-l-4 border-l-primary',
              )}
            >
              <header>
                <p
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {loc.region}
                </p>
                <h2 className={cm.cn(cm.sp('mt', 1), cm.fontWeight('bold'), cm.textSize('lg'))}>
                  {loc.name}
                </h2>
              </header>

              <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }))}>
                <span
                  className={cm.cn('tabular-nums text-on-surface')}
                  style={{
                    fontSize: '3.5rem',
                    fontWeight: 200,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  {formatTemperature(num(loc.current?.temperature), unitPrefs.temperature).value}°
                </span>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    'bg-primary/15 text-primary',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {loc.current?.icon ?? 'partly_cloudy_day'}
                  </span>
                  {loc.current?.condition ?? '—'}
                </span>
              </div>

              <dl className={cm.cn('grid grid-cols-2 gap-2', cm.fontWeight('semibold'))}>
                {[
                  {
                    key: 'feels',
                    label: 'Feels',
                    value: `${formatTemperature(num(loc.current?.feels_like), unitPrefs.temperature).value}°`,
                  },
                  {
                    key: 'highLow',
                    label: 'High / Low',
                    value: `${formatTemperature(num(loc.daily0?.temp_high), unitPrefs.temperature).value}° / ${formatTemperature(num(loc.daily0?.temp_low), unitPrefs.temperature).value}°`,
                  },
                  {
                    key: 'precip',
                    label: 'Precip',
                    value: `${Math.round(num(loc.daily0?.precipitation_pct))}%`,
                  },
                  {
                    key: 'wind',
                    label: 'Wind',
                    value: `${formatWind(num(loc.current?.wind_speed), unitPrefs.wind).value} ${formatWind(num(loc.current?.wind_speed), unitPrefs.wind).unit}`,
                  },
                  {
                    key: 'humidity',
                    label: 'Humidity',
                    value: `${Math.round(num(loc.current?.humidity))}%`,
                  },
                  { key: 'uv', label: 'UV', value: `${Math.round(num(loc.current?.uv_index))}` },
                ].map((row) => (
                  <div
                    key={row.key}
                    className={cm.cn(
                      cm.flex({ direction: 'col', gap: 'xs' }),
                      cm.sp('p', 3),
                      'rounded-xl',
                      'bg-surface-container/40',
                    )}
                  >
                    <dt
                      className={cm.cn(
                        'text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(`compare.metric.${row.key}.label`, {}, { defaultValue: row.label })}
                    </dt>
                    <dd
                      className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'tabular-nums')}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div>
                <p
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('compare.activityHeading', {}, { defaultValue: 'Activity verdicts' })}
                </p>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
                  {ACTIVITY_VERDICTS.map((a) => {
                    const v = verdict(loc, a.key)
                    return (
                      <span
                        key={a.key}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.roundedFull,
                          cm.fontWeight('bold'),
                          'text-[10px] uppercase tracking-widest bg-surface-container',
                          v.tone,
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                          aria-hidden="true"
                        >
                          {a.icon}
                        </span>
                        {t(`compare.activity.${a.key}.label`, {}, { defaultValue: a.label })}
                        <span className="text-on-surface-variant"> · </span>
                        {t(
                          `compare.activity.${a.key}.${v.label.toLowerCase()}`,
                          {},
                          { defaultValue: v.label },
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>

              {loc.hourly.length > 0 ? (
                <HourlyForecastStrip hours={loc.hourly} unit="°" density="compact" />
              ) : null}
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
