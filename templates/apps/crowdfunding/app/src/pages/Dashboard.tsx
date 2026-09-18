import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CampaignCard } from '../components/CampaignCard.js'
import { KpiStatCard } from '../components/KpiStatCard.js'
import { api, type ApiCampaign, type ApiNotification, toCardData } from '../lib/api.js'

const ACTIVITY_TINT: Record<ApiNotification['kind'], string> = {
  pledge_received: 'bg-primary/10 text-primary',
  pledge_made: 'bg-tertiary/10 text-tertiary',
  campaign_funded: 'bg-accent/10 text-accent',
  campaign_update: 'bg-warning/10 text-warning',
}
const ACTIVITY_ICON: Record<ApiNotification['kind'], string> = {
  pledge_received: 'volunteer_activism',
  pledge_made: 'favorite',
  campaign_funded: 'flag',
  campaign_update: 'campaign',
}

function relTime(iso: string, t: ReturnType<typeof useTranslation>['t']): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return ''
  const diff = Date.now() - ts
  if (diff < 60_000) return t('common.justNow', {}, { defaultValue: 'just now' })
  const m = Math.round(diff / 60000)
  if (m < 60) return t('common.minutesAgo', { count: m }, { defaultValue: '{{count}}m ago' })
  const h = Math.round(m / 60)
  if (h < 24) return t('common.hoursAgo', { count: h }, { defaultValue: '{{count}}h ago' })
  const d = Math.round(h / 24)
  return t('common.daysAgo', { count: d }, { defaultValue: '{{count}}d ago' })
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [myCampaigns, setMyCampaigns] = useState<ApiCampaign[]>([])
  const [activity, setActivity] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const [campaigns, notif] = await Promise.all([
          api.myCampaigns(http),
          api.listNotifications(http),
        ])
        if (alive) {
          setMyCampaigns(campaigns)
          setActivity(notif.notifications.slice(0, 6))
        }
      } catch (err) {
        if (alive)
          setError(
            err instanceof Error
              ? err.message
              : t('dashboard.loadError', {}, { defaultValue: 'Failed to load dashboard' }),
          )
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [http, t])

  const totalRaised = myCampaigns.reduce((sum, c) => sum + c.pledged_cents, 0)
  const activeCount = myCampaigns.filter((c) => c.status === 'active').length
  const fundedCount = myCampaigns.filter((c) => c.status === 'funded').length
  const totalBackers = myCampaigns.reduce((sum, c) => sum + c.backer_count, 0)
  const fmt = (c: number) => `$${Math.round(c / 100).toLocaleString()}`

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.w('full'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.stack(8),
      )}
      data-mol-id="page-dashboard"
    >
      <header
        className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('dashboard.eyebrow', {}, { defaultValue: 'Creator overview' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 2),
              'tracking-tight',
            )}
          >
            {t('dashboard.heading', {}, { defaultValue: 'Welcome back, creator' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              {},
              { defaultValue: 'Pulse on every campaign — funding, momentum, conversations.' },
            )}
          </p>
        </div>
        <Link
          to="/campaign/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-lg bg-primary text-white shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2 transition-all',
          )}
          data-mol-id="dashboard-new-campaign"
        >
          <span
            className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
            aria-hidden="true"
          >
            add_circle
          </span>
          {t('dashboard.newCampaign', {}, { defaultValue: 'New campaign' })}
        </Link>
      </header>

      {error ? (
        <div className={cm.cn(cm.textSize('sm'), 'text-error')} data-mol-id="dashboard-error">
          {error}
        </div>
      ) : null}

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
        data-mol-id="dashboard-kpis"
      >
        <KpiStatCard
          label={t('dashboard.kpi.totalRaised', {}, { defaultValue: 'Total raised' })}
          value={fmt(totalRaised)}
          icon="payments"
          accent="primary"
        />
        <KpiStatCard
          label={t('dashboard.kpi.activeBackers', {}, { defaultValue: 'Total backers' })}
          value={String(totalBackers)}
          icon="group"
          accent="accent"
        />
        <KpiStatCard
          label={t('dashboard.kpi.activeCampaigns', {}, { defaultValue: 'Active campaigns' })}
          value={String(activeCount)}
          icon="rocket_launch"
          accent="tertiary"
        />
        <KpiStatCard
          label={t('dashboard.kpi.fundedCampaigns', {}, { defaultValue: 'Funded campaigns' })}
          value={String(fundedCount)}
          icon="trending_up"
          accent="warning"
        />
      </section>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3 items-start')}>
        <div className={cm.cn('lg:col-span-2', cm.stack(4))} data-mol-id="dashboard-my-campaigns">
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {t('dashboard.active.title', {}, { defaultValue: 'My campaigns' })}
            </h2>
            <Link
              to="/discover"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
            >
              {t('dashboard.active.viewAll', {}, { defaultValue: 'Discover more' })}
            </Link>
          </div>
          {loading ? (
            <p className={cm.textSize('sm')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : myCampaigns.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.textCenter,
                'rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest',
              )}
              data-mol-id="dashboard-no-campaigns"
            >
              <p className={cm.cn(cm.fontWeight('semibold'))}>
                {t(
                  'dashboard.noCampaigns.title',
                  {},
                  { defaultValue: "You haven't started a campaign yet" },
                )}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                {t(
                  'dashboard.noCampaigns.body',
                  {},
                  { defaultValue: 'Launch your first campaign to start seeing pledges roll in.' },
                )}
              </p>
              <Link
                to="/campaign/new"
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  'inline-block rounded-lg bg-primary text-white text-sm font-bold',
                )}
              >
                {t('dashboard.noCampaigns.cta', {}, { defaultValue: 'Create campaign' })}
              </Link>
            </div>
          ) : (
            <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
              {myCampaigns.map((c) => (
                <Link
                  key={c.id}
                  to={`/campaign/${c.id}/manage`}
                  data-mol-id={`dashboard-card-${c.id}`}
                >
                  <CampaignCard campaign={toCardData(c)} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm',
          )}
          data-mol-id="dashboard-activity"
        >
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
            </h2>
            <Link
              to="/notifications"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
            >
              {t('dashboard.activity.viewAll', {}, { defaultValue: 'All →' })}
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'dashboard.activity.empty',
                {},
                { defaultValue: 'No recent activity yet — pledges and updates will appear here.' },
              )}
            </p>
          ) : (
            <ul className={cm.stack(3)}>
              {activity.map((a) => (
                <li
                  key={a.id}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'sm' }),
                    cm.sp('p', 3),
                    'rounded-lg hover:bg-surface-container transition-colors',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.w(8),
                      cm.h(8),
                      cm.roundedFull,
                      cm.flex({ align: 'center', justify: 'center' }),
                      'shrink-0',
                      ACTIVITY_TINT[a.kind],
                    )}
                  >
                    <span
                      className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
                      aria-hidden="true"
                    >
                      {ACTIVITY_ICON[a.kind]}
                    </span>
                  </div>
                  <div className={cm.cn(cm.flex1, 'min-w-0')}>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface truncate',
                      )}
                    >
                      {a.title}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                      {a.body}
                    </p>
                  </div>
                  <div className={cm.cn(cm.flex({ direction: 'col', align: 'end' }), 'shrink-0')}>
                    {a.amount ? (
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-primary tabular-nums',
                        )}
                      >
                        ${a.amount.toLocaleString()}
                      </span>
                    ) : null}
                    <span className="text-[11px] text-on-surface-variant">
                      {relTime(a.created_at, t)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>
    </div>
  )
}

export default Dashboard
