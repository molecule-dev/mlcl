import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { get } from '@molecule/app-http'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import DashboardTopBar from '../components/DashboardTopBar.js'
import SideNavBar from '../components/SideNavBar.js'

interface ConversationRow {
  id: string
  customer_name: string | null
  customer_email: string | null
  channel: string
  status: string
  escalated: boolean
  message_count: number
  last_message_at: string | null
  started_at: string
}

interface EscalationRow {
  id: string
  conversation_id: string
  summary: string
  requested_at: string
  resolved_at: string | null
}

interface AnalyticsResponse {
  summary: {
    totalConversations: number
    resolvedConversations: number
    escalatedConversations: number
    openConversations: number
    resolutionRate: number
    averageCsat: number
    helpfulRate: number
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  return `${day}d`
}

function initialsOf(name: string | null): string {
  if (!name) return '?'
  return (
    name
      .split(/\s+/)
      .map((s) => s[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

interface StatCardProps {
  id: string
  labelKey: string
  labelDefault: string
  value: string
  unit?: string
  icon: string
  iconClasses?: string
}

function StatCard({
  id,
  labelKey,
  labelDefault,
  value,
  unit,
  icon,
  iconClasses = 'text-primary',
}: StatCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      data-mol-id={`dashboard-stat-${id}`}
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 6),
        cm.h('[160px]'),
        'bg-surface-container-lowest rounded-xl atmospheric-shadow hover:bg-surface-container-high transition-colors duration-300 group',
      )}
    >
      <div className={cm.flex({ justify: 'between', align: 'start' })}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[0.6875rem] tracking-[0.05em] uppercase text-outline',
          )}
        >
          {t(labelKey, {}, { defaultValue: labelDefault })}
        </span>
        <div
          className={cm.cn(
            cm.sp('p', 2),
            'bg-surface-container-low rounded-lg group-hover:bg-surface-container transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined', iconClasses)}>{icon}</span>
        </div>
      </div>
      <div className={cm.sp('mt', 4)}>
        <div className={cm.flex({ align: 'baseline', gap: 2 })}>
          <span
            data-mol-id={`dashboard-stat-${id}-value`}
            className={cm.cn(cm.textSize('4xl'), 'font-black text-on-surface')}
          >
            {value}
          </span>
          {unit && (
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-outline')}>
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ name?: string; email?: string }>()
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [escalations, setEscalations] = useState<EscalationRow[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [convs, escs, analyticsResp] = await Promise.all([
          get<ConversationRow[]>('/api/conversations'),
          get<EscalationRow[]>('/api/escalations').catch(() => ({ data: [] as EscalationRow[] })),
          get<AnalyticsResponse>('/api/analytics').catch(() => ({ data: null })),
        ])
        if (cancelled) return
        setConversations(Array.isArray(convs.data) ? convs.data : [])
        setEscalations(Array.isArray(escs.data) ? escs.data : [])
        setAnalytics(analyticsResp.data ?? null)
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : t('dashboard.loadError', {}, { defaultValue: 'Failed to load dashboard' }),
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hour = new Date().getHours()
  const greetingName =
    user?.name ?? user?.email ?? t('dashboard.defaultGreetingName', {}, { defaultValue: 'there' })
  const greeting =
    hour < 12
      ? t(
          'dashboard.greetingMorning',
          { name: greetingName },
          { defaultValue: 'Good morning, {{name}}.' },
        )
      : hour < 17
        ? t(
            'dashboard.greetingAfternoon',
            { name: greetingName },
            { defaultValue: 'Good afternoon, {{name}}.' },
          )
        : t(
            'dashboard.greetingEvening',
            { name: greetingName },
            { defaultValue: 'Good evening, {{name}}.' },
          )

  const recentEscalations = escalations.filter((e) => !e.resolved_at).slice(0, 5)
  const activeConversations = conversations
    .filter((c) => c.status === 'open' || c.status === 'pending' || c.escalated)
    .slice(0, 6)

  const summary = analytics?.summary
  const csatValue = summary?.averageCsat ? summary.averageCsat.toFixed(2) : '0.00'
  const resolutionValue = summary ? `${Math.round(summary.resolutionRate * 100)}%` : '0%'
  const escalationsValue = summary ? String(summary.escalatedConversations) : '0'
  const totalValue = summary ? String(summary.totalConversations) : '0'

  return (
    <div
      data-mol-id="page-dashboard"
      aria-label={t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
      className={cm.cn(
        cm.flex(),
        cm.h('screen'),
        'overflow-hidden antialiased bg-background text-on-background selection:bg-primary selection:text-on-primary',
      )}
    >
      <SideNavBar />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          cm.h('screen'),
          'overflow-hidden relative',
        )}
      >
        <DashboardTopBar />
        <div className={cm.cn(cm.flex1, cm.sp('p', 6), 'overflow-y-auto md:p-8 lg:p-10')}>
          <div className={cm.cn(cm.maxW('[1400px]'), cm.mxAuto, cm.stack(8))}>
            <div data-mol-id="dashboard-welcome">
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[2.75rem] text-on-background leading-tight tracking-tight',
                )}
              >
                {greeting}
              </h1>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  'dashboard.subtitle',
                  {},
                  { defaultValue: "Here's the pulse of your support environment today." },
                )}
              </p>
            </div>

            {error && (
              <div
                data-mol-id="dashboard-error"
                role="alert"
                className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-error/10 text-error text-sm')}
              >
                {error}
              </div>
            )}

            {loading ? (
              <div
                data-mol-id="dashboard-loading"
                className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-on-surface-variant')}
              >
                {t('dashboard.loading', {}, { defaultValue: 'Loading metrics…' })}
              </div>
            ) : (
              <>
                <div
                  className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-2 lg:grid-cols-4')}
                  data-mol-id="dashboard-stats"
                >
                  <StatCard
                    id="resolution"
                    labelKey="dashboard.stat.resolution"
                    labelDefault="Resolution rate"
                    value={resolutionValue}
                    icon="check_circle"
                  />
                  <StatCard
                    id="total"
                    labelKey="dashboard.stat.total"
                    labelDefault="Total threads"
                    value={totalValue}
                    icon="forum"
                  />
                  <StatCard
                    id="csat"
                    labelKey="dashboard.stat.csat"
                    labelDefault="Avg CSAT"
                    value={csatValue}
                    unit="/ 5"
                    icon="star"
                    iconClasses="text-accent"
                  />
                  <StatCard
                    id="escalations"
                    labelKey="dashboard.stat.escalations"
                    labelDefault="Escalations"
                    value={escalationsValue}
                    icon="warning"
                    iconClasses="text-secondary"
                  />
                </div>

                <div className={cm.cn(cm.grid({ cols: 1, gap: 8 }), 'lg:grid-cols-12')}>
                  <div
                    className={cm.cn(
                      cm.flex({ direction: 'col' }),
                      cm.sp('p', 6),
                      'lg:col-span-8 bg-surface-container-lowest rounded-xl atmospheric-shadow',
                    )}
                    data-mol-id="dashboard-active-conversations"
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ justify: 'between', align: 'center' }),
                        cm.sp('mb', 4),
                      )}
                    >
                      <h3
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-background',
                        )}
                      >
                        {t('dashboard.active.title', {}, { defaultValue: 'Active conversations' })}
                      </h3>
                      <Link
                        data-mol-id="dashboard-view-all-conversations"
                        to="/conversations"
                        className="text-primary hover:text-primary-container text-sm font-medium transition-colors"
                      >
                        {t('common.viewAll', {}, { defaultValue: 'View all' })}
                      </Link>
                    </div>
                    {activeConversations.length === 0 ? (
                      <div
                        data-mol-id="dashboard-active-empty"
                        className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-on-surface-variant')}
                      >
                        {t(
                          'dashboard.active.empty',
                          {},
                          { defaultValue: 'No active conversations right now.' },
                        )}
                      </div>
                    ) : (
                      <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
                        {activeConversations.map((c) => (
                          <Link
                            key={c.id}
                            data-mol-id={`dashboard-active-${c.id}`}
                            to={`/conversations/${c.id}`}
                            className={cm.cn(
                              cm.flex({ align: 'center', gap: 3, justify: 'between' }),
                              cm.sp('p', 3),
                              'rounded-lg hover:bg-surface-container-low transition-colors',
                            )}
                          >
                            <div className={cm.flex({ align: 'center', gap: 3 })}>
                              <div
                                className={cm.cn(
                                  cm.flex({ align: 'center', justify: 'center' }),
                                  cm.w(8),
                                  cm.h(8),
                                  cm.roundedFull,
                                  cm.fontWeight('bold'),
                                  cm.textSize('xs'),
                                  'bg-primary/10 text-primary',
                                )}
                              >
                                {initialsOf(c.customer_name)}
                              </div>
                              <div className={cm.flex({ direction: 'col' })}>
                                <span
                                  className={cm.cn(
                                    cm.textSize('sm'),
                                    cm.fontWeight('medium'),
                                    'text-on-surface',
                                  )}
                                >
                                  {c.customer_name ??
                                    t('conversations.anonymous', {}, { defaultValue: 'Anonymous' })}
                                </span>
                                <span
                                  className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                                >
                                  {c.channel} · {c.message_count}{' '}
                                  {t('dashboard.messagesUnit', {}, { defaultValue: 'msgs' })}
                                </span>
                              </div>
                            </div>
                            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                              {relativeTime(c.last_message_at ?? c.started_at)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className={cm.cn(
                      cm.flex({ direction: 'col' }),
                      cm.sp('p', 6),
                      'lg:col-span-4 bg-surface-container-lowest rounded-xl atmospheric-shadow',
                    )}
                    data-mol-id="dashboard-recent-escalations"
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ justify: 'between', align: 'center' }),
                        cm.sp('mb', 4),
                      )}
                    >
                      <h3
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-background',
                        )}
                      >
                        {t(
                          'dashboard.escalations.title',
                          {},
                          { defaultValue: 'Recent escalations' },
                        )}
                      </h3>
                      <Link
                        data-mol-id="dashboard-view-all-escalations"
                        to="/conversations"
                        className="text-primary hover:text-primary-container text-sm font-medium transition-colors"
                      >
                        {t('common.viewAll', {}, { defaultValue: 'View all' })}
                      </Link>
                    </div>
                    {recentEscalations.length === 0 ? (
                      <div
                        data-mol-id="dashboard-escalations-empty"
                        className={cm.cn(
                          cm.textCenter,
                          cm.sp('p', 6),
                          'text-on-surface-variant text-sm',
                        )}
                      >
                        {t(
                          'dashboard.escalations.empty',
                          {},
                          { defaultValue: 'No open escalations.' },
                        )}
                      </div>
                    ) : (
                      <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
                        {recentEscalations.map((e) => (
                          <Link
                            key={e.id}
                            data-mol-id={`dashboard-escalation-${e.id}`}
                            to={`/conversations/${e.conversation_id}`}
                            className={cm.cn(
                              cm.sp('p', 3),
                              'rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors block',
                            )}
                          >
                            <div
                              className={cm.cn(
                                cm.flex({ justify: 'between', align: 'start' }),
                                cm.sp('mb', 1),
                              )}
                            >
                              <p
                                className={cm.cn(
                                  cm.textSize('sm'),
                                  cm.fontWeight('semibold'),
                                  'text-on-surface line-clamp-1',
                                )}
                              >
                                {e.summary ||
                                  t(
                                    'dashboard.escalations.unsummarized',
                                    {},
                                    { defaultValue: 'Escalation request' },
                                  )}
                              </p>
                              <span
                                className={cm.cn(
                                  cm.textSize('xs'),
                                  'text-on-surface-variant ml-2 shrink-0',
                                )}
                              >
                                {relativeTime(e.requested_at)}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
export { Dashboard, Dashboard as DashboardPage }
