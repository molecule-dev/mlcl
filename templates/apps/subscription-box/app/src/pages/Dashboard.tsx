import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import {
  type ApiBillingStatus,
  type ApiBox,
  type ApiPlan,
  type ApiSubscription,
  centsToLabel,
  daysUntil,
  formatDate,
  unwrapList,
  unwrapSingle,
} from '../lib/api.js'

interface DashboardData {
  status: ApiBillingStatus | null
  subscription: ApiSubscription | null
  upcomingBox: ApiBox | null
  plans: ApiPlan[]
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth()
  const http = useHttpClient()
  const [data, setData] = useState<DashboardData>({
    status: null,
    subscription: null,
    upcomingBox: null,
    plans: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http
        .get('/api/billing/status')
        .then(unwrapSingle<ApiBillingStatus>)
        .catch(() => null),
      http
        .get('/api/subscriptions/mine')
        .then(unwrapSingle<ApiSubscription>)
        .catch(() => null),
      http
        .get('/api/boxes/mine/upcoming')
        .then(unwrapSingle<ApiBox>)
        .catch(() => null),
      http
        .get('/api/plans')
        .then(unwrapList<ApiPlan>)
        .catch(() => []),
    ])
      .then(([status, subscription, upcomingBox, plans]) => {
        if (!cancelled) setData({ status, subscription, upcomingBox, plans })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const firstName =
    typeof user === 'object' && user && 'name' in user
      ? String((user as { name?: string }).name ?? '').split(' ')[0] || 'curator'
      : 'curator'

  const subscription = data.subscription
  const plan = subscription?.plan
  const box = data.upcomingBox

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('py', 8))}
      data-testid="dashboard"
    >
      <div
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
            {t('dashboard.eyebrow', { appName: APP_NAME }, { defaultValue: 'Your {{appName}}' })}
          </span>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface')}
          >
            {t(
              'dashboard.greeting',
              { name: firstName },
              { defaultValue: 'Welcome back, {{name}}.' },
            )}
          </h1>
          <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
            {subscription
              ? t(
                  'dashboard.subtitle.active',
                  {},
                  { defaultValue: 'Your next edition is on its way. Here is what to expect.' },
                )
              : t(
                  'dashboard.subtitle.idle',
                  { appName: APP_NAME },
                  { defaultValue: 'Pick a tier to start shipping a {{appName}} every month.' },
                )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          {subscription ? (
            <>
              <Link
                to="/customize"
                data-testid="dashboard-customize"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'text-sm border-2 border-on-surface text-on-surface hover:bg-on-surface hover:text-surface transition-all',
                )}
              >
                {t('dashboard.cta.customize', {}, { defaultValue: 'Customize this box' })}
              </Link>
              <Link
                to="/shipments"
                data-testid="dashboard-track"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'text-sm bg-primary text-on-primary hover:bg-primary-hover transition-all',
                )}
              >
                {t('dashboard.cta.track', {}, { defaultValue: 'Track shipment' })}
              </Link>
            </>
          ) : (
            <Link
              to="/boxes"
              data-testid="dashboard-choose"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'text-sm bg-primary text-on-primary hover:bg-primary-hover transition-all',
              )}
            >
              {t('dashboard.cta.choose', {}, { defaultValue: 'Choose a tier' })}
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div
          className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}
          data-testid="dashboard-loading"
        >
          {t('dashboard.loading', {}, { defaultValue: 'Loading dashboard…' })}
        </div>
      ) : subscription && plan ? (
        <ActiveSubscriptionView
          subscription={subscription}
          plan={plan}
          box={box}
          status={data.status}
        />
      ) : (
        <NoSubscriptionView plans={data.plans} />
      )}
    </div>
  )
}

