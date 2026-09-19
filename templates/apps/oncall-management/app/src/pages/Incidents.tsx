import { useEffect, useMemo, useRef, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { IncidentRow, type IncidentRowData } from '../components/IncidentRow.js'
import { unwrapList } from '../lib/unwrap.js'

type StatusFilter = 'open' | 'all' | 'triggered' | 'acknowledged' | 'resolved'

export function Incidents() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [incidents, setIncidents] = useState<IncidentRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('open')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/incidents?limit=200')
      .then((res) => {
        if (cancelled) return
        setIncidents(unwrapList<IncidentRowData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('incidents.loadError', {}, { defaultValue: "Couldn't load incidents." }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const counts = useMemo(() => {
    return incidents.reduce(
      (acc, i) => {
        acc.all += 1
        if (i.status !== 'resolved') acc.open += 1
        if (i.status === 'triggered') acc.triggered += 1
        if (i.status === 'acknowledged') acc.acknowledged += 1
        if (i.status === 'resolved') acc.resolved += 1
        return acc
      },
      { all: 0, open: 0, triggered: 0, acknowledged: 0, resolved: 0 },
    )
  }, [incidents])

  const visible = useMemo(() => {
    let list =
      filter === 'all'
        ? incidents
        : filter === 'open'
          ? incidents.filter((i) => i.status !== 'resolved')
          : incidents.filter((i) => i.status === filter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.service.toLowerCase().includes(q) ||
          (i.assignee ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [incidents, filter, query])

  const filters: { key: StatusFilter; label: string; count?: number }[] = [
    {
      key: 'open',
      label: t('incidents.filter.open', {}, { defaultValue: 'Open' }),
      count: counts.open,
    },
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }), count: counts.all },
    {
      key: 'triggered',
      label: t('statusPill.triggered', {}, { defaultValue: 'Triggered' }),
      count: counts.triggered,
    },
    {
      key: 'acknowledged',
      label: t('statusPill.acknowledged', {}, { defaultValue: 'Acknowledged' }),
      count: counts.acknowledged,
    },
    {
      key: 'resolved',
      label: t('statusPill.resolved', {}, { defaultValue: 'Resolved' }),
      count: counts.resolved,
    },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t(
              'incidents.eyebrow',
              { app: APP_NAME.toLowerCase() },
              { defaultValue: '$ {{app}} incidents --follow' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('nav.incidents', {}, { defaultValue: 'Incidents' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'incidents.subheading',
              {},
              { defaultValue: 'Every page, ack, and resolve — newest first.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn('inline-flex items-center gap-2 px-3 py-2 rounded-md font-mono text-xs')}
          style={{
            backgroundColor: 'var(--color-background-tertiary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            minWidth: 320,
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            search
          </span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'incidents.searchPlaceholder',
              {},
              { defaultValue: 'Search title, service, responder…' },
            )}
            className={cm.cn('bg-transparent flex-1 outline-none placeholder:opacity-60')}
            style={{ color: 'var(--color-text)' }}
            data-mol-id="incidents-search"
          />
          <span
            className={cm.cn(
              'font-mono text-[10px] font-bold uppercase tracking-widest opacity-60',
            )}
          >
            ⌘K
          </span>
        </div>
      </header>

      <div className={cm.cn('flex flex-wrap items-center gap-2 mb-4')}>
        {filters.map((f) => {
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
                  ? 'var(--color-severity-resolved-light)'
                  : 'var(--color-surface)',
                color: active ? 'var(--color-severity-resolved)' : 'var(--color-text-secondary)',
                border: `1px solid ${active ? 'var(--color-severity-resolved)' : 'var(--color-border)'}`,
              }}
              data-mol-id={`incidents-filter-${f.key}`}
            >
              {f.label}
              {typeof f.count === 'number' ? (
                <span className={cm.cn('opacity-70')}>{f.count}</span>
              ) : null}
            </button>
          )
        })}
      </div>

      {error ? (
        <p
          className={cm.cn(cm.sp('py', 4), cm.sp('px', 4), 'rounded-md text-xs mb-4')}
          style={{
            color: 'var(--color-severity-warning)',
            backgroundColor: 'var(--color-severity-warning-light)',
            border: '1px solid var(--color-severity-warning)',
          }}
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('incidents.loading', {}, { defaultValue: 'Loading incidents…' })}
        </p>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            notifications_off
          </span>
          <p className={cm.cn('text-sm')}>
            {t('incidents.empty', {}, { defaultValue: 'No incidents match this filter.' })}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {visible.map((i) => (
            <li key={i.id}>
              <IncidentRow incident={i} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
