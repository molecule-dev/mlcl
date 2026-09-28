import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatPill } from '../components/StatPill.js'

interface ApiVersion {
  id: string
  page_id: string
  title: string
  content: string
  version: number
  change_summary: string | null
  editor_id: string | null
  created_at: string | null
}

interface ApiPage {
  id: string
  title: string
  version: number
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diffMs = Date.now() - d.getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

interface DiffLine {
  kind: 'context' | 'added' | 'removed'
  text: string
}

// Tiny LCS-based line diff. Handles the small wiki page sizes we care about
// (a few hundred lines at most). Returns context + added/removed.
function diffLines(prev: string, next: string): DiffLine[] {
  const a = prev.split('\n')
  const b = next.split('\n')
  const m = a.length
  const n = b.length
  // dp[i][j] = LCS length of a[i..] vs b[j..]
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i]![j] = dp[i + 1]![j + 1]! + 1
      else dp[i]![j] = Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ kind: 'context', text: a[i] ?? '' })
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ kind: 'removed', text: a[i] ?? '' })
      i++
    } else {
      out.push({ kind: 'added', text: b[j] ?? '' })
      j++
    }
  }
  while (i < m) {
    out.push({ kind: 'removed', text: a[i++] ?? '' })
  }
  while (j < n) {
    out.push({ kind: 'added', text: b[j++] ?? '' })
  }
  return out
}

const DIFF_TONE: Record<DiffLine['kind'], string> = {
  context: 'border-l-transparent text-on-surface-variant',
  added: 'border-l-success bg-success/10 text-on-surface',
  removed: 'border-l-error bg-error/10 text-on-surface line-through opacity-80',
}

