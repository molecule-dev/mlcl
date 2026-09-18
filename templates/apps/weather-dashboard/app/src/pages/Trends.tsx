import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  formatTemperature,
  formatWind,
  getUnitPreferences,
  type UnitPreferences,
} from '../lib/units.js'

const RANGES = [
  { key: '7d', defaultLabel: '7 days', days: 7 },
  { key: '30d', defaultLabel: '30 days', days: 30 },
  { key: '12m', defaultLabel: '12 months', days: 365 },
  { key: '5y', defaultLabel: '5 years', days: 365 * 5 },
] as const

const METRICS = [
  { key: 'temperature', defaultLabel: 'Temperature', icon: 'thermostat', unit: '°F' },
  { key: 'precipitation', defaultLabel: 'Precipitation', icon: 'rainy', unit: 'in' },
  { key: 'wind', defaultLabel: 'Wind', icon: 'air', unit: 'mph' },
  { key: 'humidity', defaultLabel: 'Humidity', icon: 'humidity_percentage', unit: '%' },
] as const

interface ApiLocation {
  id: string
  name: string
}

interface HistoryRow {
  observed_date?: string
  temp_avg?: number | string
  temp_high?: number | string
  temp_low?: number | string
  precipitation_mm?: number | string
  wind_speed_avg?: number | string
  humidity?: number | string
}

