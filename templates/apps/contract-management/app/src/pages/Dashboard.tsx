import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type ContractStatus, ContractStatusPill } from '../components/ContractStatusPill.js'
import { VellumContractRow } from '../components/VellumContractRow.js'
import { VellumKpiCard } from '../components/VellumKpiCard.js'
import { VellumPortfolioHero } from '../components/VellumPortfolioHero.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface DashboardStats {
  total_contracts: number
  pending_signature: number
  active: number
  expiring_30d: number
  total_value_cents: number
  cycle_time_days: number
}

interface ExpiringContract {
  id: string
  title: string
  counterparty: string
  expires_at: string
  amount_cents: number
}

interface ActivityNotification {
  id: string
  type:
    'sent' | 'viewed' | 'signed' | 'declined' | 'voided' | 'expiring' | 'mention' | 'system_message'
  title: string
  body?: string
  href?: string
  contract_id?: string
  contract_title?: string
  actor: string
  created_at: string
  unread?: boolean
}

interface ThroughputPoint {
  month: string
  sent: number
  signed: number
}

interface ReportsFull {
  throughput_history: ThroughputPoint[]
}

const ACTIVITY_ICON: Record<ActivityNotification['type'], string> = {
  sent: 'send',
  viewed: 'visibility',
  signed: 'verified',
  declined: 'block',
  voided: 'cancel',
  expiring: 'schedule',
  mention: 'alternate_email',
  system_message: 'info',
}

const ACTIVITY_TONE: Record<ActivityNotification['type'], string> = {
  sent: 'bg-info/15 text-info',
  viewed: 'bg-surface-container text-on-surface-variant',
  signed: 'bg-success/15 text-success',
  declined: 'bg-error/15 text-error',
  voided: 'bg-error/10 text-error/80',
  expiring: 'bg-warning/15 text-warning',
  mention: 'bg-tertiary/15 text-tertiary',
  system_message: 'bg-surface-container text-on-surface-variant',
}

type TranslateFn = ReturnType<typeof useTranslation>['t']

