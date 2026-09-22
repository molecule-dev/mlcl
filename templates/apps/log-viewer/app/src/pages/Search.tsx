import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { type LogLine, LogLineRow } from '../components/LogLineRow.js'
import { LogVolumeSparkline } from '../components/LogVolumeSparkline.js'
import type { Severity } from '../components/SeverityPill.js'
import { unwrapList } from '../lib/unwrap.js'

const SEVERITY_FILTERS: { key: Severity | 'all'; defaultLabel: string }[] = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'fatal', defaultLabel: 'Fatal' },
  { key: 'error', defaultLabel: 'Error' },
  { key: 'warn', defaultLabel: 'Warn' },
  { key: 'info', defaultLabel: 'Info' },
  { key: 'debug', defaultLabel: 'Debug' },
  { key: 'trace', defaultLabel: 'Trace' },
]

const SAMPLE_VOLUME = [
  20, 45, 38, 80, 60, 110, 90, 70, 130, 180, 140, 220, 200, 250, 180, 240, 300, 280, 260, 320, 290,
  270, 350, 410,
]

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [logs, setLogs] = useState<LogLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Severity | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/logs')
      .then((res) => {
        if (!cancelled) setLogs(unwrapList<LogLine>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('search.loadError', {}, { defaultValue: 'Failed to load logs.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    return logs.filter((l) => {
      if (filter !== 'all' && l.severity !== filter) return false
      if (query.trim().length > 0) {
        const q = query.toLowerCase()
        return (
          l.service.toLowerCase().includes(q) ||
          l.message.toLowerCase().includes(q) ||
          (l.trace_id ? l.trace_id.toLowerCase().includes(q) : false)
        )
      }
      return true
    })
  }, [logs, filter, query])

  const selected = useMemo(
    () => visible.find((l) => l.id === selectedId) ?? null,
    [visible, selectedId],
  )

  // Domain analytics: a "search" is a settled query (800ms debounce), with
  // the active severity filter attached. Fire-and-forget — never blocks UI.
  useEffect(() => {
    const q = query.trim()
    if (!q) return
    const timer = setTimeout(() => {
      track({
        name: 'log.searched',
        properties: {
          query: q,
          severity: filter === 'all' ? 'any' : filter,
          results: visible.length,
        },
      })
    }, 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire per settled query/filter change; `visible` is read at fire time
  }, [query, filter])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 6))}>
      <header className={cm.cn('mb-4')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('search.eyebrow', {}, { defaultValue: '$ signalink search --live' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('common.search', {}, { defaultValue: 'Search' })}
        </h1>
      </header>

      {/* Query bar */}
      <div
        className={cm.cn('rounded-md mb-3 flex items-center gap-3 px-3')}
        style={{
          backgroundColor: 'var(--color-input-background)',
          border: '1px solid var(--color-border)',
          height: 44,
        }}
      >
        <span
          className={cm.cn('material-symbols-outlined text-base')}
          style={{ color: 'var(--color-text-secondary)' }}
          aria-hidden="true"
        >
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'search.placeholder',
            {},
            { defaultValue: 'service:checkout severity:>=error message:"timeout"' },
          )}
          className={cm.cn(cm.flex1, 'bg-transparent border-0 outline-none font-mono text-sm')}
          style={{ color: 'var(--color-severity-debug-light)' }}
          data-mol-id="search-query"
        />
        <span
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('search.shortcut', {}, { defaultValue: '⌘K' })}
        </span>
      </div>

      {/* Severity filter pills */}
      <div className={cm.cn('flex flex-wrap items-center gap-2 mb-4')}>
        {SEVERITY_FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-xs font-bold uppercase tracking-widest transition-colors',
              )}
              style={{
                backgroundColor: active
                  ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)'
                  : 'var(--color-surface-container)',
                color: active ? 'var(--color-primary-hover)' : 'var(--color-severity-trace-light)',
                border: `1px solid ${active ? 'color-mix(in srgb, var(--color-primary) 45%, transparent)' : 'var(--color-border)'}`,
              }}
              data-mol-id={`search-filter-${f.key}`}
            >
              {t(`search.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
            </button>
          )
        })}
      </div>

      {/* Timeline minimap */}
      <div
        className={cm.cn('rounded-md mb-4 px-4 py-3')}
        style={{
          backgroundColor: 'var(--color-background-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className={cm.cn('flex items-center justify-between mb-2')}>
          <p
            className={cm.cn(
              'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('search.timelineLabel', {}, { defaultValue: 'Volume · last 24h' })}
          </p>
          <p
            className={cm.cn(
              'font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(
              'search.matchCount',
              { count: visible.length },
              { defaultValue: '{{count}} matches' },
            )}
          </p>
        </div>
        <LogVolumeSparkline
          values={SAMPLE_VOLUME}
          width={1024}
          height={48}
          stroke={BRAND_COLOR}
          fill={BRAND_COLOR}
          strokeWidth={1.75}
          showLastDot
          ariaLabel={t('search.timelineAria', {}, { defaultValue: '24h volume timeline' })}
          className={cm.cn('w-full')}
        />
      </div>

      {/* Stream + detail */}
      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-4')}>
        <div
          className={cm.cn('lg:col-span-2 rounded-xl overflow-hidden')}
          style={{
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--color-border)',
          }}
        >
          {error ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
          ) : loading ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
              {t('common.searchingEllipsis', {}, { defaultValue: 'Searching…' })}
            </p>
          ) : visible.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
              {t('search.empty', {}, { defaultValue: 'No log lines match your query.' })}
            </p>
          ) : (
            visible.map((line) => (
              <LogLineRow
                key={line.id}
                line={line}
                selected={line.id === selectedId}
                onClick={() => setSelectedId(line.id)}
              />
            ))
          )}
        </div>

        <aside
          className={cm.cn('rounded-xl p-5')}
          style={{
            backgroundColor: 'var(--color-surface-container)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
            )}
          >
            {t('search.detailHeading', {}, { defaultValue: 'Selected log' })}
          </p>
          {selected ? (
            <div className={cm.cn('space-y-3')}>
              <p className={cm.cn('font-mono text-xs text-on-surface-variant')}>
                <span className={cm.cn('font-bold')} style={{ color: 'var(--color-accent)' }}>
                  {selected.service}
                </span>
                <span className={cm.cn('mx-1.5 opacity-50')}>·</span>
                {selected.timestamp}
              </p>
              <p
                className={cm.cn(
                  'font-mono text-sm text-on-surface whitespace-pre-wrap break-words',
                )}
              >
                {selected.message}
              </p>
              {selected.trace_id ? (
                <p className={cm.cn('font-mono text-xs text-on-surface-variant')}>
                  <span className={cm.cn('text-[10px] font-black uppercase tracking-widest mr-2')}>
                    {t('search.detail.traceId', {}, { defaultValue: 'Trace' })}
                  </span>
                  <span style={{ color: BRAND_COLOR }}>{selected.trace_id}</span>
                </p>
              ) : null}
              <pre
                className={cm.cn('font-mono text-xs px-3 py-2 rounded-md overflow-x-auto')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-severity-debug-light)',
                }}
              >{`{
  "service": "${selected.service}",
  "severity": "${selected.severity}",
  "trace_id": ${selected.trace_id ? `"${selected.trace_id}"` : 'null'},
  "message": "${selected.message.replace(/"/g, '\\"')}"
}`}</pre>
            </div>
          ) : (
            <p className={cm.cn('text-sm text-on-surface-variant')}>
              {t(
                'search.detail.empty',
                {},
                { defaultValue: 'Click any log line to inspect its full payload.' },
              )}
            </p>
          )}
        </aside>
      </div>

      <p
        className={cm.cn(
          'mt-4 font-mono text-[11px] uppercase tracking-widest text-center text-on-surface-variant',
        )}
        data-mol-id="search-status-bar"
      >
        {t(
          'search.statusBar',
          { matched: visible.length, total: logs.length },
          { defaultValue: '{{matched}} matched · {{total}} scanned · live tail on' },
        )}
      </p>
    </div>
  )
}
