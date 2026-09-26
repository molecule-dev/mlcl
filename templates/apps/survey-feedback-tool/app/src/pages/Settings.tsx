import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { StatusPill } from '../components/StatusPill.js'

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
}

interface PriceOption {
  period: string
  price: string
  stripePriceId: string | null
}

interface TierOption {
  key: string
  name: string
  prices: PriceOption[]
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 4 }),
        cm.sp('p', 6),
        'rounded-xl bg-surface border border-[color:var(--color-border)]',
      )}
    >
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
        <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
          {title}
        </h2>
        {description && (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [tiers, setTiers] = useState<TierOption[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyPriceId, setBusyPriceId] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  async function refreshStatus(signal?: AbortSignal) {
    try {
      const response = await http.get<BillingStatus>('/api/billing/status')
      if (signal?.aborted) return
      if (response?.data) setStatus(response.data)
    } catch (_error) {
      // Status fetch failed — aborted requests and transient errors are both acceptable here
      if (signal?.aborted) return
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    Promise.allSettled([
      http.get<BillingStatus>('/api/billing/status'),
      http.get<{ data?: TierOption[] }>('/api/billing/tiers'),
    ]).then(([statusResult, tiersResult]) => {
      if (controller.signal.aborted) return
      if (statusResult.status === 'fulfilled' && statusResult.value?.data) {
        setStatus(statusResult.value.data)
      }
      if (tiersResult.status === 'fulfilled' && tiersResult.value?.data?.data) {
        setTiers(tiersResult.value.data.data)
      } else {
        setTiers([])
      }
    })
    return () => controller.abort()
  }, [http])

  async function startCheckout(priceId: string) {
    setBusyPriceId(priceId)
    setError(null)
    setInfo(null)
    try {
      const response = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/api/billing/checkout',
        { priceId },
      )
      const data = response?.data
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      if (data?.updated) {
        setInfo(t('nav.subscriptionUpdated', {}, { defaultValue: 'Subscription updated.' }))
        await refreshStatus()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.')
    } finally {
      setBusyPriceId(null)
    }
  }

  async function cancelSubscription() {
    setCanceling(true)
    setError(null)
    setInfo(null)
    try {
      await http.post('/api/billing/cancel')
      setInfo(t('settings.billing.canceled', {}, { defaultValue: 'Subscription canceled.' }))
      await refreshStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel subscription.')
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), cm.maxW('5xl'), cm.mxAuto, cm.w('full'))}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </span>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('settings.subheading', {}, { defaultValue: 'Manage your subscription and billing.' })}
        </p>
        {error && (
          <p role="alert" className="text-[color:var(--color-on-error)] text-sm">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="text-[color:var(--color-on-success)] text-sm">
            {info}
          </p>
        )}
      </div>

      <Section
        title={t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}
        description={t(
          'settings.billing.description',
          {},
          { defaultValue: 'Pick the plan that fits how you work.' },
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 4 }),
            cm.sp('p', 5),
            'rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-md flex-wrap',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-white/80',
              )}
            >
              {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
            </span>
            <span
              data-testid="current-plan-name"
              className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}
            >
              {status?.name ?? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-white/85')}>
              {status?.isFree
                ? t('settings.billing.freeNote', {}, { defaultValue: 'You are on the Free plan.' })
                : t(
                    'settings.billing.paidNote',
                    { plan: status?.name ?? '' },
                    { defaultValue: 'Active subscription: {{plan}}' },
                  )}
            </span>
          </div>
          {!status?.isFree && (
            <button
              type="button"
              data-testid="cancel-subscription"
              onClick={cancelSubscription}
              disabled={canceling}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-md bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors disabled:opacity-60',
              )}
            >
              {canceling
                ? t('settings.billing.canceling', {}, { defaultValue: 'Canceling…' })
                : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
            </button>
          )}
        </div>

        {tiers === null ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('nav.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
          </p>
        ) : tiers.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('settings.billing.noTiers', {}, { defaultValue: 'No plans configured.' })}
          </p>
        ) : (
          <ul
            data-testid="plan-options"
            className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-3')}
          >
            {tiers.map((tier) => {
              const monthly = tier.prices.find((p) => p.period === 'month')
              const yearly = tier.prices.find((p) => p.period === 'year')
              const isCurrent = status?.category === tier.key
              return (
                <li
                  key={tier.key}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 3 }),
                    cm.sp('p', 5),
                    'rounded-xl bg-surface border border-[color:var(--color-border)]',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <h3
                      className={cm.cn(
                        cm.textSize('lg'),
                        'font-extrabold tracking-tight text-on-surface',
                      )}
                    >
                      {tier.name}
                    </h3>
                    {isCurrent && (
                      <StatusPill
                        variant="active"
                        label={t('nav.current', {}, { defaultValue: 'Current' })}
                      />
                    )}
                  </div>
                  {monthly && (
                    <p
                      className={cm.cn(
                        cm.textSize('xl'),
                        'font-extrabold tracking-tight text-primary',
                      )}
                    >
                      {monthly.price}
                    </p>
                  )}
                  {monthly?.stripePriceId && (
                    <button
                      type="button"
                      data-testid={`subscribe-${tier.key}-monthly`}
                      onClick={() => monthly.stripePriceId && startCheckout(monthly.stripePriceId)}
                      disabled={busyPriceId === monthly.stripePriceId}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.fontWeight('bold'),
                        cm.textSize('sm'),
                        'rounded-md bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-60',
                      )}
                    >
                      {busyPriceId === monthly.stripePriceId
                        ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
                        : t(
                            'settings.billing.subscribeMonthly',
                            {},
                            { defaultValue: 'Subscribe monthly' },
                          )}
                    </button>
                  )}
                  {yearly?.stripePriceId && (
                    <button
                      type="button"
                      data-testid={`subscribe-${tier.key}-yearly`}
                      onClick={() => yearly.stripePriceId && startCheckout(yearly.stripePriceId)}
                      disabled={busyPriceId === yearly.stripePriceId}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'rounded-md border border-[color:var(--color-border)] text-on-surface hover:bg-surface-secondary transition-colors disabled:opacity-60',
                      )}
                    >
                      {t(
                        'settings.billing.subscribeYearly',
                        { price: yearly.price },
                        { defaultValue: 'Yearly · {{price}}' },
                      )}
                    </button>
                  )}
                  {!monthly?.stripePriceId && !yearly?.stripePriceId && tier.key !== 'free' && (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'settings.billing.notConfigured',
                        {},
                        { defaultValue: 'Stripe price IDs not configured for this tier.' },
                      )}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section
        title={t('footer.language', {}, { defaultValue: 'Language' })}
        description={t(
          'common.chooseTheLanguage',
          {},
          { defaultValue: 'Choose the language used throughout the app.' },
        )}
      >
        <LanguagePicker />
      </Section>
      <Section
        title={t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        description={t(
          'common.toggleLightDark',
          {},
          { defaultValue: 'Toggle between light and dark mode.' },
        )}
      >
        <ThemeToggle />
      </Section>
    </div>
  )
}

export default Settings
