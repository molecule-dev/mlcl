/**
 * AdminDashboard — the product team's cockpit (admin).
 *
 * KPI row (open / planned / in progress / shipped / declined + total
 * votes), votes-over-time sparkline bars (8 weekly buckets from
 * GET /admin/stats), top-voted open posts, and recent ships.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatDate } from '../utils/posts.js'

interface StatsResponse {
  total_posts: number
  counts_by_status: Record<string, number>
  total_votes: number
  top_open: Array<{ id: string; title: string; vote_count: number; comment_count: number }>
  votes_over_time: Array<{ label: string; count: number }>
  recent_shipped: Array<{
    id: string
    title: string
    shipped_at: string | null
    vote_count: number
  }>
}

export function AdminDashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth<{ id?: string }>()
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    let cancelled = false
    const http = getHttpClient()
    void http
      .get<StatsResponse>('/api/admin/stats')
      .then((res) => {
        if (cancelled) return
        if (res?.data?.total_posts !== undefined) setStats(res.data)
        else setDenied(true)
      })
      .catch((e) => {
        logError('adminDashboard.load', e)
        if (!cancelled) setDenied(true)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  if (denied) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'items-start')}>
        <p
          className={cm.cn(cm.textSize('base'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          {t('admin.denied', {}, { defaultValue: 'Admins only.' })}
        </p>
        <Link
          to="/boards"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          {t('admin.backToBoards', {}, { defaultValue: 'Back to boards' })}
        </Link>
      </div>
    )
  }

  const kpis: Array<{ key: string; label: string; value: number }> = stats
    ? [
        {
          key: 'open',
          label: t('status.open', {}, { defaultValue: 'Open' }),
          value: stats.counts_by_status.open ?? 0,
        },
        {
          key: 'planned',
          label: t('status.planned', {}, { defaultValue: 'Planned' }),
          value: stats.counts_by_status.planned ?? 0,
        },
        {
          key: 'in_progress',
          label: t('status.inProgress', {}, { defaultValue: 'In progress' }),
          value: stats.counts_by_status.in_progress ?? 0,
        },
        {
          key: 'shipped',
          label: t('status.shipped', {}, { defaultValue: 'Shipped' }),
          value: stats.counts_by_status.shipped ?? 0,
        },
        {
          key: 'declined',
          label: t('status.declined', {}, { defaultValue: 'Declined' }),
          value: stats.counts_by_status.declined ?? 0,
        },
      ]
    : []

  const maxBucket = stats ? Math.max(1, ...stats.votes_over_time.map((b) => b.count)) : 1

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-primary',
            )}
          >
            {t('admin.eyebrow', {}, { defaultValue: 'Product team' })}
          </span>
          <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
            {t('admin.title', {}, { defaultValue: 'Feedback dashboard' })}
          </h1>
        </div>
        <Link
          to="/admin/posts"
          data-mol-id="admin-manage-link"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            'rounded-full bg-primary text-on-primary hover:bg-primary-active transition-colors',
          )}
        >
          {t('admin.managePosts', {}, { defaultValue: 'Manage posts' })}
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </header>

      {!stats ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <>
          <section
            aria-labelledby="admin-lifecycle"
            className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
          >
            <h2
              id="admin-lifecycle"
              className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
            >
              {t('admin.lifecycleTitle', {}, { defaultValue: 'Status Lifecycle Distribution' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'admin.lifecycleBody',
                {},
                { defaultValue: 'Backlog breakdown by delivery phase.' },
              )}
            </p>
            <div className={cm.cn('grid gap-3 grid-cols-2 md:grid-cols-5')}>
              {kpis.map((kpi) => (
                <div
                  key={kpi.key}
                  data-mol-id={`admin-kpi-${kpi.key}`}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'xs' }),
                    cm.sp('p', 4),
                    'rounded-xl border border-outline-variant/40 bg-surface',
                  )}
                >
                  <span
                    className={cm.cn(cm.fontWeight('bold'), cm.textSize('3xl'))}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {kpi.value}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {kpi.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 5),
              'rounded-xl border border-outline-variant/40 bg-surface',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                'flex-wrap',
              )}
            >
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  'text-on-surface',
                )}
              >
                {t(
                  'admin.votesOverTime',
                  {},
                  { defaultValue: 'Customer Demand & Votes Over Time' },
                )}
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 0.5),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'rounded-full border whitespace-nowrap',
                  )}
                  style={{
                    borderColor: 'var(--color-outline-variant)',
                    color: 'var(--color-on-surface-variant)',
                  }}
                >
                  {t('admin.velocityTracker', {}, { defaultValue: 'Velocity Tracker' })}
                </span>
              </h2>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-on-surface-variant',
                )}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {t(
                  'admin.totalVotes',
                  { count: stats.total_votes },
                  { defaultValue: '{{count}} total' },
                )}
              </span>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'admin.votesOverTimeBody',
                {},
                { defaultValue: 'Weekly intake across accounts and community feedback.' },
              )}
            </p>
            <div
              className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'xs' }), 'h-32')}
              role="img"
              aria-label={t(
                'admin.votesChartLabel',
                {},
                {
                  defaultValue: 'Bar chart of votes cast per week over the last eight weeks',
                },
              )}
            >
              {stats.votes_over_time.map((bucket, i) => (
                <div
                  key={`${bucket.label}-${i}`}
                  className={cm.cn(
                    cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                    cm.flex1,
                  )}
                >
                  <div
                    className={cm.cn(cm.w('full'), 'rounded-t-md transition-all')}
                    style={{
                      height: `${Math.max(4, (bucket.count / maxBucket) * 96)}px`,
                      backgroundColor: 'var(--color-primary)',
                      opacity: 0.45 + (bucket.count / maxBucket) * 0.55,
                    }}
                    title={`${bucket.label}: ${bucket.count}`}
                  />
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {bucket.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-2')}>
            <section
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('p', 5),
                'rounded-xl border border-outline-variant/40 bg-surface',
              )}
            >
              <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
                {t('admin.topOpen', {}, { defaultValue: 'Top Open Requests by Vote Weight' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'admin.topOpenBody',
                  {},
                  {
                    defaultValue:
                      'High-impact customer demand items needing status triage or engineering routing.',
                  },
                )}
              </p>
              {stats.top_open.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('admin.noOpen', {}, { defaultValue: 'No open requests — inbox zero.' })}
                </p>
              ) : (
                stats.top_open.map((post) => (
                  <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                      cm.sp('p', 3),
                      'rounded-lg border border-outline-variant/40 hover:border-primary/40 transition-colors',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'text-on-surface',
                      )}
                    >
                      {post.title}
                    </span>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                      )}
                      style={{ color: 'var(--color-primary)' }}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        arrow_drop_up
                      </span>
                      {post.vote_count}
                    </span>
                  </Link>
                ))
              )}
            </section>

            <section
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('p', 5),
                'rounded-xl border border-outline-variant/40 bg-surface',
              )}
            >
              <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
                {t('admin.recentShipped', {}, { defaultValue: 'Recent Ships & Auto-Notifies' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'admin.recentShippedBody',
                  {},
                  { defaultValue: 'Closed-loop customer feed — every ship notifies its voters.' },
                )}
              </p>
              {stats.recent_shipped.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('admin.noShipped', {}, { defaultValue: 'Nothing shipped yet.' })}
                </p>
              ) : (
                stats.recent_shipped.map((post) => (
                  <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                      cm.sp('p', 3),
                      'rounded-lg border border-outline-variant/40 hover:border-primary/40 transition-colors',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'text-on-surface',
                      )}
                    >
                      {post.title}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {formatDate(post.shipped_at)}
                    </span>
                  </Link>
                ))
              )}
            </section>
          </div>

          <section
            aria-labelledby="admin-ops-health"
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 5),
              'rounded-xl border border-outline-variant/40 bg-surface',
            )}
          >
            <h3
              id="admin-ops-health"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('base'),
                'text-on-surface',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(7),
                  cm.h(7),
                  'rounded-md shrink-0',
                )}
                style={{
                  backgroundColor: 'var(--color-primary-container)',
                  color: 'var(--color-primary)',
                }}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-sm')}>tune</span>
              </span>
              {t('admin.opsHealthTitle', {}, { defaultValue: 'Operations Automation Health' })}
            </h3>
            <div className={cm.cn('grid gap-3 grid-cols-1 sm:grid-cols-3')}>
              {[
                {
                  icon: 'notifications_active',
                  labelKey: 'admin.opsAutoNotify',
                  labelDefault: 'Ship auto-notify',
                  valueKey: 'admin.opsAutoNotifyValue',
                  valueDefault: 'Active — voters alerted on every status change',
                },
                {
                  icon: 'merge',
                  labelKey: 'admin.opsMerge',
                  labelDefault: 'Duplicate merge assist',
                  valueKey: 'admin.opsMergeValue',
                  valueDefault: 'Active — merged votes pool automatically',
                },
                {
                  icon: 'event_repeat',
                  labelKey: 'admin.opsCadence',
                  labelDefault: 'Triage cadence',
                  valueKey: 'admin.opsCadenceValue',
                  valueDefault: 'Weekly — oldest unanswered request first',
                },
              ].map((tile) => (
                <div
                  key={tile.labelKey}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'xs' }),
                    cm.sp('p', 3),
                    'rounded-lg border border-outline-variant/40 bg-surface-container-low/40',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-sm')}
                      style={{ color: 'var(--color-status-shipped)' }}
                      aria-hidden="true"
                    >
                      {tile.icon}
                    </span>
                    {t(tile.labelKey, {}, { defaultValue: tile.labelDefault })}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                    {t(tile.valueKey, {}, { defaultValue: tile.valueDefault })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default AdminDashboard
