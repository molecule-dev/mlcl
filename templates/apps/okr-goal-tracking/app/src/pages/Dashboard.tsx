import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import type { TranslateFunction } from '@molecule/app-i18n'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiSummaryCard } from '../components/KpiSummaryCard.js'
import { ObjectiveCard, type ObjectiveCardData } from '../components/ObjectiveCard.js'
import { ProgressRing } from '../components/ProgressRing.js'
import { type KeyResultRow, type NotificationRow, type ObjectiveRow, uiStatus } from '../lib/api.js'

interface ObjectiveWithCounts extends ObjectiveCardData {
  raw: ObjectiveRow
}

function formatRelative(iso: string, t: TranslateFunction): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const m = Math.round(ms / 60_000)
  if (m < 1) return t('common.relative.justNow', {}, { defaultValue: 'just now' })
  if (m < 60)
    return t('common.relative.minutesAgo', { count: m }, { defaultValue: '{{count}} min ago' })
  const h = Math.round(m / 60)
  if (h < 24)
    return t('common.relative.hoursAgo', { count: h }, { defaultValue: '{{count}} hr ago' })
  const d = Math.round(h / 24)
  if (d < 7) return t('common.relative.daysAgo', { count: d }, { defaultValue: '{{count}}d ago' })
  return new Date(iso).toLocaleDateString()
}

function notifTone(type: string): 'primary' | 'success' | 'warning' | 'neutral' {
  if (type === 'check_in_due' || type === 'review_open') return 'primary'
  if (type === 'kr_on_track' || type === 'kr_completed') return 'success'
  if (type === 'kr_at_risk' || type === 'kr_off_track') return 'warning'
  return 'neutral'
}

