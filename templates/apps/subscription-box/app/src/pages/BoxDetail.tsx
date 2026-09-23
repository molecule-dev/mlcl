import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type ApiPlan, type ApiSubscription, centsToLabel, unwrapSingle } from '../lib/api.js'

interface CheckoutResponse {
  checkoutUrl?: string
  updated?: boolean
}

export function BoxDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [plan, setPlan] = useState<ApiPlan | null>(null)
  const [subscription, setSubscription] = useState<ApiSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      http.get(`/api/plans/${id}`).then(unwrapSingle<ApiPlan>),
      http
        .get('/api/subscriptions/mine')
        .then(unwrapSingle<ApiSubscription>)
        .catch(() => null),
    ])
      .then(([p, sub]) => {
        if (cancelled) return
        setPlan(p)
        setSubscription(sub)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const subscribe = async () => {
    if (!plan) return
    setSubmitting(true)
    setError(null)
    setFeedback(null)
    try {
      if (plan.stripe_price_id) {
        // useHttpClient().post() returns the HttpResponse envelope —
        // the actual response body lives at .data, NOT on the outer
        // object. Reaching for `result?.checkoutUrl` on the envelope
        // silently misses the redirect and the user sits on /boxes/:id
        // wondering why nothing happened. Use unwrapSingle so we read
        // the envelope-or-bare-object response shape uniformly.
        const result = unwrapSingle<CheckoutResponse>(
          await http.post('/api/billing/checkout', { priceId: plan.stripe_price_id }),
        )
        if (result?.checkoutUrl) {
          track({
            name: 'billing.checkout_started',
            properties: { planId: plan.id, planName: plan.name, priceId: plan.stripe_price_id },
          })
          window.location.href = result.checkoutUrl
          return
        }
        if (result?.updated) {
          track({ name: 'box.subscribed', properties: { planId: plan.id, method: 'stripe' } })
          setFeedback(t('nav.subscriptionUpdated', {}, { defaultValue: 'Subscription updated.' }))
        }
      } else {
        const sub = unwrapSingle<ApiSubscription>(
          await http.post('/api/subscriptions', {
            planId: plan.id,
            paymentMethodId: 'manual',
            preferences: {},
          }),
        )
        if (sub) {
          track({
            name: 'box.subscribed',
            properties: { planId: plan.id, subscriptionId: sub.id, method: 'manual' },
          })
          setSubscription({ ...sub, plan })
          setFeedback(
            t(
              'boxDetail.subscribe.success',
              {},
              { defaultValue: 'Subscribed — your first edition is queued.' },
            ),
          )
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}
        data-testid="box-detail-loading"
      >
        {t('boxDetail.loading', {}, { defaultValue: 'Loading edition…' })}
      </div>
    )
  }

  if (!plan) {
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)} data-testid="box-detail-missing">
        <p className={cm.textMuted}>
          {t('boxDetail.notFound', {}, { defaultValue: 'That edition is no longer available.' })}
        </p>
        <Link to="/boxes" className={cm.cn('text-primary font-bold underline')}>
          {t('boxDetail.backToBoxes', {}, { defaultValue: 'Back to all editions' })}
        </Link>
      </div>
    )
  }

  const isCurrent = subscription?.plan_id === plan.id

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('py', 8))}
      data-testid="box-detail"
    >
      <nav className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}>
        <Link to="/boxes" className={cm.cn('hover:text-primary transition-colors')}>
          {t('boxDetail.crumb.boxes', {}, { defaultValue: 'Editions' })}
        </Link>
        <span className={cm.cn('mx-2')}>·</span>
        <span className={cm.cn('text-on-surface')}>{plan.name}</span>
      </nav>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'lg:grid-cols-12')}>
        <div
          className={cm.cn(
            'lg:col-span-7 relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-gradient-to-br from-primary to-primary-container shadow-lg',
          )}
        >
          <div
            className={cm.cn('absolute inset-0 flex items-center justify-center text-on-primary')}
          >
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                cm.sp('p', 8),
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-7xl')}>inventory_2</span>
              <span
                className={cm.cn('text-3xl md:text-5xl font-extrabold tracking-tight text-center')}
              >
                {plan.name}
              </span>
              <span className={cm.cn('text-sm uppercase tracking-widest text-on-primary/80')}>
                {t(
                  'boxDetail.itemsBadge',
                  { count: plan.included_items.length },
                  { defaultValue: '{{count}} curated items per box' },
                )}
              </span>
            </div>
          </div>
        </div>
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 8),
            'lg:col-span-5 rounded-[2rem] bg-surface-container-lowest border border-outline-variant/30',
          )}
        >
          <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
            {t('boxDetail.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} edition' })}
          </span>
          <h1
            className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface')}
          >
            {plan.name}
          </h1>
          <p className={cm.cn('text-base text-on-surface-variant leading-relaxed')}>
            {plan.description}
          </p>

          <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), cm.sp('mt', 2))}>
            <span
              className={cm.cn(
                'text-5xl font-extrabold tracking-tighter text-primary tabular-nums',
              )}
            >
              {centsToLabel(plan.price, plan.currency)}
            </span>
            <span
              className={cm.cn(
                'text-sm font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {`/ ${plan.interval}`}
            </span>
          </div>

          {plan.max_customizations > 0 && (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.roundedFull,
                'self-start text-xs font-bold uppercase tracking-widest bg-success-light text-success',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>swap_horiz</span>
              {t(
                'boxDetail.swapBadge',
                { count: plan.max_customizations },
                { defaultValue: 'Swap up to {{count}} item(s) per box' },
              )}
            </div>
          )}

          {error && (
            <p
              className={cm.cn(
                cm.sp('p', 3),
                'rounded-xl bg-error/10 text-error text-sm font-bold',
              )}
              role="alert"
              data-testid="box-detail-error"
            >
              {error}
            </p>
          )}
          {feedback && (
            <p
              className={cm.cn(
                cm.sp('p', 3),
                'rounded-xl bg-success-light text-success text-sm font-bold',
              )}
              role="status"
              data-testid="box-detail-feedback"
            >
              {feedback}
            </p>
          )}

          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 4))}>
            {isCurrent ? (
              <Link
                to="/customize"
                data-testid="box-detail-customize"
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.sp('px', 6),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'text-base text-center bg-primary text-on-primary hover:bg-primary-hover hover:shadow-lg active:scale-[0.98] transition-all',
                )}
              >
                {t('boxDetail.cta.customize', {}, { defaultValue: 'Customize this box' })}
              </Link>
            ) : (
              <button
                type="button"
                onClick={subscribe}
                disabled={submitting}
                data-testid="box-detail-subscribe"
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.sp('px', 6),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'text-base bg-primary text-on-primary hover:bg-primary-hover hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60',
                )}
              >
                {submitting
                  ? t('boxDetail.cta.submitting', {}, { defaultValue: 'Subscribing…' })
                  : t('boxDetail.cta.subscribe', {}, { defaultValue: 'Subscribe & open checkout' })}
              </button>
            )}
            <Link
              to="/boxes"
              className={cm.cn(
                cm.sp('py', 3),
                cm.sp('px', 6),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'text-sm text-center border-2 border-on-surface text-on-surface hover:bg-on-surface hover:text-surface transition-all',
              )}
            >
              {t('boxDetail.cta.browse', {}, { defaultValue: 'Browse other editions' })}
            </Link>
          </div>
        </aside>
      </section>

      {plan.features.length > 0 && (
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <h2
            className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface')}
          >
            {t('boxDetail.features.heading', {}, { defaultValue: "What's included" })}
          </h2>
          <ul
            className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 md:grid-cols-2')}
            data-testid="box-detail-features"
          >
            {plan.features.map((f, i) => (
              <li
                key={i}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'sm' }),
                  cm.sp('p', 4),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-xl text-primary')}>
                  check_circle
                </span>
                <span className={cm.cn('text-sm text-on-surface')}>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.included_items.length > 0 && (
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <h2
            className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface')}
          >
            {t(
              'boxDetail.items.heading',
              { count: plan.included_items.length },
              { defaultValue: '{{count}} curated pieces' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
            data-testid="box-detail-items"
          >
            {plan.included_items.map((item, i) => (
              <article
                key={i}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'xs' }),
                  cm.sp('p', 4),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
                )}
              >
                <span
                  className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary')}
                >
                  {t('boxDetail.items.curated', {}, { defaultValue: 'Curated piece' })}
                </span>
                <h3 className={cm.cn('text-sm font-extrabold tracking-tight text-on-surface')}>
                  {item}
                </h3>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default BoxDetail
