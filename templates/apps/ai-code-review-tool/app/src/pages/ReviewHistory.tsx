import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type PullRequest, PullRequestRow } from '../components/PullRequestRow.js'
import { unwrapList } from '../lib/unwrap.js'

interface PullRequestApiRow {
  id: string
  title: string
  repository_id: string | null
  head_ref: string | null
  state: 'open' | 'merged' | 'closed' | 'draft'
  additions: number | null
  deletions: number | null
  opened_at: string | null
  author_login: string | null
}

interface RepositoryRow {
  id: string
  full_name: string
}

const FILTERS = ['all', 'open', 'merged', 'draft', 'closed'] as const
type Filter = (typeof FILTERS)[number]

function toPR(row: PullRequestApiRow, repoName: string): PullRequest {
  return {
    id: row.id,
    title: row.title,
    repo: repoName,
    branch: row.head_ref ?? undefined,
    status: row.state,
    score: null,
    additions: row.additions ?? 0,
    deletions: row.deletions ?? 0,
    files: 0,
    createdAt: row.opened_at ?? new Date().toISOString(),
    authorName: row.author_login ?? undefined,
  }
}

export function ReviewHistory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [prs, setPrs] = useState<PullRequestApiRow[]>([])
  const [repos, setRepos] = useState<RepositoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/pull-requests').catch(() => null),
      http.get('/api/repositories').catch(() => null),
    ])
      .then(([prRes, repoRes]) => {
        if (cancelled) return
        setPrs(unwrapList<PullRequestApiRow>(prRes))
        setRepos(unwrapList<RepositoryRow>(repoRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('reviewHistory.loadError', {}, { defaultValue: 'Failed to load history.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const repoNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of repos) map.set(r.id, r.full_name)
    return map
  }, [repos])

  const all = useMemo(
    () => prs.map((p) => toPR(p, p.repository_id ? (repoNameById.get(p.repository_id) ?? '') : '')),
    [prs, repoNameById],
  )
  const visible = useMemo(
    () => (filter === 'all' ? all : all.filter((p) => p.status === filter)),
    [all, filter],
  )

  return (
    <div
      className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}
      data-mol-id={`history-filter-${filter}`}
    >
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary font-mono',
          )}
        >
          {t(
            'reviewHistory.eyebrow',
            { appName: APP_NAME, filter },
            { defaultValue: '{{appName}} · audit log · {{filter}}' },
          )}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            'tracking-tight',
          )}
        >
          {t('reviewHistory.heading', {}, { defaultValue: 'Review history' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
          aria-live="polite"
        >
          {t(
            'reviewHistory.subheading',
            { count: visible.length, filter },
            { defaultValue: 'Showing {{count}} {{filter}} reviews.' },
          )}
        </p>
      </header>

      <nav
        className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}
        aria-label={t('reviewHistory.filterLabel', {}, { defaultValue: 'Filter by status' })}
      >
        {FILTERS.map((f) => {
          const active = f === filter
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={active}
              disabled={active}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full uppercase tracking-widest font-mono transition-colors',
                active
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t(`reviewHistory.filter.${f}`, {}, { defaultValue: f })}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('reviewHistory.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('reviewHistory.empty', {}, { defaultValue: 'No reviews match this filter.' })}
        </p>
      ) : (
        <ul
          className={cm.cn(
            'divide-y divide-outline-variant/40 bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30',
          )}
        >
          {visible.map((pr) => (
            <li key={pr.id}>
              <PullRequestRow pr={pr} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