export function VersionHistory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()

  const [page, setPage] = useState<ApiPage | null>(null)
  const [versions, setVersions] = useState<ApiVersion[] | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!params.id) return
    try {
      const [pageRes, versionsRes] = await Promise.all([
        http.get<ApiPage>(`/pages/${params.id}`),
        http.get<ApiVersion[]>(`/pages/${params.id}/versions`),
      ])
      setPage(pageRes.data ?? null)
      const list = Array.isArray(versionsRes.data) ? versionsRes.data : []
      list.sort((a, b) => b.version - a.version)
      setVersions(list)
      if (list[0]) setActiveId(list[0].version)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    }
  }, [http, params.id])

  useEffect(() => {
    load()
  }, [load])

  const active = useMemo(
    () => versions?.find((v) => v.version === activeId) ?? null,
    [versions, activeId],
  )
  const prior = useMemo(() => {
    if (!versions || !active) return null
    const idx = versions.findIndex((v) => v.version === active.version)
    return idx >= 0 ? (versions[idx + 1] ?? null) : null
  }, [versions, active])

  const diff = useMemo(() => {
    if (!active) return []
    if (!prior) {
      return active.content.split('\n').map((text) => ({ kind: 'added' as const, text }))
    }
    return diffLines(prior.content, active.content)
  }, [active, prior])

  const handleRestore = async () => {
    if (!params.id || !active || restoring) return
    setRestoring(true)
    try {
      await http.post(`/pages/${params.id}/restore/${active.version}`)
      void track({
        name: 'page.version_restored',
        properties: { page_id: params.id, version: active.version },
      })
      navigate(`/page/${params.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setRestoring(false)
    }
  }

  const slug = params.id ?? ''

  return (
    <div className={cm.stack(6)} data-testid="version-history-page">
      <div className={cm.stack(2)}>
        <Link
          to={slug ? `/page/${slug}` : '/home'}
          className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}
        >
          ← {t('versionHistory.backLink', {}, { defaultValue: 'Back to page' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('versionHistory.heading', {}, { defaultValue: 'Version history' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {versions === null
            ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
            : t(
                'versionHistory.subtitle',
                { count: versions.length },
                { defaultValue: '{{count}} versions · select a row to inspect the diff' },
              )}
        </p>
      </div>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.accentCard({ tone: 'error' }),
            'rounded-md bg-error/10 text-on-surface',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {versions !== null && versions.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.stack(2),
            cm.textCenter,
            'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
          )}
          data-testid="versions-empty"
        >
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('versionHistory.empty.title', {}, { defaultValue: 'No versions yet.' })}
          </p>
        </div>
      ) : null}

      {versions && versions.length > 0 ? (
        <div
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'lg:flex-row lg:items-start')}
        >
          <ol
            className={cm.cn(
              cm.stack(0),
              'w-full lg:w-80 shrink-0 rounded-xl border border-outline-variant/40 bg-surface-container-lowest overflow-hidden',
            )}
            data-testid="versions-list"
          >
            {versions.map((v, i) => {
              const isActive = v.version === activeId
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(v.version)}
                    data-testid={`version-row-${v.version}`}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'sm' }),
                      cm.sp('p', 4),
                      'w-full text-left transition-colors',
                      isActive
                        ? 'bg-primary/10 border-l-[3px] border-primary'
                        : 'hover:bg-surface-container-high border-l-[3px] border-transparent',
                      i !== versions.length - 1 ? 'border-b border-outline-variant/30' : '',
                    )}
                  >
                    <div className={cm.cn(cm.stack(1), 'min-w-0 flex-1')}>
                      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'xs' })}>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-on-surface',
                          )}
                        >
                          {t(
                            'versionHistory.versionLabel',
                            { v: v.version },
                            { defaultValue: 'v{{v}}' },
                          )}
                        </span>
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {formatRelative(v.created_at)}
                        </span>
                      </div>
                      {v.change_summary ? (
                        <p
                          className={cm.cn(
                            cm.textSize('sm'),
                            'text-on-surface-variant line-clamp-2 leading-snug',
                          )}
                        >
                          {v.change_summary}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>

          <section
            className={cm.cn(
              cm.stack(4),
              cm.sp('p', 6),
              'flex-1 min-w-0 rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
            )}
            data-testid="version-diff"
          >
            {active ? (
              <>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    'flex-wrap',
                  )}
                >
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <h2
                      className={cm.cn(
                        cm.textSize('xl'),
                        'font-extrabold tracking-tight text-on-surface',
                      )}
                    >
                      {t(
                        'versionHistory.diffHeading',
                        { v: active.version },
                        { defaultValue: 'Diff · v{{v}}' },
                      )}
                    </h2>
                    <StatPill
                      tone={
                        active.version === (page?.version ?? versions[0]!.version)
                          ? 'published'
                          : 'archived'
                      }
                    >
                      {active.version === (page?.version ?? versions[0]!.version)
                        ? t('nav.current', {}, { defaultValue: 'Current' })
                        : t('versionHistory.older', {}, { defaultValue: 'Older' })}
                    </StatPill>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestore}
                    disabled={
                      restoring || active.version === (page?.version ?? versions[0]!.version)
                    }
                    data-testid="version-restore"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'h-9 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container-high disabled:opacity-50 transition-colors',
                    )}
                  >
                    {restoring
                      ? t('versionHistory.restoring', {}, { defaultValue: 'Restoring…' })
                      : t('versionHistory.restore', {}, { defaultValue: 'Restore this version' })}
                  </button>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'versionHistory.attribution',
                    { when: formatRelative(active.created_at) },
                    { defaultValue: 'Saved {{when}}' },
                  )}
                </p>
                <ol className={cm.stack(0)} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {diff.map((line, i) => (
                    <li
                      key={i}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'border-l-[3px]',
                        DIFF_TONE[line.kind],
                      )}
                    >
                      <span
                        className={cm.cn('select-none mr-3 text-on-surface-variant/60 text-[10px]')}
                      >
                        {line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' '}
                      </span>
                      {line.text || ' '}
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}
