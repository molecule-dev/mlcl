import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import {
  type ApiBox,
  type ApiPlan,
  type ApiSubscription,
  centsToLabel,
  unwrapList,
  unwrapSingle,
} from '../lib/api.js'

interface CustomizationPreferences {
  excludedItems?: string[]
}

export function Customize() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [plans, setPlans] = useState<ApiPlan[]>([])
  const [subscription, setSubscription] = useState<ApiSubscription | null>(null)
  const [box, setBox] = useState<ApiBox | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/plans').then(unwrapList<ApiPlan>),
      http
        .get('/api/subscriptions/mine')
        .then(unwrapSingle<ApiSubscription>)
        .catch(() => null),
      http
        .get('/api/boxes/mine/upcoming')
        .then(unwrapSingle<ApiBox>)
        .catch(() => null),
    ])
      .then(([planList, sub, b]) => {
        if (cancelled) return
        setPlans(planList)
        setSubscription(sub)
        setBox(b)
        const subPrefs = (sub?.preferences ?? {}) as CustomizationPreferences
        if (Array.isArray(subPrefs.excludedItems)) {
          setExcluded(new Set(subPrefs.excludedItems))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const plan = useMemo(
    () => plans.find((p) => p.id === subscription?.plan_id) ?? null,
    [plans, subscription],
  )

  const items = useMemo(() => {
    if (!plan) return []
    return plan.included_items.map((name, i) => ({
      id: `${plan.id}-item-${i}`,
      name,
    }))
  }, [plan])

  const includedItems = useMemo(
    () => items.filter((item) => !excluded.has(item.id)),
    [items, excluded],
  )

  const maxSwap = plan?.max_customizations ?? 0

  const toggleItem = (itemId: string) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const save = async () => {
    if (!subscription) return
    setSaving(true)
    setError(null)
    setFeedback(null)
    try {
      const newPrefs: CustomizationPreferences = {
        ...(subscription.preferences as CustomizationPreferences),
        excludedItems: Array.from(excluded),
      }
      await http.put('/api/subscriptions/mine/preferences', { preferences: newPrefs })
      track({
        name: 'box.customized',
        properties: {
          subscriptionId: subscription.id,
          planId: subscription.plan_id,
          excludedCount: excluded.size,
        },
      })
      setFeedback(t('customize.saved', {}, { defaultValue: 'Customization saved.' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const switchPlan = async (newPlan: ApiPlan) => {
    if (!subscription || newPlan.id === subscription.plan_id) return
    setSaving(true)
    setError(null)
    setFeedback(null)
    try {
      if (newPlan.stripe_price_id) {
        const result = unwrapSingle<{ checkoutUrl?: string; updated?: boolean }>(
          await http.post('/api/billing/checkout', { priceId: newPlan.stripe_price_id }),
        )
        if (result?.checkoutUrl) {
          track({
            name: 'plan.changed',
            properties: {
              fromPlanId: subscription.plan_id,
              toPlanId: newPlan.id,
              method: 'stripe',
            },
          })
          window.location.href = result.checkoutUrl
          return
        }
      }
      track({
        name: 'plan.changed',
        properties: { fromPlanId: subscription.plan_id, toPlanId: newPlan.id, method: 'checkout' },
      })
      setFeedback(t('customize.switched', {}, { defaultValue: 'Tier switch initiated.' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('py', 8))}
      data-testid="customize-page"
    >
      <div
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
            {t('customize.eyebrow', {}, { defaultValue: 'Make it yours' })}
          </span>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface')}
          >
            {t(
              'customize.heading',
              { appName: APP_NAME },
              { defaultValue: 'Customize your next {{appName}}' },
            )}
          </h1>
          <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
            {t(
              'customize.subtitle',
              {},
              {
                defaultValue:
                  'Pick your tier and swap out anything that is not quite you. Saved swaps stick to your subscription.',
              },
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div
          className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}
          data-testid="customize-loading"
        >
          {t('customize.loading', {}, { defaultValue: 'Loading customization…' })}
        </div>
      ) : !subscription ? (
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
          )}
          data-testid="customize-no-sub"
        >
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
            {t('customize.noSub.heading', {}, { defaultValue: 'No active subscription' })}
          </h2>
          <p className={cm.cn('text-sm text-on-surface-variant max-w-2xl')}>
            {t(
              'customize.noSub.body',
              {},
              {
                defaultValue:
                  'Subscribe to a tier first, then come back to swap items in your box.',
              },
            )}
          </p>
          <Link
            to="/boxes"
            className={cm.cn(
              cm.sp('py', 3),
              cm.sp('px', 5),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'self-start text-sm bg-primary text-on-primary hover:bg-primary-hover transition-all',
            )}
          >
            {t('customize.noSub.cta', {}, { defaultValue: 'Browse editions' })}
          </Link>
        </section>
      ) : (
        <>
          <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
              {t('customize.tiers.heading', {}, { defaultValue: 'Choose a tier' })}
            </h2>
            <div
              className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3 items-stretch')}
            >
              {plans.map((p) => {
                const isCurrent = p.id === subscription.plan_id
                return (
                  <article
                    key={p.id}
                    className={cm.cn(
                      cm.flex({ direction: 'col', gap: 'sm' }),
                      cm.sp('p', 6),
                      'rounded-2xl border-2 transition-all',
                      isCurrent
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40',
                    )}
                    data-testid={`customize-tier-${p.slug ?? p.id}`}
                  >
                    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                      <h3
                        className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}
                      >
                        {p.name}
                      </h3>
                      {isCurrent && (
                        <span
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.fontWeight('bold'),
                            cm.roundedFull,
                            'text-[10px] uppercase tracking-widest bg-primary text-on-primary',
                          )}
                        >
                          {t('nav.current', {}, { defaultValue: 'Current' })}
                        </span>
                      )}
                    </div>
                    <p className={cm.cn('text-sm text-on-surface-variant line-clamp-2')}>
                      {p.description}
                    </p>
                    <span className={cm.cn('text-3xl font-extrabold text-primary tabular-nums')}>
                      {centsToLabel(p.price, p.currency)}
                      <span
                        className={cm.cn(
                          'text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                        )}
                      >
                        {`/ ${p.interval}`}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => switchPlan(p)}
                      disabled={isCurrent || saving}
                      data-testid={`customize-switch-${p.slug ?? p.id}`}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        cm.sp('mt', 2),
                        'text-sm transition-all disabled:opacity-60',
                        isCurrent
                          ? 'bg-surface-container text-on-surface-variant cursor-default'
                          : 'bg-primary text-on-primary hover:bg-primary-hover',
                      )}
                    >
                      {isCurrent
                        ? t('customize.tiers.cur', {}, { defaultValue: 'Active tier' })
                        : t('customize.tiers.switch', {}, { defaultValue: 'Switch to this tier' })}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>

          {plan && (
            <section
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                cm.sp('p', 8),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
              )}
              data-testid="customize-items"
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'sm' }),
                )}
              >
                <div>
                  <span
                    className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}
                  >
                    {t('customize.items.eyebrow', {}, { defaultValue: 'Personalize this box' })}
                  </span>
                  <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
                    {t(
                      'customize.items.heading',
                      { box: box?.theme ?? plan.name },
                      { defaultValue: 'Items in {{box}}' },
                    )}
                  </h2>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col', align: 'end' }))}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(
                      'customize.items.swapsLeft',
                      { used: excluded.size, max: maxSwap },
                      { defaultValue: '{{used}} of {{max}} swaps used' },
                    )}
                  </span>
                </div>
              </div>
              {items.length === 0 ? (
                <p className={cm.textMuted}>
                  {t(
                    'customize.items.empty',
                    {},
                    { defaultValue: 'No items configured for this tier yet.' },
                  )}
                </p>
              ) : (
                <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                  {items.map((item) => {
                    const isExcluded = excluded.has(item.id)
                    return (
                      <li
                        key={item.id}
                        data-testid={`customize-item-${item.id}`}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'md' }),
                          cm.sp('p', 4),
                          'rounded-2xl border transition-all',
                          isExcluded
                            ? 'border-error/50 bg-error/5 opacity-70'
                            : 'border-outline-variant/30 bg-surface-container-low/50 hover:border-primary/40',
                        )}
                      >
                        <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
                          <h3
                            className={cm.cn(
                              'text-sm font-extrabold tracking-tight truncate',
                              isExcluded
                                ? 'line-through text-on-surface-variant'
                                : 'text-on-surface',
                            )}
                          >
                            {item.name}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          disabled={!isExcluded && excluded.size >= maxSwap}
                          data-testid={`customize-swap-${item.id}`}
                          aria-pressed={isExcluded}
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            cm.fontWeight('bold'),
                            cm.roundedFull,
                            'text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                            isExcluded
                              ? 'bg-primary text-on-primary hover:bg-primary-hover'
                              : 'border-2 border-on-surface text-on-surface hover:bg-on-surface hover:text-surface',
                          )}
                        >
                          {isExcluded
                            ? t('customize.items.include', {}, { defaultValue: 'Add back' })
                            : t('customize.items.exclude', {}, { defaultValue: 'Skip this' })}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {error && (
                <p
                  className={cm.cn(
                    cm.sp('p', 3),
                    'rounded-xl bg-error/10 text-error text-sm font-bold',
                  )}
                  role="alert"
                  data-testid="customize-error"
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
                  data-testid="customize-feedback"
                >
                  {feedback}
                </p>
              )}
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
                  cm.sp('mt', 4),
                  cm.sp('pt', 4),
                  'border-t border-outline-variant/30',
                )}
              >
                <p className={cm.cn('text-sm text-on-surface-variant')}>
                  {t(
                    'customize.items.helper',
                    { count: includedItems.length, total: items.length },
                    {
                      defaultValue:
                        '{{count}} of {{total}} items included. We swap excluded items with curator picks.',
                    },
                  )}
                </p>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  data-testid="customize-save"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'text-sm bg-primary text-on-primary hover:bg-primary-hover hover:shadow-lg transition-all disabled:opacity-60',
                  )}
                >
                  {saving
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('customize.items.save', {}, { defaultValue: 'Save customization' })}
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default Customize
