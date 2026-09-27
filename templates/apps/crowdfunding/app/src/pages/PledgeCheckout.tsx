import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { RewardTier } from '../components/RewardTierCard.js'
import { RewardTierCard } from '../components/RewardTierCard.js'
import { api, type ApiCampaignDetail } from '../lib/api.js'

function tierToView(t: ApiCampaignDetail['tiers'][number]): RewardTier {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    price_cents: t.price_cents,
    delivery_estimate: t.estimated_delivery ?? undefined,
    backer_count: t.current_backers,
    limit: t.max_backers,
    remaining: t.remaining,
  }
}

export function PledgeCheckout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const presetTier = params.get('tier') ?? ''
  const [campaign, setCampaign] = useState<ApiCampaignDetail | null>(null)
  const [tierId, setTierId] = useState<string>('')
  const [shippingName, setShippingName] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple' | 'google'>('card')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    void (async () => {
      try {
        const c = await api.getCampaign(http, id)
        if (alive) {
          setCampaign(c)
          if (presetTier && c.tiers.some((tt) => tt.id === presetTier)) {
            setTierId(presetTier)
          } else if (c.tiers.length > 0) {
            setTierId(c.tiers[0].id)
          }
        }
      } catch (err) {
        if (alive)
          setLoadError(
            err instanceof Error
              ? err.message
              : t('pledgeCheckout.loadError', {}, { defaultValue: 'Failed to load campaign' }),
          )
      }
    })()
    return () => {
      alive = false
    }
  }, [id, http, t, presetTier])

  if (loadError || !campaign) {
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)} data-mol-id="pledge-loading">
        {loadError ?? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  const tiers = campaign.tiers.map(tierToView)
  const tier = tiers.find((tt) => tt.id === tierId) ?? tiers[0]
  const fmt = (c: number) => `$${Math.round(c / 100).toLocaleString()}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tier) return
    setSubmitting(true)
    setError(null)
    try {
      // pm_card_visa is Stripe's stable test "always-succeeds" payment method.
      // In production, this would be a payment_method created client-side via
      // Stripe Elements / Apple Pay / Google Pay.
      const pmMap: Record<string, string> = {
        card: 'pm_card_visa',
        apple: 'pm_card_visa',
        google: 'pm_card_visa',
      }
      const pledge = await api.createPledge(http, {
        campaign_id: campaign.id,
        tier_id: tier.id,
        amount: tier.price_cents / 100,
        payment_method: pmMap[paymentMethod],
      })
      void track({
        name: 'pledge.made',
        properties: {
          pledge_id: pledge.id,
          campaign_id: campaign.id,
          tier_id: tier.id,
          amount_cents: tier.price_cents,
        },
      })
      // Conversion milestone: this pledge crossed the funding goal.
      if (
        pledge.campaign_pledged_cents > 0 &&
        pledge.campaign_goal_cents > 0 &&
        pledge.campaign_pledged_cents >= pledge.campaign_goal_cents
      ) {
        void track({
          name: 'campaign.funded',
          properties: { campaign_id: campaign.id },
        })
      }
      navigate(`/campaign/${campaign.id}?pledged=1`)
    } catch (err) {
      const detail =
        err instanceof Error
          ? err.message
          : t('pledgeCheckout.error', {}, { defaultValue: 'Pledge failed. Please try again.' })
      setError(detail)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.maxW('6xl'),
        cm.mxAuto,
        cm.w('full'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.stack(8),
      )}
      data-mol-id="page-pledge-checkout"
    >
      <header className={cm.stack(2)}>
        <Link
          to={`/campaign/${campaign.id}`}
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline',
          )}
        >
          ←{' '}
          {t(
            'pledgeCheckout.back',
            { title: campaign.title },
            { defaultValue: 'Back to {{title}}' },
          )}
        </Link>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('pledgeCheckout.heading', {}, { defaultValue: 'Confirm your pledge' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'pledgeCheckout.subheading',
            {},
            { defaultValue: "You're charged immediately to support the campaign." },
          )}
        </p>
      </header>

      <form
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3 items-start')}
        onSubmit={handleSubmit}
      >
        <div className={cm.cn('lg:col-span-2', cm.stack(6))}>
          <section className={cm.stack(3)}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('pledgeCheckout.tier.title', {}, { defaultValue: '1. Pick a reward' })}
            </h2>
            {tiers.length === 0 ? (
              <p
                className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                data-mol-id="checkout-no-tiers"
              >
                {t(
                  'pledgeCheckout.tier.empty',
                  {},
                  { defaultValue: 'This campaign has no reward tiers yet.' },
                )}
              </p>
            ) : (
              <div className={cm.stack(3)}>
                {tiers.map((rt) => (
                  <RewardTierCard
                    key={rt.id}
                    tier={rt}
                    selected={rt.id === tierId}
                    onSelect={setTierId}
                  />
                ))}
              </div>
            )}
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('pledgeCheckout.shipping.title', {}, { defaultValue: '2. Where should we ship?' })}
            </h2>
            <FieldRow
              id="ship-name"
              label={t('form.fullName', {}, { defaultValue: 'Full name' })}
              value={shippingName}
              onChange={setShippingName}
              placeholder={t(
                'pledgeCheckout.shipping.namePlaceholder',
                {},
                { defaultValue: 'Sarah Jenkins' },
              )}
            />
            <FieldRow
              id="ship-addr"
              label={t('pledgeCheckout.shipping.address', {}, { defaultValue: 'Shipping address' })}
              value={shippingAddress}
              onChange={setShippingAddress}
              placeholder={t(
                'pledgeCheckout.shipping.addressPlaceholder',
                {},
                { defaultValue: '123 Main St, Springfield, USA' },
              )}
              multiline
            />
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('pledgeCheckout.payment.title', {}, { defaultValue: '3. Payment method' })}
            </h2>
            <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-3')}>
              {(
                [
                  {
                    id: 'card',
                    icon: 'credit_card',
                    label: t('pledgeCheckout.payment.card', {}, { defaultValue: 'Card' }),
                  },
                  {
                    id: 'apple',
                    icon: 'payments',
                    label: t('pledgeCheckout.payment.apple', {}, { defaultValue: 'Apple Pay' }),
                  },
                  {
                    id: 'google',
                    icon: 'g_mobiledata',
                    label: t('pledgeCheckout.payment.google', {}, { defaultValue: 'Google Pay' }),
                  },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                    'rounded-lg border-2 transition-all',
                    paymentMethod === m.id
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant bg-surface-container-low hover:border-primary/40',
                  )}
                  data-mol-id={`payment-${m.id}`}
                >
                  <span
                    className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined text-primary')}
                    aria-hidden="true"
                  >
                    {m.icon}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'pledgeCheckout.payment.testNote',
                {},
                {
                  defaultValue:
                    'In test mode the demo charge is processed via the Stripe test card pm_card_visa.',
                },
              )}
            </p>
          </section>
        </div>

        <aside
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'lg:sticky lg:top-24 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-md',
          )}
          aria-label={t('pledgeCheckout.summary.label', {}, { defaultValue: 'Pledge summary' })}
          data-mol-id="pledge-summary"
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('pledgeCheckout.summary.eyebrow', {}, { defaultValue: 'Pledge summary' })}
          </p>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{campaign.title}</p>
          <div
            className={cm.cn(
              cm.flex({ align: 'baseline', justify: 'between' }),
              cm.sp('py', 3),
              'border-t border-outline-variant',
            )}
          >
            <span className={cm.textSize('sm')}>
              {t('pledgeCheckout.summary.tier', {}, { defaultValue: 'Reward tier' })}
            </span>
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
              data-mol-id="summary-tier-title"
            >
              {tier?.title ?? '—'}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'baseline', justify: 'between' }),
              cm.sp('py', 3),
              'border-t border-outline-variant',
            )}
          >
            <span className={cm.textSize('sm')}>
              {t('pledgeCheckout.summary.total', {}, { defaultValue: 'Total today' })}
            </span>
            <span
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'tabular-nums text-primary',
              )}
              data-mol-id="summary-total"
            >
              {tier ? fmt(tier.price_cents) : '$0'}
            </span>
          </div>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'pledgeCheckout.summary.disclaimer',
              {},
              { defaultValue: 'Your card will be charged when you confirm.' },
            )}
          </p>
          {error ? (
            <div className={cm.cn(cm.textSize('sm'), 'text-error')} data-mol-id="pledge-error">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={submitting || !tier}
            className={cm.cn(
              cm.sp('py', 4),
              cm.fontWeight('bold'),
              cm.textSize('base'),
              'rounded-lg text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            }}
            data-mol-id="confirm-pledge"
          >
            {submitting
              ? t('pledgeCheckout.summary.processing', {}, { defaultValue: 'Processing…' })
              : t('pledgeCheckout.summary.confirm', {}, { defaultValue: 'Confirm pledge' })}
          </button>
        </aside>
      </form>
    </div>
  )
}

function FieldRow({
  id,
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const cm = getClassMap()
  return (
    <div className={cm.stack(2)}>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cm.cn(
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.fontWeight('medium'),
            'rounded-lg border border-outline-variant bg-surface-container-low resize-y text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
          )}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cm.cn(
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.fontWeight('medium'),
            'rounded-lg border border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
          )}
        />
      )}
    </div>
  )
}

export default PledgeCheckout