function ActiveSubscriptionView({
  subscription,
  plan,
  box,
  status,
}: {
  subscription: ApiSubscription
  plan: ApiPlan
  box: ApiBox | null
  status: ApiBillingStatus | null
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const days = daysUntil(box?.scheduled_for ?? subscription.next_billing_date)
  const renewLabel = formatDate(subscription.next_billing_date)

  return (
    <div
      className={cm.cn(cm.grid({ gap: 'lg' }), 'lg:grid-cols-12')}
      data-testid="dashboard-active"
    >
      <article
        className={cm.cn(
          'lg:col-span-8 rounded-3xl overflow-hidden bg-gradient-to-br from-primary to-primary-container text-on-primary relative',
          cm.sp('p', 8),
        )}
      >
        <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-primary/80')}>
          {t('dashboard.next.eyebrow', {}, { defaultValue: 'Your next edition' })}
        </span>
        <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}>{plan.name}</h2>
        <p className={cm.cn('text-base text-on-primary/90 max-w-2xl')}>{plan.description}</p>
        <div className={cm.cn(cm.flex({ gap: 'md', wrap: 'wrap' }), cm.sp('mt', 4))}>
          <Stat
            label={t('dashboard.stats.daysToNext', {}, { defaultValue: 'Ships in' })}
            value={String(days)}
            suffix={t('dashboard.stats.days', {}, { defaultValue: 'days' })}
          />
          <Stat
            label={t('dashboard.stats.shipDate', {}, { defaultValue: 'Ship date' })}
            value={
              formatDate(box?.scheduled_for) ||
              t('dashboard.stats.tbd', {}, { defaultValue: 'TBD' })
            }
          />
          <Stat
            label={t('dashboard.stats.items', {}, { defaultValue: 'Curated items' })}
            value={String(plan.included_items.length)}
          />
        </div>
        <div
          className={cm.cn(
            'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/15 blur-3xl pointer-events-none',
          )}
        />
      </article>

      <aside
        className={cm.cn(
          'lg:col-span-4 rounded-3xl bg-surface-container-lowest border border-outline-variant/30',
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 8),
        )}
      >
        <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('dashboard.renewal.eyebrow', {}, { defaultValue: 'Renewal' })}
        </span>
        <h3 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
          {renewLabel
            ? t(
                'dashboard.renewal.heading',
                { date: renewLabel },
                { defaultValue: 'Auto-renews on {{date}}' },
              )
            : t('dashboard.renewal.tbd', {}, { defaultValue: 'Renewal scheduling shortly' })}
        </h3>
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'text-sm')}>
          <li className={cm.cn(cm.flex({ justify: 'between' }))}>
            <span className={cm.cn('text-on-surface-variant')}>
              {t('dashboard.renewal.tier', {}, { defaultValue: 'Tier' })}
            </span>
            <span className={cm.cn('font-bold text-on-surface')}>{plan.name}</span>
          </li>
          <li className={cm.cn(cm.flex({ justify: 'between' }))}>
            <span className={cm.cn('text-on-surface-variant')}>
              {t('dashboard.renewal.cadence', {}, { defaultValue: 'Cadence' })}
            </span>
            <span
              className={cm.cn('font-bold text-on-surface')}
            >{`Every ${plan.interval_count} ${plan.interval}`}</span>
          </li>
          <li className={cm.cn(cm.flex({ justify: 'between' }))}>
            <span className={cm.cn('text-on-surface-variant')}>
              {t('dashboard.renewal.amount', {}, { defaultValue: 'Charged' })}
            </span>
            <span className={cm.cn('font-bold text-primary')}>
              {centsToLabel(plan.price, plan.currency)}
            </span>
          </li>
          {status && (
            <li className={cm.cn(cm.flex({ justify: 'between' }))}>
              <span className={cm.cn('text-on-surface-variant')}>
                {t('dashboard.renewal.plan', {}, { defaultValue: 'Plan key' })}
              </span>
              <span className={cm.cn('font-bold text-on-surface')}>{status.name}</span>
            </li>
          )}
        </ul>
        <Link
          to="/billing"
          data-testid="dashboard-billing"
          className={cm.cn(
            cm.sp('py', 3),
            cm.sp('px', 5),
            cm.fontWeight('bold'),
            cm.roundedFull,
            cm.sp('mt', 2),
            'text-sm text-center bg-on-surface text-surface hover:bg-on-surface/90 transition-all',
          )}
        >
          {t('dashboard.renewal.cta', {}, { defaultValue: 'Manage billing' })}
        </Link>
      </aside>
    </div>
  )
}

function NoSubscriptionView({ plans }: { plans: ApiPlan[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 10),
        'rounded-3xl bg-surface-container-lowest border border-outline-variant/30',
      )}
      data-testid="dashboard-onboarding"
    >
      <div>
        <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('common.getStarted', {}, { defaultValue: 'Get started' })}
        </span>
        <h2 className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface')}>
          {t('dashboard.onboarding.heading', {}, { defaultValue: 'Pick your first edition' })}
        </h2>
        <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
          {t(
            'dashboard.onboarding.body',
            { appName: APP_NAME },
            {
              defaultValue:
                'You do not have an active subscription yet. Choose a tier to start shipping a {{appName}} every month.',
            },
          )}
        </p>
      </div>
      {plans.length === 0 ? (
        <p className={cm.textMuted}>
          {t(
            'dashboard.onboarding.empty',
            {},
            { defaultValue: 'No plans available right now. Check back soon.' },
          )}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
          {plans.map((p) => (
            <Link
              key={p.id}
              to={`/boxes/${p.id}`}
              data-testid={`dashboard-plan-${p.slug ?? p.id}`}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('p', 6),
                'rounded-2xl bg-surface-container-low border border-outline-variant/30 hover:border-primary transition-all',
              )}
            >
              <h3 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
                {p.name}
              </h3>
              <p className={cm.cn('text-sm text-on-surface-variant line-clamp-2')}>
                {p.description}
              </p>
              <span className={cm.cn('text-2xl font-extrabold text-primary tabular-nums')}>
                {centsToLabel(p.price, p.currency)}
                <span
                  className={cm.cn(
                    'text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                  )}
                >
                  {`/ ${p.interval}`}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
      <Link
        to="/boxes"
        data-testid="dashboard-onboarding-browse"
        className={cm.cn(
          cm.sp('py', 3),
          cm.sp('px', 5),
          cm.fontWeight('bold'),
          cm.roundedFull,
          'self-start text-sm bg-primary text-on-primary hover:bg-primary-hover transition-all',
        )}
      >
        {t('dashboard.onboarding.cta', {}, { defaultValue: 'Browse all editions' })}
      </Link>
    </section>
  )
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }))}>
      <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-primary/80')}>
        {label}
      </span>
      <span className={cm.cn('text-3xl font-extrabold tabular-nums text-on-primary')}>
        {value}
        {suffix && (
          <span
            className={cm.cn('text-sm font-bold uppercase tracking-widest text-on-primary/80 ml-1')}
          >
            {suffix}
          </span>
        )}
      </span>
    </div>
  )
}

export default Dashboard
