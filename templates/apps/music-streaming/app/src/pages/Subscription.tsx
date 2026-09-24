import { useState } from 'react'

import {
  type PricingTierEntry,
  useBillingStatus,
  useCancelSubscription,
  usePricingTiers,
  useStartCheckout,
} from '@molecule/app-billing-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

/** Mirror of the API's `MusicStreamingLimits` (api/src/tiers.ts). */
interface MusicStreamingLimits {
  maxAlbums: number
  maxArtists: number
  maxPlaylists: number
  maxTracks: number
  advancedFeatures: boolean
  canExport: boolean
  retentionDays: number
}

const fmtLimit = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

export function Subscription() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const {
    data: tiersResponse,
    loading: tiersLoading,
    error: tiersError,
  } = usePricingTiers<MusicStreamingLimits>()
  const { data: billing, execute: refetchStatus } = useBillingStatus<MusicStreamingLimits>()
  const { start, loading: startingCheckout, error: startError } = useStartCheckout()
  const { cancel, error: cancelError } = useCancelSubscription()

  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const tiers = tiersResponse?.data ?? []
  const currentCategory = billing?.category ?? 'free'

  const tierPerks = (tier: PricingTierEntry<MusicStreamingLimits>): string[] => {
    const limits = tier.limits
    if (!limits) return []
    return [
      t(
        'subscription.limit.playlists',
        { count: fmtLimit(limits.maxPlaylists) },
        { defaultValue: '{{count}} playlists' },
      ),
      t(
        'subscription.limit.tracks',
        { count: fmtLimit(limits.maxTracks) },
        { defaultValue: '{{count}} tracks' },
      ),
      t(
        'subscription.limit.albums',
        { count: fmtLimit(limits.maxAlbums) },
        { defaultValue: '{{count}} albums' },
      ),
      t(
        'subscription.limit.artists',
        { count: fmtLimit(limits.maxArtists) },
        { defaultValue: '{{count}} artists' },
      ),
      limits.advancedFeatures
        ? t('subscription.limit.advanced', {}, { defaultValue: 'Advanced features' })
        : t('subscription.limit.basics', {}, { defaultValue: 'Core listening features' }),
      limits.canExport
        ? t('subscription.limit.export', {}, { defaultValue: 'Data export' })
        : t('subscription.limit.noExport', {}, { defaultValue: 'In-app library only' }),
      limits.retentionDays === 0
        ? t('subscription.limit.retentionUnlimited', {}, { defaultValue: 'Unlimited history' })
        : t(
            'subscription.limit.retention',
            { count: limits.retentionDays },
            { defaultValue: '{{count}} days of history' },
          ),
    ]
  }

  const handleUpgrade = async (priceId: string | null): Promise<void> => {
    setActionMessage(null)
    if (!priceId) {
      setActionMessage(
        t(
          'billing.error.priceUnavailable',
          {},
          { defaultValue: 'This plan is not configured for checkout in the current environment.' },
        ),
      )
      return
    }
    const response = await start(priceId)
    if (response?.checkoutUrl) {
      window.location.assign(response.checkoutUrl)
    } else if (response?.updated) {
      setActionMessage(t('subscription.updated', {}, { defaultValue: 'Subscription updated.' }))
      void refetchStatus()
    }
  }

  // Confirmation is handled inline by the two-step ConfirmButton
  // (arm → click again); this handler runs only on the confirming click.
  const handleCancel = async (): Promise<void> => {
    setActionMessage(null)
    const response = await cancel()
    if (response?.canceled) {
      setActionMessage(
        t(
          'billing.message.canceled',
          {},
          { defaultValue: 'Subscription will end at the close of the current period.' },
        ),
      )
      void refetchStatus()
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-12')}>
      <header className={cm.cn('space-y-2')}>
        <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('subscription.eyebrow', {}, { defaultValue: 'Plans & billing' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}>
          {t('subscription.heading', {}, { defaultValue: 'Choose how you listen' })}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
          {t(
            'subscription.subheading',
            {},
            {
              defaultValue: 'Switch tiers anytime. Cancel anytime. We’ll prorate the difference.',
            },
          )}
        </p>
      </header>

      {/* Current plan callout */}
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] text-white p-8 md:p-10 shadow-2xl shadow-primary/20',
        )}
        style={{
          background: 'linear-gradient(135deg, var(--color-tertiary) 0%, var(--color-accent) 100%)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center')}>
          <div className={cm.cn('md:col-span-2')}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
              {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
            </p>
            <h2
              data-testid="current-plan-name"
              className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mt-1')}
            >
              {billing?.name ?? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </h2>
            <p className={cm.cn('text-sm text-white/85 leading-relaxed max-w-xl mt-2')}>
              {billing
                ? billing.isFree
                  ? t(
                      'subscription.freeFooter',
                      {},
                      { defaultValue: 'You’re on the free tier. Upgrade for higher limits.' },
                    )
                  : t(
                      'subscription.paidFooter',
                      {},
                      { defaultValue: 'Your subscription is active.' },
                    )
                : ''}
            </p>
          </div>
          {billing && !billing.isFree && (
            <div className={cm.cn('flex flex-col gap-3 md:items-end')}>
              <ConfirmButton
                label={t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
                confirmLabel={t(
                  'billing.confirmCancel',
                  {},
                  { defaultValue: 'Cancel your subscription at the end of the current period?' },
                )}
                pendingLabel={t('subscription.canceling', {}, { defaultValue: 'Canceling…' })}
                onConfirm={handleCancel}
                disarmSeconds={6}
                data-testid="cancel-subscription"
                className="px-6 py-2.5 rounded-full text-sm font-bold bg-surface text-on-surface hover:bg-surface/90 transition-colors disabled:opacity-60"
              />
            </div>
          )}
        </div>
      </section>

      {(actionMessage || startError || cancelError) && (
        <p
          role="alert"
          data-testid="billing-action-message"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant',
          )}
        >
          {actionMessage ?? startError?.message ?? cancelError?.message ?? ''}
        </p>
      )}

      {/* Plan cards */}
      <section className={cm.cn('space-y-4')}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-3')}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('subscription.compareHeading', {}, { defaultValue: 'Compare plans' })}
          </h2>
          <div className={cm.flex({ gap: 'xs' })}>
            {(['month', 'year'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={cm.cn(
                  'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors',
                  period === p
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant hover:text-on-surface',
                )}
              >
                {p === 'month'
                  ? t('subscription.period.month', {}, { defaultValue: 'Monthly' })
                  : t('subscription.period.year', {}, { defaultValue: 'Yearly' })}
              </button>
            ))}
          </div>
        </div>

        {tiersLoading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('subscription.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
          </p>
        ) : tiersError ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
            {t(
              'billing.tiersError',
              {},
              { defaultValue: 'Could not load pricing. Try again later.' },
            )}
          </p>
        ) : (
          <ul
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
          >
            {tiers.map((tier) => {
              const price = tier.prices.find((p) => p.period === period) ?? tier.prices[0]
              const isCurrent = currentCategory === tier.key
              const recommended = tier.key === 'pro'
              return (
                <li key={tier.key}>
                  <article
                    data-testid={`subscription-tier-${tier.key}`}
                    className={cm.cn(
                      'h-full flex flex-col bg-surface-container-lowest rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-on-surface/5',
                      'border-l-4',
                      isCurrent ? 'border-primary' : 'border-transparent',
                    )}
                  >
                    {recommended && (
                      <span
                        className={cm.cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary text-on-primary inline-block mb-2 self-start',
                        )}
                      >
                        {t('subscription.recommended', {}, { defaultValue: 'Recommended' })}
                      </span>
                    )}
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {tier.name}
                    </p>
                    <p
                      className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums mt-2')}
                    >
                      {price?.price ?? '—'}
                    </p>
                    <ul className={cm.cn('mt-4 space-y-1.5 flex-1')}>
                      {tierPerks(tier).map((perk) => (
                        <li
                          key={perk}
                          className={cm.cn('text-xs text-on-surface flex items-start gap-2')}
                        >
                          <span
                            className={cm.cn(
                              'material-symbols-outlined text-[14px] text-primary mt-0.5',
                            )}
                            aria-hidden="true"
                          >
                            check
                          </span>
                          {perk}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      data-testid={`subscription-upgrade-${tier.key}`}
                      disabled={isCurrent || startingCheckout || !price?.stripePriceId}
                      onClick={() => {
                        void handleUpgrade(price?.stripePriceId ?? null)
                      }}
                      className={cm.cn(
                        'mt-5 w-full py-2.5 rounded-full text-sm font-bold transition-colors disabled:opacity-60',
                        recommended && !isCurrent
                          ? 'bg-primary text-on-primary hover:bg-primary/90'
                          : 'border border-outline-variant hover:bg-surface-container',
                      )}
                    >
                      {isCurrent
                        ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                        : !price?.stripePriceId
                          ? t('subscription.unavailable', {}, { defaultValue: 'Not available' })
                          : startingCheckout
                            ? t('subscription.starting', {}, { defaultValue: 'Starting…' })
                            : t(
                                'subscription.upgradeTo',
                                { name: tier.name },
                                { defaultValue: 'Switch to {{name}}' },
                              )}
                    </button>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
