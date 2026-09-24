import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { SafeLink } from '../components/SafeLink.js'

interface Issue {
  id: string
  subject?: string
  preview_text?: string | null
  status?: string
  publish_at?: string | null
  scheduled_at?: string | null
  updated_at?: string | null
}

const FILTER_VALUES = ['all', 'published', 'draft', 'scheduled']

const STATUS_KEY: Record<string, string> = {
  published: 'issues.statusPublished',
  draft: 'issues.statusDraft',
  scheduled: 'issues.statusScheduled',
}

function Issues() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  // Honor deep links like /issues?status=draft (Dashboard quick actions).
  const statusParam = searchParams.get('status') ?? ''
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState(
    FILTER_VALUES.includes(statusParam) ? statusParam : 'all',
  )
  const [reloadKey, setReloadKey] = useState(0)
  const http = useHttpClient()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    // /issues/mine/all returns the authenticated creator's issues including
    // drafts and scheduled — the studio view. The public /issues endpoint
    // hardcodes status=published and would never return drafts.
    const params = new URLSearchParams()
    if (activeFilter !== 'all') params.set('status', activeFilter)
    params.set('page', '1')
    params.set('limit', '50')
    http
      .get<Issue[] | { data: Issue[] }>(`/api/issues/mine/all?${params}`)
      .then((res) => {
        if (!active) return
        const body = res.data
        setIssues(Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [])
      })
      .catch(
        (err: unknown) =>
          active &&
          setError(
            err instanceof Error
              ? err.message
              : t('issues.loadError', {}, { defaultValue: 'Failed to load issues' }),
          ),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [activeFilter, reloadKey, http, t])

  async function handleDelete(id: string) {
    try {
      await http.delete(`/api/issues/${id}`)
      void track({ name: 'issue.deleted', properties: { issue_id: id } })
      setIssues((prev) => prev.filter((i) => i.id !== id))
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('issues.deleteError', {}, { defaultValue: 'Failed to delete issue' }),
      )
    }
  }

  function statusColor(status?: string): string {
    if (status === 'published') return 'text-[var(--color-status-published)]'
    if (status === 'scheduled') return 'text-[var(--color-status-scheduled)]'
    return 'text-[var(--color-status-draft)]'
  }

  function issueDate(issue: Issue): string {
    const raw = issue.publish_at ?? issue.scheduled_at ?? issue.updated_at ?? null
    return raw
      ? new Date(raw).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : ''
  }

  return (
    // Chrome (sidebar/topbar/drawer) comes from StudioLayout; this is content
    // only — padding stays inside the page.
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.stack(8),
        'px-4 pt-6 md:px-12 md:pt-10 pb-16 max-w-[1100px]',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
        <div>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              "font-['Newsreader'] text-on-background",
            )}
          >
            {t('issues.title', {}, { defaultValue: 'Your issues' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'issues.subhead',
              {},
              { defaultValue: 'Drafts, scheduled sends, and everything already delivered.' },
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        data-mol-id="issues-filters"
        className={cm.cn('flex flex-wrap items-center gap-2 md:gap-3')}
        role="tablist"
      >
        {FILTER_VALUES.map((filter) => (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={activeFilter === filter}
            data-mol-id={`issues-filter-${filter}`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              activeFilter === filter
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
            )}
            onClick={() => {
              setActiveFilter(filter)
              setReloadKey((k) => k + 1)
            }}
          >
            {t(
              `issues.filter_${filter}`,
              {},
              { defaultValue: filter.charAt(0).toUpperCase() + filter.slice(1) },
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <section className={cm.flex1}>
        <div className={cm.stack(4)}>
          {loading ? (
            <div
              className={cm.cn(
                cm.sp('py', 12),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('common.loading', {}, { defaultValue: 'Loading...' })}
            </div>
          ) : error ? (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-xl bg-error-container text-on-error-container',
              )}
            >
              {error}
            </div>
          ) : issues.length === 0 ? (
            <div
              data-mol-id="issues-empty"
              className={cm.cn(
                cm.sp('py', 12),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('issues.none', {}, { defaultValue: 'No issues here yet — write your first one.' })}
            </div>
          ) : (
            issues.map((issue) => (
              <article
                key={issue.id}
                data-mol-id={`issue-row-${issue.id}`}
                className={cm.cn(
                  // Stack title above the actions on phones; row on md+.
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 6),
                  'md:flex-row md:items-center md:justify-between md:gap-4',
                  'rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-all',
                )}
              >
                <div className={cm.flex({ direction: 'col' })}>
                  <span
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('semibold'),
                      "font-['Newsreader'] text-on-surface",
                    )}
                  >
                    {issue.subject ?? t('issues.untitled', {}, { defaultValue: 'Untitled issue' })}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {issueDate(issue)}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                  <span
                    data-mol-id={`issue-status-${issue.id}`}
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-widest',
                      statusColor(issue.status),
                    )}
                  >
                    {t(
                      STATUS_KEY[issue.status ?? 'draft'] ?? 'issues.statusDraft',
                      {},
                      { defaultValue: issue.status ?? 'draft' },
                    )}
                  </span>
                  {issue.status === 'published' && (
                    <SafeLink
                      to={`/issues/${issue.id}/detail`}
                      className={cm.cn(
                        cm.textSize('sm'),
                        'px-2 py-1.5',
                        cm.fontWeight('medium'),
                        'text-primary hover:underline',
                      )}
                    >
                      {t('issues.stats', {}, { defaultValue: 'Stats' })}
                    </SafeLink>
                  )}
                  <button
                    type="button"
                    data-mol-id={`issue-edit-${issue.id}`}
                    className={cm.cn(
                      cm.textSize('sm'),
                      'px-2 py-1.5',
                      cm.fontWeight('medium'),
                      'text-on-surface-variant hover:text-primary',
                    )}
                    onClick={() => navigate(`/issues/${issue.id}/edit`)}
                  >
                    {t('issues.edit', {}, { defaultValue: 'Edit' })}
                  </button>
                  <ConfirmButton
                    label={t('issues.delete', {}, { defaultValue: 'Delete' })}
                    confirmLabel={t(
                      'issues.deleteConfirm',
                      {},
                      { defaultValue: 'Delete this issue? This cannot be undone.' },
                    )}
                    onConfirm={() => handleDelete(issue.id)}
                    color="error"
                    size="sm"
                    disarmSeconds={6}
                    testId={`issue-delete-${issue.id}`}
                    data-mol-id={`issue-delete-${issue.id}`}
                  />
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default Issues
export { Issues, Issues as IssuesPage }