function fmtRelative(iso: string, t: TranslateFn): string {
  const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('dashboard.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24)
    return t('dashboard.hoursAgo', { count: diffH }, { defaultValue: '{{count}}h ago' })
  return t(
    'dashboard.daysAgo',
    { count: Math.floor(diffH / 24) },
    { defaultValue: '{{count}}d ago' },
  )
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [expiring, setExpiring] = useState<ExpiringContract[]>([])
  const [activity, setActivity] = useState<ActivityNotification[]>([])
  const [throughput, setThroughput] = useState<ThroughputPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/reports/dashboard_stats'),
      http.get('/api/reports/expiring_soon').catch(() => null),
      http.get('/api/notifications').catch(() => null),
      http.get('/api/reports/full').catch(() => null),
    ])
      .then(([sRes, eRes, aRes, fRes]) => {
        if (cancelled) return
        const parsed = unwrapSingle<DashboardStats>(sRes)
        setStats(
          parsed ?? {
            total_contracts: 0,
            pending_signature: 0,
            active: 0,
            expiring_30d: 0,
            total_value_cents: 0,
            cycle_time_days: 0,
          },
        )
        setExpiring(unwrapList<ExpiringContract>(eRes))
        setActivity(unwrapList<ActivityNotification>(aRes).slice(0, 6))
        const full = unwrapSingle<ReportsFull>(fRes)
        if (full?.throughput_history) setThroughput(full.throughput_history)
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('nav.failedToLoadDashboard', {}, { defaultValue: 'Failed to load dashboard.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('dashboard.loading', {}, { defaultValue: 'Loading\u2026' })}
      </div>
    )
  if (error)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')} role="alert">
        {error}
      </div>
    )
  if (!stats) return null

  const trend = throughput.map((p) => p.signed)
  const sentTrend = throughput.map((p) => p.sent)
  const cycleTime = stats.cycle_time_days

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-[var(--mol-color-secondary)]',
            )}
          >
            {t(
              'dashboard.eyebrow',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} portfolio' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('3xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight',
            )}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </h1>
        </div>
        <Link
          to="/contracts/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('extrabold'),
            'rounded-full bg-gradient-to-br from-sidebar-bg to-[var(--mol-color-primary)] text-white shadow-md transition-transform hover:-translate-y-0.5',
          )}
        >
          {t('dashboard.newCta', {}, { defaultValue: 'New contract' })}
        </Link>
      </header>

      <VellumPortfolioHero
        totalValueCents={stats.total_value_cents}
        activeCount={stats.active}
        pendingCount={stats.pending_signature}
        expiringCount={stats.expiring_30d}
        trend={trend.length > 0 ? trend : undefined}
      />

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <VellumKpiCard
          tone="primary"
          label={t('dashboard.kpi.total', {}, { defaultValue: 'Total contracts' })}
          value={stats.total_contracts}
          hint={t('dashboard.kpi.totalHint', {}, { defaultValue: 'All statuses, all time' })}
          trend={sentTrend.length > 0 ? sentTrend : undefined}
        />
        <VellumKpiCard
          tone="warning"
          label={t('dashboard.kpi.pending', {}, { defaultValue: 'Pending signature' })}
          value={stats.pending_signature}
          hint={t('dashboard.kpi.pendingHint', {}, { defaultValue: 'Awaiting counterparty' })}
        />
        <VellumKpiCard
          tone="success"
          label={t('status.active', {}, { defaultValue: 'Active' })}
          value={stats.active}
          hint={t('dashboard.kpi.activeHint', {}, { defaultValue: 'Currently in force' })}
          trend={trend.length > 0 ? trend : undefined}
        />
        <VellumKpiCard
          tone="error"
          label={t('dashboard.kpi.cycle', {}, { defaultValue: 'Cycle time' })}
          value={`${cycleTime}d`}
          hint={t('dashboard.kpi.cycleHint', {}, { defaultValue: 'Send \u2192 fully signed avg' })}
        />
      </section>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section
          className={cm.cn(
            'col-span-12 lg:col-span-7',
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant shadow-sm',
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.expiringHeading', {}, { defaultValue: 'Expiring soon' })}
            </h2>
            <Link
              to="/contracts"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                // Tap-target floor: bare text link measured 16px tall.
                'inline-flex items-center py-2 text-primary hover:underline',
              )}
            >
              {t('dashboard.viewAll', {}, { defaultValue: 'View all \u2192' })}
            </Link>
          </div>
          {expiring.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('mt', 6),
                cm.sp('py', 8),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'dashboard.noExpiring',
                {},
                { defaultValue: 'Nothing expires in the next 30 days.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn(cm.sp('mt', 4), 'space-y-3')}>
              {expiring.map((c) => (
                <li key={c.id}>
                  <VellumContractRow
                    id={c.id}
                    title={c.title}
                    counterparty={c.counterparty}
                    status={'expiring' satisfies ContractStatus}
                    amountCents={c.amount_cents}
                    expiresAt={c.expires_at}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className={cm.cn(
            'col-span-12 lg:col-span-5',
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant shadow-sm',
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
            </h2>
            <Link
              to="/notifications"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'inline-flex items-center py-2 text-primary hover:underline',
              )}
            >
              {t('dashboard.viewFeed', {}, { defaultValue: 'Open feed \u2192' })}
            </Link>
          </div>
          {activity.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('mt', 6),
                cm.sp('py', 8),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('dashboard.noActivity', {}, { defaultValue: 'No recent activity.' })}
            </p>
          ) : (
            <ol className={cm.cn(cm.sp('mt', 4), 'space-y-3')}>
              {activity.map((ev) => (
                <li
                  key={ev.id}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'sm' }),
                    cm.sp('py', 2),
                    cm.sp('px', 2),
                    '-mx-2 rounded-xl hover:bg-surface-container',
                  )}
                >
                  <span
                    className={cm.cn(
                      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      ACTIVITY_TONE[ev.type],
                    )}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '1.125rem' }}
                      aria-hidden="true"
                    >
                      {ACTIVITY_ICON[ev.type]}
                    </span>
                  </span>
                  <div className={'min-w-0 flex-1'}>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}>
                      {ev.contract_id ? (
                        <Link
                          to={ev.href ?? `/contracts/${ev.contract_id}`}
                          className={'hover:underline'}
                        >
                          {ev.title}
                        </Link>
                      ) : (
                        ev.title
                      )}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {ev.actor} · {fmtRelative(ev.created_at, t)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant shadow-sm',
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('dashboard.statusLegend', {}, { defaultValue: 'Status legend' })}
          </h2>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'dashboard.statusLegendHint',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} contract taxonomy' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.sp('mt', 4), cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
          {(
            ['draft', 'pending', 'active', 'expiring', 'expired', 'voided'] as ContractStatus[]
          ).map((s) => (
            <ContractStatusPill key={s} status={s} size="md" />
          ))}
        </div>
      </section>
    </div>
  )
}
