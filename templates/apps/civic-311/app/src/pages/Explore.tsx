import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import MiniMap from '../components/MiniMap.js'
import SideNavBar from '../components/SideNavBar.js'
import { PageHeader, StatusBadge } from '../components/StatusBadge.js'
import { categoryIcon, ISSUE_CATEGORIES, timeAgo, useCategoryLabel } from '../lib/issues.js'

interface CommunityIssue {
  id: string
  category: string
  description: string
  status: string
  derived_address: string
  reporter_name: string
  confirmation_count: number
  confirmed_by_me: boolean
  is_mine: boolean
  created_at: string
  x: number
  y: number
}

/**
 * Explore — the community map + list of reported issues with category and
 * status filters, and the CONFIRM ("me too") action on other residents'
 * reports. Clicking a pin selects the matching list row and vice versa.
 */
export function ExplorePage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const categoryLabel = useCategoryLabel()

  const [issues, setIssues] = useState<CommunityIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  useEffect(() => {
    document.title = t(
      'explore.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'Explore — {{appName}}' },
    )
  }, [t])

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await http.get('/api/issues?limit=100')
      const raw: CommunityIssue[] = Array.isArray(res)
        ? (res as CommunityIssue[])
        : Array.isArray((res as { data?: unknown })?.data)
          ? (res as { data: CommunityIssue[] }).data
          : []
      setIssues(raw)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setLoadError(
        t('explore.loadError', {}, { defaultValue: 'Could not load community issues. Try again.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void fetchIssues()
  }, [fetchIssues])

  const filtered = useMemo(
    () =>
      issues.filter((i) => {
        if (categoryFilter && i.category !== categoryFilter) return false
        if (statusFilter === 'open' && ['resolved', 'dismissed'].includes(i.status)) return false
        if (statusFilter && statusFilter !== 'open' && i.status !== statusFilter) return false
        return true
      }),
    [issues, categoryFilter, statusFilter],
  )

  async function handleConfirm(id: string) {
    if (confirmingId) return
    setConfirmingId(id)
    try {
      await http.post(`/api/issues/${id}/confirmations`, {})
      await fetchIssues()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setLoadError(
        err instanceof Error && err.message
          ? err.message
          : t('explore.confirmError', {}, { defaultValue: 'Could not confirm that report.' }),
      )
    } finally {
      setConfirmingId(null)
    }
  }

  const selected = filtered.find((i) => i.id === selectedId) ?? null

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface')}>
      <SideNavBar />
      <main className={cm.cn(cm.minH('screen'), 'ml-[240px]')}>
        <div className={cm.cn(cm.mxAuto, 'max-w-6xl', cm.sp('px', 6), cm.sp('py', 8), cm.stack(6))}>
          <PageHeader
            molId="explore-title"
            title={t('explore.title', {}, { defaultValue: 'Explore' })}
            subtitle={t(
              'explore.subtitle',
              {},
              {
                defaultValue:
                  'What your neighbors have reported across the city. Confirm the ones you see too.',
              },
            )}
            action={
              <Link
                data-mol-id="explore-report-cta"
                to="/report"
                className={cm.cn(
                  cm.sp('px', 4),
                  'rounded-lg py-2 text-sm font-semibold shrink-0',
                  'bg-primary text-on-primary hover:opacity-90',
                )}
              >
                {t('explore.report', {}, { defaultValue: 'Report an issue' })}
              </Link>
            }
          />

          {/* Filters */}
          <div
            data-mol-id="explore-filters"
            className={cm.cn(cm.flex({ align: 'center', gap: 3 }), 'flex-wrap')}
          >
            <label
              htmlFor="explore-category-filter"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
            >
              {t('explore.category', {}, { defaultValue: 'Category' })}
            </label>
            <select
              id="explore-category-filter"
              data-mol-id="explore-category-filter"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant bg-surface-container-lowest',
              )}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">
                {t('explore.allCategories', {}, { defaultValue: 'All categories' })}
              </option>
              {ISSUE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
            <label
              htmlFor="explore-status-filter"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
            >
              {t('explore.status', {}, { defaultValue: 'Status' })}
            </label>
            <select
              id="explore-status-filter"
              data-mol-id="explore-status-filter"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant bg-surface-container-lowest',
              )}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="open">
                {t('explore.openOnly', {}, { defaultValue: 'Open only' })}
              </option>
              <option value="">
                {t('explore.allStatuses', {}, { defaultValue: 'All statuses' })}
              </option>
              {['submitted', 'acknowledged', 'in_review', 'resolved', 'dismissed'].map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {loadError && (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} data-mol-id="explore-error">
              {loadError}
            </p>
          )}

          <div className={cm.flex({ align: 'start', gap: 6 })}>
            {/* Map */}
            <div
              data-mol-id="explore-map-wrap"
              className={cm.cn(cm.flex1, 'min-w-[300px] max-w-[520px]', cm.stack(2))}
            >
              <MiniMap
                data-mol-id="explore-map"
                pins={filtered.map((i) => ({
                  id: i.id,
                  x: i.x,
                  y: i.y,
                  color: `var(--color-cat-${i.category})`,
                }))}
                onPinClick={setSelectedId}
                selectedPinId={selectedId}
              />
              {selected && (
                <div
                  data-mol-id="explore-map-popover"
                  className={cm.cn(
                    cm.stack(1),
                    cm.sp('p', 3),
                    'rounded-lg bg-surface-container-low border border-outline-variant/50 text-sm',
                  )}
                >
                  <span className={cm.flex({ align: 'center', gap: 2 })}>
                    <span
                      className="material-symbols-outlined"
                      style={{ color: `var(--color-cat-${selected.category})` }}
                      aria-hidden
                    >
                      {categoryIcon(selected.category)}
                    </span>
                    <span className="font-semibold">{selected.derived_address}</span>
                    <StatusBadge status={selected.status} />
                  </span>
                  <span className="text-on-surface-variant line-clamp-2">
                    {selected.description}
                  </span>
                  <Link
                    data-mol-id="explore-map-open"
                    to={`/reports/${selected.id}`}
                    className="text-primary underline text-xs"
                  >
                    {t('explore.openReport', {}, { defaultValue: 'Open report' })}
                  </Link>
                </div>
              )}
            </div>

            {/* List */}
            <section data-mol-id="explore-list" className={cm.cn(cm.flex1, 'min-w-0', cm.stack(3))}>
              {loading ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : filtered.length === 0 ? (
                <p
                  data-mol-id="explore-empty"
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                >
                  {t(
                    'explore.empty',
                    {},
                    { defaultValue: 'No reports match these filters right now.' },
                  )}
                </p>
              ) : (
                filtered.map((issue) => (
                  <div
                    key={issue.id}
                    data-mol-id="explore-item"
                    data-category={issue.category}
                    data-status={issue.status}
                    data-selected={issue.id === selectedId}
                    // Selecting a list row is a pointer convenience only —
                    // the row also exposes a real Details link/button, so
                    // keyboard users lose nothing. role+tabIndex keep the
                    // interaction honest for screen readers.
                    role="button"
                    tabIndex={0}
                    className={cm.cn(
                      cm.stack(2),
                      cm.sp('p', 4),
                      'rounded-lg border bg-surface-container-lowest transition-colors cursor-pointer',
                      issue.id === selectedId
                        ? 'border-primary'
                        : 'border-outline-variant/50 hover:bg-surface-container-low',
                    )}
                    onClick={() => setSelectedId(issue.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedId(issue.id)
                      }
                    }}
                  >
                    <div className={cm.flex({ align: 'center', justify: 'between', gap: 3 })}>
                      <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0')}>
                        <span
                          className="material-symbols-outlined"
                          style={{ color: `var(--color-cat-${issue.category})` }}
                          aria-hidden
                        >
                          {categoryIcon(issue.category)}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'truncate',
                          )}
                        >
                          {categoryLabel(issue.category)} · {issue.derived_address}
                        </span>
                      </span>
                      <StatusBadge status={issue.status} />
                    </div>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant line-clamp-2')}>
                      {issue.description}
                    </p>
                    <div className={cm.flex({ align: 'center', justify: 'between', gap: 3 })}>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {issue.reporter_name ||
                          t('explore.aResident', {}, { defaultValue: 'A resident' })}{' '}
                        · {timeAgo(issue.created_at, t)} ·{' '}
                        {t(
                          'explore.confirmations',
                          { count: issue.confirmation_count },
                          { defaultValue: '{{count}} confirmations' },
                        )}
                      </span>
                      <span className={cm.flex({ gap: 2 })}>
                        {!issue.is_mine &&
                          (issue.confirmed_by_me ? (
                            <span
                              data-mol-id="explore-item-confirmed"
                              className="text-xs font-semibold text-primary"
                            >
                              {t('explore.confirmed', {}, { defaultValue: 'Confirmed by you' })}
                            </span>
                          ) : (
                            <button
                              type="button"
                              data-mol-id="explore-item-confirm"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleConfirm(issue.id)
                              }}
                              disabled={confirmingId === issue.id}
                              className={cm.cn(
                                cm.sp('px', 3),
                                'rounded-full border border-primary text-primary text-xs font-semibold py-1 hover:bg-primary-container/30 disabled:opacity-50',
                              )}
                            >
                              {confirmingId === issue.id
                                ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                                : t('explore.confirm', {}, { defaultValue: 'Me too' })}
                            </button>
                          ))}
                        <Link
                          data-mol-id="explore-item-open"
                          to={`/reports/${issue.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-medium text-primary underline"
                        >
                          {t('explore.details', {}, { defaultValue: 'Details' })}
                        </Link>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ExplorePage
