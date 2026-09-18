import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { IssueRow, type IssueRowData } from '../components/IssueRow.js'
import { unwrapList } from '../lib/unwrap.js'

type StatusFilter = 'all' | 'unresolved' | 'resolved' | 'ignored' | 'new'

export function Issues() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [issues, setIssues] = useState<IssueRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('unresolved')
  const [query, setQuery] = useState('')
  const [searchParams] = useSearchParams()
  // Project cards on /projects deep-link here as /issues?project_id=<id>;
  // the API list endpoint supports the same filter.
  const projectId = searchParams.get('project_id')
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
      .get(projectId ? `/api/issues?project_id=${encodeURIComponent(projectId)}` : '/api/issues')
      .then((res) => {
        if (cancelled) return
        setIssues(unwrapList<IssueRowData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('issues.loadError', {}, { defaultValue: "Couldn't load issues." }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, projectId, t])

  const counts = useMemo(() => {
    return issues.reduce(
      (acc, i) => {
        acc.all += 1
        if (i.status === 'unresolved') acc.unresolved += 1
        else if (i.status === 'resolved') acc.resolved += 1
        else if (i.status === 'ignored') acc.ignored += 1
        else if (i.status === 'new') acc.new += 1
        return acc
      },
      { all: 0, unresolved: 0, resolved: 0, ignored: 0, new: 0 },
    )
  }, [issues])

  const visible = useMemo(() => {
    let list = filter === 'all' ? issues : issues.filter((i) => i.status === filter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.culprit ?? '').toLowerCase().includes(q) ||
          (i.fingerprint ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [issues, filter, query])

  const filters: { key: StatusFilter; label: string; count?: number }[] = [
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }), count: counts.all },
    {
      key: 'unresolved',
      label: t('issues.filter.unresolved', {}, { defaultValue: 'Unresolved' }),
      count: counts.unresolved,
    },
    { key: 'new', label: t('status.new', {}, { defaultValue: 'New' }), count: counts.new },
    {
      key: 'resolved',
      label: t('status.resolved', {}, { defaultValue: 'Resolved' }),
      count: counts.resolved,
    },
    {
      key: 'ignored',
      label: t('issues.filter.ignored', {}, { defaultValue: 'Ignored' }),
      count: counts.ignored,
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
              'issues.eyebrow',
              { app: APP_NAME.toLowerCase() },
              { defaultValue: '$ {{app}} issues --watch' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('issues.heading', {}, { defaultValue: 'Issues' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'issues.subheading',
              {},
              { defaultValue: 'Grouped by stack fingerprint, sorted by recent frequency.' },
            )}
          </p>
        </div>
        <div className={cm.cn('flex items-center gap-2')}>
          <div
            className={cm.cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-md font-mono text-xs',
            )}
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
                'issues.searchPlaceholder',
                {},
                { defaultValue: 'Search title, file, fingerprint…' },
              )}
              className={cm.cn('bg-transparent flex-1 outline-none placeholder:opacity-60')}
              style={{ color: 'var(--color-text)' }}
              data-mol-id="issues-search"
            />
            <span
              className={cm.cn(
                'font-mono text-[10px] font-bold uppercase tracking-widest opacity-60',
              )}
            >
              ⌘K
            </span>
          </div>
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
              data-mol-id={`issues-filter-${f.key}`}
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
          {t('issues.loading', {}, { defaultValue: 'Loading issues…' })}
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
            playlist_remove
          </span>
          <p className={cm.cn('text-sm')}>
            {t('issues.empty', {}, { defaultValue: 'No issues match this filter.' })}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {visible.map((i) => (
            <li key={i.id}>
              <IssueRow issue={i} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
