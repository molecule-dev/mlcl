import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import SideNavBar from '../components/SideNavBar.js'
import { PageHeader, StatusBadge } from '../components/StatusBadge.js'
import { categoryIcon, timeAgo, useCategoryLabel } from '../lib/issues.js'

interface MyIssue {
  id: string
  category: string
  description: string
  status: string
  derived_address: string
  confirmation_count: number
  created_at: string
  updated_at: string
}

/** MyReports — the caller's submitted issues with status + activity at a glance. */
export function MyReportsPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const categoryLabel = useCategoryLabel()

  const [issues, setIssues] = useState<MyIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    document.title = t(
      'myReports.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'My reports — {{appName}}' },
    )
  }, [t])

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await http.get('/api/issues?mine=1')
      const raw: MyIssue[] = Array.isArray(res)
        ? (res as MyIssue[])
        : Array.isArray((res as { data?: unknown })?.data)
          ? (res as { data: MyIssue[] }).data
          : []
      setIssues(raw)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setLoadError(
        t('myReports.loadError', {}, { defaultValue: 'Could not load your reports. Try again.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void fetchIssues()
  }, [fetchIssues])

  const filtered = useMemo(
    () => (statusFilter ? issues.filter((i) => i.status === statusFilter) : issues),
    [issues, statusFilter],
  )

  const counts = useMemo(() => {
    const open = issues.filter((i) => !['resolved', 'dismissed'].includes(i.status)).length
    const resolved = issues.filter((i) => i.status === 'resolved').length
    return { total: issues.length, open, resolved }
  }, [issues])

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface')}>
      <SideNavBar />
      <main className={cm.cn(cm.minH('screen'), 'ml-[240px]')}>
        <div className={cm.cn(cm.mxAuto, 'max-w-4xl', cm.sp('px', 6), cm.sp('py', 8), cm.stack(6))}>
          <PageHeader
            molId="my-reports-title"
            title={t('myReports.title', {}, { defaultValue: 'My reports' })}
            subtitle={t(
              'myReports.subtitle',
              {},
              { defaultValue: 'Everything you have reported, and where it stands.' },
            )}
            action={
              <Link
                data-mol-id="my-reports-new"
                to="/report"
                className={cm.cn(
                  cm.sp('px', 4),
                  'rounded-lg py-2 text-sm font-semibold shrink-0',
                  'bg-primary text-on-primary hover:opacity-90',
                )}
              >
                {t('myReports.newReport', {}, { defaultValue: 'New report' })}
              </Link>
            }
          />

          <div
            data-mol-id="my-reports-stats"
            className={cm.cn(cm.flex({ gap: 6 }), cm.textSize('sm'), 'text-on-surface-variant')}
          >
            <span>
              <strong className="text-on-surface">{counts.total}</strong>{' '}
              {t('myReports.statTotal', {}, { defaultValue: 'total' })}
            </span>
            <span>
              <strong className="text-on-surface">{counts.open}</strong>{' '}
              {t('myReports.statOpen', {}, { defaultValue: 'still open' })}
            </span>
            <span>
              <strong className="text-on-surface">{counts.resolved}</strong>{' '}
              {t('myReports.statResolved', {}, { defaultValue: 'resolved' })}
            </span>
          </div>

          <div className={cm.flex({ align: 'center', gap: 3 })}>
            <label
              htmlFor="my-reports-status-filter"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
            >
              {t('myReports.filterLabel', {}, { defaultValue: 'Status' })}
            </label>
            <select
              id="my-reports-status-filter"
              data-mol-id="my-reports-status-filter"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant bg-surface-container-lowest',
              )}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">
                {t('myReports.filterAll', {}, { defaultValue: 'All statuses' })}
              </option>
              {['submitted', 'acknowledged', 'in_review', 'resolved', 'dismissed'].map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <section data-mol-id="my-reports-list" className={cm.stack(3)}>
            {loading ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : loadError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')} data-mol-id="my-reports-error">
                {loadError}
              </p>
            ) : filtered.length === 0 ? (
              <div
                data-mol-id="my-reports-empty"
                className={cm.cn(
                  cm.stack(3),
                  cm.sp('p', 8),
                  'rounded-xl border border-dashed border-outline-variant text-center',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'myReports.empty',
                    {},
                    { defaultValue: 'Nothing reported yet. Spotted something broken?' },
                  )}
                </p>
                <Link
                  data-mol-id="my-reports-empty-cta"
                  to="/report"
                  className={cm.cn(
                    cm.sp('px', 4),
                    'self-center rounded-lg py-2 text-sm font-semibold',
                    'bg-primary text-on-primary hover:opacity-90',
                  )}
                >
                  {t('myReports.emptyCta', {}, { defaultValue: 'Report your first issue' })}
                </Link>
              </div>
            ) : (
              filtered.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  data-mol-id="my-reports-item"
                  data-status={issue.status}
                  onClick={() => navigate(`/reports/${issue.id}`)}
                  className={cm.cn(
                    cm.flex({ align: 'start', justify: 'between', gap: 4 }),
                    cm.sp('p', 4),
                    'rounded-lg border border-outline-variant/50 bg-surface-container-lowest hover:bg-surface-container-low transition-colors text-left w-full',
                  )}
                >
                  <span className={cm.cn(cm.stack(1), 'min-w-0')}>
                    <span className={cm.flex({ align: 'center', gap: 2 })}>
                      <span
                        className="material-symbols-outlined"
                        style={{ color: `var(--color-cat-${issue.category})` }}
                        aria-hidden
                      >
                        {categoryIcon(issue.category)}
                      </span>
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                        {categoryLabel(issue.category)}
                      </span>
                      <StatusBadge status={issue.status} />
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {issue.derived_address} · {timeAgo(issue.created_at, t)}
                    </span>
                    <span
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant line-clamp-1')}
                    >
                      {issue.description}
                    </span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'whitespace-nowrap text-on-surface-variant',
                    )}
                  >
                    {t(
                      'myReports.confirmations',
                      { count: issue.confirmation_count },
                      { defaultValue: '{{count}} confirmations' },
                    )}
                  </span>
                </button>
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default MyReportsPage
