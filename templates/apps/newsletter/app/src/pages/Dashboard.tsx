import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SafeLink } from '../components/SafeLink.js'
import SideNavBar from '../components/SideNavBar.js'
import TopNavBar from '../components/TopNavBar.js'

interface Overview {
  subscriberCounts: {
    subscribed: number
    unsubscribed: number
    pending: number
    paid: number
    free: number
    total: number
  }
  growthSeries: Array<{ date: string; total: number }>
  issueCounts: { draft: number; scheduled: number; published: number }
  lastIssue: {
    id: string
    subject: string
    publish_at: string | null
    delivered: number
    opened: number
    clicked: number
    open_rate: number
  } | null
  totals: {
    delivered: number
    opened: number
    clicked: number
    open_rate: number
    click_rate: number
  }
}

function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pageTitle = t('nav.dashboard', {}, { defaultValue: 'Dashboard' })
  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const http = useHttpClient()

  useEffect(() => {
    let active = true
    setLoading(true)
    http
      .get<Overview>('/api/stats/overview')
      .then((res) => {
        if (active) setOverview(res.data)
      })
      .catch(
        (err: unknown) =>
          active &&
          setError(
            err instanceof Error
              ? err.message
              : t('dashboard.loadError', {}, { defaultValue: 'Failed to load stats' }),
          ),
      )
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [http, t])

  const growth = overview?.growthSeries ?? []
  const maxGrowth = growth.length > 0 ? Math.max(...growth.map((g) => g.total), 1) : 1

  return (
    <>
      <SideNavBar />
      <TopNavBar />
      <main
        aria-label={pageTitle}
        className={cm.cn(
          cm.minH('screen'),
          // Sidebar is hidden below md — content spans full width there.
          'md:ml-[240px] pt-24 pb-24 md:pb-0 bg-surface-container-low/30',
        )}
      >
        <div className={cm.cn(cm.mxAuto, 'p-4 md:p-10', cm.stack(10), 'max-w-[1440px]')}>
          <div>
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                'font-black',
                "font-['Newsreader'] text-on-background",
              )}
            >
              {t('dashboard.welcome', {}, { defaultValue: 'Publication overview' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'dashboard.subhead',
                {},
                { defaultValue: 'Subscriber growth and how your last issue landed.' },
              )}
            </p>
          </div>

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
          ) : overview ? (
            <>
              {/* KPI row */}
              <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-4')}>
                <KpiCard
                  label={t(
                    'dashboard.activeSubscribers',
                    {},
                    { defaultValue: 'Active subscribers' },
                  )}
                  value={overview.subscriberCounts.subscribed.toLocaleString()}
                  hint={t(
                    'dashboard.paidHint',
                    { count: overview.subscriberCounts.paid },
                    { defaultValue: '{{count}} on a paid tier' },
                  )}
                  dataMolId="dashboard-kpi-subscribers"
                />
                <KpiCard
                  label={t(
                    'dashboard.lastIssueOpenRate',
                    {},
                    { defaultValue: 'Last issue open rate' },
                  )}
                  value={
                    overview.lastIssue
                      ? `${overview.lastIssue.open_rate}%`
                      : t('common.none', {}, { defaultValue: '—' })
                  }
                  hint={
                    overview.lastIssue
                      ? t(
                          'dashboard.openedOfDelivered',
                          {
                            opened: overview.lastIssue.opened,
                            delivered: overview.lastIssue.delivered,
                          },
                          { defaultValue: '{{opened}} of {{delivered}} delivered' },
                        )
                      : t('dashboard.noIssuesYet', {}, { defaultValue: 'No issues published yet' })
                  }
                  dataMolId="dashboard-kpi-open-rate"
                />
                <KpiCard
                  label={t('dashboard.publishedIssues', {}, { defaultValue: 'Published issues' })}
                  value={overview.issueCounts.published.toLocaleString()}
                  hint={t(
                    'dashboard.draftsAndScheduled',
                    {
                      drafts: overview.issueCounts.draft,
                      scheduled: overview.issueCounts.scheduled,
                    },
                    { defaultValue: '{{drafts}} drafts · {{scheduled}} scheduled' },
                  )}
                  dataMolId="dashboard-kpi-issues"
                />
                <KpiCard
                  label={t('dashboard.allTimeOpenRate', {}, { defaultValue: 'All-time open rate' })}
                  value={`${overview.totals.open_rate}%`}
                  hint={t(
                    'dashboard.clickRate',
                    { rate: overview.totals.click_rate },
                    { defaultValue: '{{rate}}% click rate' },
                  )}
                  dataMolId="dashboard-kpi-all-time"
                />
              </div>

              {/* Growth trend + last issue detail */}
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  'gap-10 lg:flex-row lg:items-start',
                )}
              >
                <section
                  data-mol-id="dashboard-growth"
                  className={cm.cn(
                    cm.sp('p', 8),
                    'rounded-xl bg-surface-container-lowest lg:flex-1 w-full',
                  )}
                >
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {t(
                      'dashboard.subscriberGrowth',
                      {},
                      { defaultValue: 'Subscribers, last 30 days' },
                    )}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mb', 6), 'text-on-surface-variant')}
                  >
                    {t(
                      'dashboard.growthHint',
                      {},
                      { defaultValue: 'Cumulative signups per day, all sources.' },
                    )}
                  </p>
                  <div
                    className={cm.cn(cm.flex({ align: 'end', gap: 'sm' }), cm.h(40))}
                    role="img"
                    aria-label={t(
                      'dashboard.subscriberGrowth',
                      {},
                      { defaultValue: 'Subscribers, last 30 days' },
                    )}
                  >
                    {growth.map((point) => (
                      <div
                        key={point.date}
                        title={`${point.date}: ${point.total}`}
                        className={cm.cn(
                          cm.flex1,
                          'rounded-t bg-primary/70 hover:bg-primary transition-all',
                        )}
                        style={{ height: `${Math.max(4, (point.total / maxGrowth) * 100)}%` }}
                      />
                    ))}
                  </div>
                  <div className={cm.cn(cm.flex({ justify: 'between' }), cm.sp('mt', 2))}>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {growth[0]?.date ?? ''}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {growth[growth.length - 1]?.date ?? ''}
                    </span>
                  </div>
                </section>

                <section
                  data-mol-id="dashboard-last-issue"
                  className={cm.cn(
                    cm.sp('p', 8),
                    'rounded-xl bg-surface-container-lowest lg:w-[380px] w-full',
                  )}
                >
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {t('dashboard.lastIssue', {}, { defaultValue: 'Last issue' })}
                  </h3>
                  {overview.lastIssue ? (
                    <div className={cm.stack(4)}>
                      <SafeLink
                        to={`/issues/${overview.lastIssue.id}/detail`}
                        className={cm.cn(
                          cm.textSize('base'),
                          cm.fontWeight('semibold'),
                          "font-['Newsreader'] text-primary hover:underline",
                        )}
                      >
                        {overview.lastIssue.subject}
                      </SafeLink>
                      <dl className={cm.stack(2)}>
                        <StatRow
                          label={t('dashboard.delivered', {}, { defaultValue: 'Delivered' })}
                          value={overview.lastIssue.delivered.toLocaleString()}
                        />
                        <StatRow
                          label={t('dashboard.opened', {}, { defaultValue: 'Opened' })}
                          value={overview.lastIssue.opened.toLocaleString()}
                        />
                        <StatRow
                          label={t('dashboard.clicked', {}, { defaultValue: 'Clicked' })}
                          value={overview.lastIssue.clicked.toLocaleString()}
                        />
                      </dl>
                    </div>
                  ) : (
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        'dashboard.publishFirst',
                        {},
                        { defaultValue: 'Publish your first issue to see delivery stats here.' },
                      )}
                    </p>
                  )}
                </section>
              </div>

              {/* Quick actions */}
              <section
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  'md:flex-row md:items-center md:gap-4',
                )}
              >
                <SafeLink
                  to="/issues/new"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'bg-primary text-on-primary hover:bg-primary-container transition-all',
                  )}
                >
                  {t('dashboard.writeIssue', {}, { defaultValue: 'Write an issue' })}
                </SafeLink>
                <SafeLink
                  to="/subscribers"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'bg-surface-container text-on-surface hover:bg-surface-container-high transition-all',
                  )}
                >
                  {t('dashboard.manageSubscribers', {}, { defaultValue: 'Manage subscribers' })}
                </SafeLink>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </>
  )
}

function KpiCard({
  label,
  value,
  hint,
  dataMolId,
}: {
  label: string
  value: string
  hint: string
  dataMolId: string
}) {
  const cm = getClassMap()
  return (
    <div
      data-mol-id={dataMolId}
      className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface-container-lowest')}
    >
      <p className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-on-surface-variant')}>
        {label}
      </p>
      <p className={cm.cn(cm.textSize('3xl'), "font-black font-['Newsreader'] text-on-surface")}>
        {value}
      </p>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{hint}</p>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('sm'))}>
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>{value}</dd>
    </div>
  )
}

export default Dashboard
export { Dashboard, Dashboard as DashboardPage }