function notifIcon(type: string): string {
  if (type === 'check_in_due') return 'fact_check'
  if (type === 'review_open') return 'rate_review'
  if (type === 'kr_on_track') return 'trending_up'
  if (type === 'mention' || type === 'comment') return 'forum'
  return 'notifications'
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const firstName = (
    user?.name ??
    user?.email ??
    t('profile.guestName', {}, { defaultValue: 'Climber' })
  ).split(/\s+|@/)[0]

  const [objectives, setObjectives] = useState<ObjectiveWithCounts[]>([])
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let aborted = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get<ObjectiveRow[]>('/api/objectives'),
      http.get<KeyResultRow[]>('/api/key-results'),
      http.get<NotificationRow[]>('/api/notifications'),
    ])
      .then(([objsRes, krsRes, notifsRes]) => {
        if (aborted) return
        const objs = objsRes.data
        const krs = krsRes.data
        const notifs = notifsRes.data
        const krByObj = new Map<string, KeyResultRow[]>()
        for (const kr of krs ?? []) {
          const list = krByObj.get(kr.objective_id) ?? []
          list.push(kr)
          krByObj.set(kr.objective_id, list)
        }
        const ownerLabel =
          (user?.name ?? user?.email ?? '').split('@')[0] ||
          t('common.you', {}, { defaultValue: 'You' })
        const cards: ObjectiveWithCounts[] = (objs ?? []).map((o) => {
          const krs = krByObj.get(o.id) ?? []
          const completed = krs.filter((k) => k.status === 'completed').length
          return {
            id: o.id,
            title: o.title,
            description: o.description ?? undefined,
            ownerName: ownerLabel,
            period: t('objectives.periodCurrent', {}, { defaultValue: 'Current' }),
            progress: o.progress,
            status: uiStatus(o.status),
            keyResultCount: krs.length,
            keyResultsCompleted: completed,
            raw: o,
          }
        })
        setObjectives(cards)
        setNotifications(notifs ?? [])
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
        setLoading(false)
      })
    return () => {
      aborted = true
    }
  }, [http, t, user?.email, user?.name])

  const onTrack = objectives.filter(
    (o) => o.status === 'on-track' || o.status === 'completed',
  ).length
  const atRisk = objectives.filter((o) => o.status === 'at-risk').length
  const behind = objectives.filter((o) => o.status === 'behind').length
  const avgProgress = objectives.length
    ? Math.round(objectives.reduce((s, o) => s + o.progress, 0) / objectives.length)
    : 0

  return (
    <div className={cm.cn(cm.stack(8))}>
      <section
        className={cm.cn('relative overflow-hidden rounded-[2rem] text-white', cm.sp('p', 8))}
        style={{
          background:
            'linear-gradient(135deg, var(--color-nav-bg) 0%, var(--color-primary-hover) 55%, var(--color-secondary) 100%)',
        }}
      >
        <div
          aria-hidden
          className={cm.cn(
            'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
        />
        <div
          aria-hidden
          className={cm.cn(
            'absolute -left-16 -top-20 w-64 h-64 rounded-full bg-sky-400/30 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center', gap: 'lg' }),
            'relative flex-col lg:flex-row',
          )}
        >
          <div className={cm.cn(cm.stack(3), 'max-w-2xl')}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-[0.22em] text-sky-200',
              )}
            >
              {t(
                'dashboard.eyebrow',
                { period: t('dashboard.periodThisQuarter', {}, { defaultValue: 'This quarter' }) },
                { defaultValue: '{{period}}' },
              )}
            </span>
            <h1
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] text-white',
              )}
            >
              {t(
                'dashboard.heroTitle',
                { name: firstName },
                { defaultValue: 'Good climbing, {{name}}.' },
              )}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-indigo-100 leading-relaxed')}>
              {objectives.length === 0
                ? t(
                    'dashboard.heroEmpty',
                    {},
                    {
                      defaultValue:
                        "You don't have any objectives yet. Start by drafting your first one.",
                    },
                  )
                : t(
                    'dashboard.heroBody',
                    { count: objectives.length, atRisk },
                    {
                      defaultValue:
                        "You're owning {{count}} objectives. {{atRisk}} need a closer look — let's keep them on track.",
                    },
                  )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('pt', 2))}>
              <Link
                to="/check-in"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface text-indigo-700 shadow-lg hover:scale-[1.02] active:scale-[0.99] transition-transform',
                )}
              >
                <span className="material-symbols-outlined text-[18px]">fact_check</span>
                {t('dashboard.startCheckIn', {}, { defaultValue: 'Run weekly check-in' })}
              </Link>
              <Link
                to="/objectives/new"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface/15 backdrop-blur-md text-white border border-surface/20 hover:bg-surface/25 transition-colors',
                )}
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                {t('dashboard.newObjective', {}, { defaultValue: 'New objective' })}
              </Link>
            </div>
          </div>
          <div className="relative shrink-0">
            <ProgressRing
              value={avgProgress}
              size={170}
              stroke={14}
              status="on-track"
              label={t('dashboard.heroProgressLabel', {}, { defaultValue: 'Quarter progress' })}
              className="text-white"
            />
          </div>
        </div>
      </section>

      <section className={cm.cn(cm.grid({ cols: 4, gap: 'lg' }))}>
        <KpiSummaryCard
          icon="flag"
          tone="primary"
          label={t('dashboard.kpiActiveLabel', {}, { defaultValue: 'Active objectives' })}
          value={objectives.length}
        />
        <KpiSummaryCard
          icon="trending_up"
          tone="success"
          label={t('dashboard.kpiOnTrackLabel', {}, { defaultValue: 'On track' })}
          value={onTrack}
        />
        <KpiSummaryCard
          icon="warning"
          tone="warning"
          label={t('dashboard.kpiAtRiskLabel', {}, { defaultValue: 'At risk' })}
          value={atRisk}
        />
        <KpiSummaryCard
          icon="error"
          tone="danger"
          label={t('dashboard.kpiBehindLabel', {}, { defaultValue: 'Behind' })}
          value={behind}
        />
      </section>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl bg-error-light border border-red-200 text-error text-sm',
          )}
        >
          {error}
        </div>
      )}

      <section className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <div className={cm.cn('col-span-12 lg:col-span-8', cm.stack(4))}>
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
            <h2
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('dashboard.objectivesHeading', {}, { defaultValue: 'Your objectives' })}
            </h2>
            <Link
              to="/objectives"
              className={cm.cn(
                'text-sm font-bold text-indigo-700 hover:text-indigo-900 transition-colors',
              )}
            >
              {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
            </Link>
          </div>
          {loading ? (
            <p
              data-testid="dashboard-loading"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t('dashboard.loading', {}, { defaultValue: 'Loading objectives…' })}
            </p>
          ) : objectives.length === 0 ? (
            <div
              data-testid="dashboard-empty"
              className={cm.cn(
                cm.sp('p', 8),
                cm.stack(2),
                cm.textCenter,
                'rounded-2xl border border-dashed border-outline-variant bg-surface-container-low',
              )}
            >
              <span
                className="material-symbols-outlined text-[40px] text-on-surface-variant/60 mx-auto"
                aria-hidden
              >
                flag
              </span>
              <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                {t('dashboard.emptyTitle', {}, { defaultValue: 'No objectives yet' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md mx-auto')}>
                {t(
                  'dashboard.emptyBody',
                  {},
                  { defaultValue: 'Draft your first objective to start tracking weekly progress.' },
                )}
              </p>
              <div>
                <Link
                  to="/objectives/new"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-xl text-white bg-gradient-to-br from-indigo-600 to-sky-500 inline-flex',
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  {t('dashboard.newObjective', {}, { defaultValue: 'New objective' })}
                </Link>
              </div>
            </div>
          ) : (
            <div className={cm.cn(cm.grid({ cols: 2, gap: 'lg' }))}>
              {objectives.map((obj) => (
                <ObjectiveCard key={obj.id} objective={obj} href={`/objectives/${obj.id}`} />
              ))}
            </div>
          )}
        </div>
        <aside className={cm.cn('col-span-12 lg:col-span-4', cm.stack(4))}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <h3
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
            </h3>
            {notifications.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'dashboard.noActivity',
                  {},
                  { defaultValue: 'No activity yet. Run a check-in to start the climb.' },
                )}
              </p>
            ) : (
              <ul className={cm.cn(cm.stack(3))}>
                {notifications.slice(0, 3).map((n) => {
                  const tone = notifTone(n.type)
                  return (
                    <li key={n.id} className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'w-9 h-9 rounded-lg shrink-0',
                          tone === 'primary' && 'bg-indigo-100 text-indigo-700',
                          tone === 'success' && 'bg-success-light text-success-text',
                          tone === 'warning' && 'bg-warning-light text-warning',
                          tone === 'neutral' && 'bg-surface-secondary text-foreground-secondary',
                        )}
                      >
                        <span
                          className="material-symbols-outlined text-[20px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {notifIcon(n.type)}
                        </span>
                      </span>
                      <div className={cm.cn(cm.stack(1), 'flex-1 min-w-0')}>
                        <p
                          className={cm.cn(
                            cm.textSize('sm'),
                            'font-semibold text-on-surface leading-tight',
                          )}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p
                            className={cm.cn(
                              cm.textSize('xs'),
                              'text-on-surface-variant leading-snug',
                            )}
                          >
                            {n.body}
                          </p>
                        )}
                        <span
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            'text-[10px] uppercase tracking-widest text-on-surface-variant/70',
                          )}
                        >
                          {formatRelative(n.created_at, t)}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <Link
              to="/notifications"
              className={cm.cn(
                'text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors',
              )}
            >
              {t('dashboard.allActivity', {}, { defaultValue: 'See all activity →' })}
            </Link>
          </div>

          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-100',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-indigo-700',
              )}
            >
              <span className="material-symbols-outlined text-[16px]">tips_and_updates</span>
              {t('dashboard.coachLabel', {}, { defaultValue: 'Coaching nudge' })}
            </span>
            {/* Fixed dark ink — this card keeps its light indigo tint in dark
                mode, so a theme-flipping text token would become unreadable. */}
            <p className={cm.cn(cm.textSize('sm'), 'font-semibold leading-snug text-indigo-950')}>
              {atRisk + behind > 0
                ? t(
                    'dashboard.coachBodyAtRisk',
                    { atRisk: atRisk + behind },
                    {
                      defaultValue:
                        '{{atRisk}} KRs slipped this week. A 15-minute conversation today usually buys a full week of recovery.',
                    },
                  )
                : t(
                    'dashboard.coachBodyOk',
                    {},
                    {
                      defaultValue:
                        'Your KRs look healthy this week — keep the cadence and run your check-in.',
                    },
                  )}
            </p>
            <Link
              to="/check-in"
              className={cm.cn(
                'text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors',
              )}
            >
              {t('dashboard.coachCta', {}, { defaultValue: 'Open weekly check-in →' })}
            </Link>
          </div>
        </aside>
      </section>
    </div>
  )
}

export default Dashboard