const num = (value: unknown): number | null => {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
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

// Base readings are imperial (temp °F, wind mph); convert to the user's chosen
// units so the chart, summary, and per-metric cards all read consistently.
// precipitation/humidity carry no unit preference and pass through unchanged.
function extractMetric(row: HistoryRow, metric: string, prefs: UnitPreferences): number | null {
  let base: number | null
  if (metric === 'temperature') base = num(row.temp_avg) ?? num(row.temp_high) ?? num(row.temp_low)
  else if (metric === 'precipitation') base = num(row.precipitation_mm)
  else if (metric === 'wind') base = num(row.wind_speed_avg)
  else if (metric === 'humidity') base = num(row.humidity)
  else base = null
  if (base == null) return null
  if (metric === 'temperature') return formatTemperature(base, prefs.temperature).value
  if (metric === 'wind') return formatWind(base, prefs.wind).value
  return base
}

/** The display unit suffix for a trend metric, honoring the temperature/wind prefs. */
function metricUnitLabel(metric: string, fallback: string, prefs: UnitPreferences): string {
  if (metric === 'temperature') return formatTemperature(0, prefs.temperature).unit
  if (metric === 'wind') return formatWind(0, prefs.wind).unit
  return fallback
}

export function Trends() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [activeMetric, setActiveMetric] = useState<string>('temperature')
  const [activeRange, setActiveRange] = useState<string>('30d')
  const [defaultLocation, setDefaultLocation] = useState<ApiLocation | null>(null)
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Read once on mount (localStorage is synchronous); navigating back from
  // Settings re-mounts this page, so a changed preference is picked up then.
  const unitPrefs = useMemo(() => getUnitPreferences(), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    async function load() {
      try {
        const def = await http.get<ApiLocation>('/api/locations/default').catch(() => null)
        const location = unwrapSingle<ApiLocation>(def)
        if (cancelled) return
        if (!location) {
          setDefaultLocation(null)
          setRows([])
          return
        }
        setDefaultLocation(location)
        const range = RANGES.find((r) => r.key === activeRange) ?? RANGES[1]
        const to = new Date().toISOString().slice(0, 10)
        const from = new Date(Date.now() - range.days * 86400 * 1000).toISOString().slice(0, 10)
        const history = await http
          .get<HistoryRow[]>(`/api/history/${location.id}?from=${from}&to=${to}`)
          .catch(() => null)
        if (!cancelled) setRows(unwrapList<HistoryRow>(history))
      } catch (error) {
        logError('trends.load', error)
        if (!cancelled)
          setError(t('trends.loadError', {}, { defaultValue: 'Could not load trend data.' }))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, t, activeRange])

  const series = useMemo(() => {
    return rows
      .map((row) => ({
        date: row.observed_date ?? '',
        value: extractMetric(row, activeMetric, unitPrefs),
      }))
      .filter((entry): entry is { date: string; value: number } => entry.value != null)
  }, [rows, activeMetric, unitPrefs])

  const summary = useMemo(() => {
    if (series.length === 0) {
      return { min: null as number | null, max: null as number | null, avg: null as number | null }
    }
    const values = series.map((s) => s.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    return { min, max, avg }
  }, [series])

  const chart = useMemo(() => {
    const W = 800
    const H = 200
    if (series.length < 2 || summary.min == null || summary.max == null) {
      return { stroke: '', fill: '', W, H }
    }
    const range = summary.max - summary.min || 1
    const stroke = series
      .map((entry, i) => {
        const x = (i / (series.length - 1)) * W
        const y = H - ((entry.value - summary.min!) / range) * (H * 0.85) - H * 0.1
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
    const fill = `${stroke} L${W},${H} L0,${H} Z`
    return { stroke, fill, W, H }
  }, [series, summary])

  const activeMeta = METRICS.find((m) => m.key === activeMetric) ?? METRICS[0]

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
          {t('trends.eyebrow', {}, { defaultValue: 'Climatology' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('trends.heading', {}, { defaultValue: 'Historical observations' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant max-w-xl')}>
          {t(
            'trends.subheading',
            {},
            {
              defaultValue:
                'Daily history readings recorded for your default location. Pick a metric to chart how it has moved over the selected window.',
            },
          )}
        </p>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-2 lg:grid-cols-4')}>
        {METRICS.map((m) => {
          const active = m.key === activeMetric
          const metricSeries = rows
            .map((r) => extractMetric(r, m.key, unitPrefs))
            .filter((v): v is number => v != null)
          const metricUnit = metricUnitLabel(m.key, m.unit, unitPrefs)
          const latest = metricSeries.length > 0 ? metricSeries[metricSeries.length - 1] : null
          const avg =
            metricSeries.length > 0
              ? metricSeries.reduce((a, b) => a + b, 0) / metricSeries.length
              : null
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setActiveMetric(m.key)}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.sp('p', 5),
                'rounded-xl',
                'transition-all text-left border-l-4 hover:-translate-y-0.5',
                active
                  ? 'bg-primary/10 border-l-primary shadow-md'
                  : 'bg-surface-container-lowest border-l-transparent hover:bg-surface-container-low',
              )}
              aria-pressed={active}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-primary', cm.textSize('base'))}
                  aria-hidden="true"
                >
                  {m.icon}
                </span>
                {t(`trends.metric.${m.key}.label`, {}, { defaultValue: m.defaultLabel })}
              </span>
              <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('3xl'), 'tabular-nums')}>
                {latest != null ? latest.toFixed(latest >= 10 ? 0 : 1) : '—'}
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('ml', 1),
                    'font-mono uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {metricUnit}
                </span>
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'tabular-nums text-on-surface-variant',
                )}
              >
                {avg != null
                  ? t(
                      'trends.metricAvg',
                      { value: avg.toFixed(1), unit: metricUnit },
                      { defaultValue: 'Avg {{value}}{{unit}}' },
                    )
                  : t('trends.metricNoData', {}, { defaultValue: 'No data yet' })}
              </span>
            </button>
          )
        })}
      </section>

      <section
        className={cm.cn('bg-surface-container-lowest rounded-2xl', cm.sp('p', 6), cm.stack(4))}
      >
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
          <div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('trends.chart.eyebrow', {}, { defaultValue: 'Daily values' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 1),
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'tracking-tight',
              )}
            >
              {t(
                `trends.metric.${activeMetric}.label`,
                {},
                { defaultValue: activeMeta.defaultLabel },
              )}
            </h2>
            {defaultLocation ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {defaultLocation.name}
              </p>
            ) : null}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
            {RANGES.map((r) => {
              const active = r.key === activeRange
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setActiveRange(r.key)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-xs uppercase tracking-widest transition-colors',
                    active
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                  )}
                  aria-pressed={active}
                >
                  {t(`trends.range.${r.key}`, {}, { defaultValue: r.defaultLabel })}
                </button>
              )
            })}
          </div>
        </div>

        <div
          className={cm.cn(
            'h-64 rounded-xl bg-gradient-to-br from-primary/5 via-tertiary-container/20 to-surface-container relative',
          )}
        >
          {loading ? (
            <p
              className={cm.cn(
                cm.position('absolute'),
                cm.inset0,
                cm.flex({ align: 'center', justify: 'center' }),
                'text-on-surface-variant',
              )}
            >
              {t('trends.loading', {}, { defaultValue: 'Loading history…' })}
            </p>
          ) : error ? (
            <p
              className={cm.cn(
                cm.position('absolute'),
                cm.inset0,
                cm.flex({ align: 'center', justify: 'center' }),
                'text-error',
              )}
            >
              {error}
            </p>
          ) : !defaultLocation ? (
            <div
              className={cm.cn(
                cm.position('absolute'),
                cm.inset0,
                cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
                'text-on-surface-variant',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('5xl'), 'text-primary')}
              >
                add_location
              </span>
              <p className={cm.fontWeight('bold')}>
                {t(
                  'trends.empty.noLocation',
                  {},
                  { defaultValue: 'Save a default location to see history.' },
                )}
              </p>
              <Link
                to="/locations"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full bg-primary text-on-primary font-bold',
                )}
              >
                {t('trends.empty.cta', {}, { defaultValue: 'Manage locations' })}
              </Link>
            </div>
          ) : series.length < 2 ? (
            <p
              className={cm.cn(
                cm.position('absolute'),
                cm.inset0,
                cm.flex({ align: 'center', justify: 'center' }),
                'text-on-surface-variant text-center px-6',
              )}
            >
              {t(
                'trends.empty.noHistory',
                {},
                {
                  defaultValue:
                    'No daily observations recorded yet. History accumulates as your default location is observed each day.',
                },
              )}
            </p>
          ) : (
            <svg
              className={cm.cn(cm.w('full'), cm.h('full'))}
              viewBox={`0 0 ${chart.W} ${chart.H}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={chart.fill} fill="url(#trendArea)" />
              <path
                d={chart.stroke}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {series.length > 0 ? (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('trends.summary.high.label', {}, { defaultValue: 'High' })}
              </p>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'tabular-nums')}>
                {summary.max?.toFixed(1) ?? '—'}
              </p>
            </div>
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('trends.summary.low.label', {}, { defaultValue: 'Low' })}
              </p>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'tabular-nums')}>
                {summary.min?.toFixed(1) ?? '—'}
              </p>
            </div>
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('trends.summary.avg.label', {}, { defaultValue: 'Avg' })}
              </p>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'tabular-nums')}>
                {summary.avg?.toFixed(1) ?? '—'}
              </p>
            </div>
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('trends.summary.points.label', {}, { defaultValue: 'Days' })}
              </p>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'tabular-nums')}>
                {series.length}
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
