import { useCallback, useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { FrequencySparkline } from '../components/FrequencySparkline.js'
import { type Severity, SeverityPill } from '../components/SeverityPill.js'

interface DiscoverEvent {
  id: string
  issue_id: string
  timestamp: string
  level: string
  message: string
  release: string
  environment: string
  user_email: string
  user_agent: string
}

interface DiscoverResponse {
  query: string
  parsed: { level?: string; environment?: string; release?: string; text?: string }
  count: number
  events: DiscoverEvent[]
}

const LEVEL_TO_SEVERITY: Record<string, Severity> = {
  fatal: 'critical',
  error: 'error',
  warning: 'warning',
  info: 'info',
  debug: 'info',
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toISOString().slice(11, 19)
  } catch (_error) {
    // Invalid date string — fall back to the raw value
    return iso
  }
}

function buildHistogram(events: DiscoverEvent[]): number[] {
  const bins = 20
  const out = new Array<number>(bins).fill(0)
  if (events.length === 0) return out
  const now = Date.now()
  const window = 24 * 60 * 60_000
  const earliest = now - window
  for (const e of events) {
    const t = new Date(e.timestamp).getTime()
    if (Number.isNaN(t) || t < earliest) continue
    const idx = Math.max(0, Math.min(bins - 1, Math.floor(((t - earliest) / window) * bins)))
    out[idx] = (out[idx] ?? 0) + 1
  }
  return out
}

export function Discover() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [query, setQuery] = useState('level:error environment:production')
  const [data, setData] = useState<DiscoverResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runQuery = useCallback(
    async (q: string) => {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get<DiscoverResponse>(
          `/api/discover/events?q=${encodeURIComponent(q)}`,
        )
        setData(res.data ?? null)
      } catch (error) {
        logError('discover.runQuery', error)
        setError(t('discover.queryError', {}, { defaultValue: "Couldn't run query." }))
      } finally {
        setLoading(false)
      }
    },
    [http, t],
  )

  useEffect(() => {
    void runQuery(query)
    // intentionally only on mount — subsequent runs are user-driven
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const events = data?.events ?? []
  const histogram = buildHistogram(events)
  const totalEvents = events.length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t(
              'discover.eyebrow',
              { app: APP_NAME.toLowerCase() },
              { defaultValue: '$ {{app}} discover --explorer' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('nav.discover', {}, { defaultValue: 'Discover' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'discover.subheading',
              { count: totalEvents },
              { defaultValue: '{{count}} events match · last 24h' },
            )}
          </p>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          data-testid="discover-error"
          className={cm.cn('mb-4 font-mono text-xs')}
          style={{ color: 'var(--color-severity-critical)' }}
        >
          {error}
        </p>
      ) : null}

      <section
        className={cm.cn('rounded-2xl p-5 mb-6')}
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <label
          className={cm.cn('block text-[10px] font-black uppercase tracking-widest mb-2 font-mono')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('discover.queryLabel', {}, { defaultValue: 'Query' })}
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void runQuery(query)
          }}
          className={cm.cn('flex gap-3')}
        >
          <div
            className={cm.cn('flex-1 rounded-md flex items-center gap-2 px-3 py-2')}
            style={{
              backgroundColor: 'var(--color-background-tertiary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span className={cm.cn('font-mono text-xs font-bold')} style={{ color: BRAND_COLOR }}>
              ›
            </span>
            <input
              type="text"
              data-testid="discover-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cm.cn('bg-transparent outline-none flex-1 font-mono text-sm')}
              style={{ color: 'var(--color-text)' }}
            />
          </div>
          <button
            type="submit"
            data-testid="discover-run"
            disabled={loading}
            className={cm.cn(
              'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-60',
            )}
            style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
          >
            {loading ? '…' : t('discover.run', {}, { defaultValue: 'Run' })}
          </button>
        </form>
        <div className={cm.cn('mt-4 flex flex-wrap items-center gap-2')}>
          {['level', 'environment', 'release'].map((field) => (
            <button
              type="button"
              key={field}
              data-testid={`discover-suggest-${field}`}
              onClick={() => setQuery((q) => `${q} ${field}:`.trim())}
              className={cm.cn(
                'inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded',
              )}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
                color: 'var(--color-text-code)',
                border: '1px solid color-mix(in srgb, var(--color-info) 30%, transparent)',
              }}
            >
              {field}
            </button>
          ))}
        </div>
      </section>

      <section
        className={cm.cn('rounded-2xl p-5 mb-6')}
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('discover.timeseries', {}, { defaultValue: '// time series · count() · last 24h' })}
        </p>
        <FrequencySparkline
          values={histogram}
          width={620}
          height={96}
          color={BRAND_COLOR}
          spikeColor="var(--color-severity-warning)"
          mode="bar"
          className={cm.cn('w-full h-auto')}
          ariaLabel={t('discover.timeseriesAria', {}, { defaultValue: 'Event count over time' })}
        />
      </section>

      <section
        className={cm.cn('rounded-2xl overflow-hidden')}
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div
          className={cm.cn(
            'grid grid-cols-12 px-5 py-3 border-b font-mono text-[9px] font-black uppercase tracking-widest',
          )}
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-severity-muted)' }}
        >
          <span className={cm.cn('col-span-2')}>
            {t('discover.col.timestamp', {}, { defaultValue: 'Timestamp' })}
          </span>
          <span className={cm.cn('col-span-1')}>
            {t('discover.col.level', {}, { defaultValue: 'Level' })}
          </span>
          <span className={cm.cn('col-span-5')}>
            {t('discover.col.message', {}, { defaultValue: 'Message' })}
          </span>
          <span className={cm.cn('col-span-1')}>
            {t('discover.col.release', {}, { defaultValue: 'Release' })}
          </span>
          <span className={cm.cn('col-span-1')}>
            {t('discover.col.env', {}, { defaultValue: 'Env' })}
          </span>
          <span className={cm.cn('col-span-2')}>
            {t('discover.col.user', {}, { defaultValue: 'User' })}
          </span>
        </div>
        {events.length === 0 ? (
          <p
            data-testid="discover-empty"
            className={cm.cn('px-5 py-6 font-mono text-xs text-center')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {loading
              ? t('common.searchingEllipsis', {}, { defaultValue: 'Searching…' })
              : t('discover.empty', {}, { defaultValue: 'No matching events.' })}
          </p>
        ) : (
          <ul
            data-testid="discover-results"
            className={cm.cn('divide-y')}
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            {events.slice(0, 50).map((row) => (
              <li
                key={row.id}
                data-testid="discover-row"
                className={cm.cn(
                  'grid grid-cols-12 px-5 py-3 hover:bg-surface/5 transition-colors items-center',
                )}
              >
                <span
                  className={cm.cn('col-span-2 font-mono text-xs tabular-nums')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {fmtTime(row.timestamp)}
                </span>
                <span className={cm.cn('col-span-1')}>
                  <SeverityPill severity={LEVEL_TO_SEVERITY[row.level] ?? 'info'} />
                </span>
                <span
                  className={cm.cn('col-span-5 font-mono text-xs truncate')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {row.message}
                </span>
                <span
                  className={cm.cn('col-span-1 font-mono text-xs')}
                  style={{ color: 'var(--color-text-code)' }}
                >
                  {row.release || '—'}
                </span>
                <span
                  className={cm.cn('col-span-1 font-mono text-xs')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {row.environment || '—'}
                </span>
                <span
                  className={cm.cn('col-span-2 font-mono text-xs truncate')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {row.user_email || '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
