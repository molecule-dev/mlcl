import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageBody, PageHeader } from '../components/PageHeader.js'

interface TierPrice {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
  savings?: string
}

interface Tier {
  key: string
  name: string
  prices: TierPrice[]
  limits?: Record<string, unknown>
  perSeat?: boolean
}

interface PlanSummary {
  plan: {
    key: string
    label: string
    price: string
    expires_at: string | null
    auto_renews: boolean
  }
  history: Array<{
    id: string
    date: string
    description: string
    amount: string
    status: string
  }>
}

interface PlanFeature {
  key: string
  defaultValue: string
}

const FEATURES_BY_KEY: Record<string, PlanFeature[]> = {
  free: [
    { key: 'billing.features.free.topics', defaultValue: 'Up to 5 topics' },
    { key: 'billing.features.free.quizzes', defaultValue: 'Up to 5 quizzes' },
    { key: 'billing.features.free.history', defaultValue: '90-day study history' },
    { key: 'billing.features.free.tutor', defaultValue: 'AI tutor (basic)' },
  ],
  pro: [
    { key: 'billing.features.pro.topics', defaultValue: 'Up to 500 topics' },
    { key: 'billing.features.pro.quizzes', defaultValue: 'Up to 500 quizzes' },
    { key: 'billing.features.pro.history', defaultValue: 'Full study history (1 year)' },
    { key: 'billing.features.pro.tutor', defaultValue: 'Advanced AI tutor' },
    { key: 'billing.features.pro.export', defaultValue: 'Export decks & notes' },
  ],
  team: [
    { key: 'billing.features.team.unlimited', defaultValue: 'Unlimited topics & quizzes' },
    { key: 'billing.features.team.collaboration', defaultValue: 'Team collaboration' },
    { key: 'billing.features.team.priority', defaultValue: 'Priority AI processing' },
    { key: 'billing.features.team.admin', defaultValue: 'Admin dashboard' },
    { key: 'billing.features.team.sso', defaultValue: 'SSO & dedicated support' },
  ],
}

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Pull display strings out of the API's price string (e.g. `'$15/mo'` or
 * `'$0'`). Splits on `/` so the cadence renders separately from the
 * dollar amount. `freeLabel` is the translated fallback shown when the
 * tier has no price string at all.
 */
const formatPrice = (
  price: TierPrice | undefined,
  freeLabel: string,
): { price: string; cadence: string } => {
  if (!price?.price) return { price: freeLabel, cadence: '' }
  const [amount, period] = price.price.split('/')
  return { price: amount, cadence: period ? `/ ${period}` : '' }
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [summary, setSummary] = useState<PlanSummary | null>(null)
  const [tiers, setTiers] = useState<Tier[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = () => {
    Promise.all([
      http.get<PlanSummary>('/api/billing/summary'),
      http.get<{ data: Tier[] }>('/api/billing/tiers'),
    ])
      .then(([summaryRes, tiersRes]) => {
        setSummary(summaryRes.data ?? null)
        setTiers(tiersRes.data?.data ?? [])
        setError(null)
      })
      .catch((e: unknown) => {
        setError(
          e instanceof Error
            ? e.message
            : t('billing.error', {}, { defaultValue: 'Could not load billing info.' }),
        )
      })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const handlePlan = async (priceId: string | undefined) => {
    if (!priceId) return
    setBusy(true)
    try {
      const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/api/billing/checkout',
        { priceId },
      )
      if (res.data?.checkoutUrl) {
        window.location.assign(res.data.checkoutUrl)
        return
      }
      refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
      )
    } finally {
      setBusy(false)
    }
  }

  const currentKey = summary?.plan?.key ?? 'free'

  return (
    <div
      data-mol-id="page-billing"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <PageHeader
        eyebrow={t('settings.account', {}, { defaultValue: 'Account' })}
        title={t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}
        subtitle={t(
          'billing.subtitle',
          {},
          { defaultValue: 'Choose the plan that fits your study cadence.' },
        )}
        actions={
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            {t('billing.viewPricing', {}, { defaultValue: 'See full pricing →' })}
          </Link>
        }
      />

      <PageBody>
        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}

        {summary === null && !error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('billing.loading', {}, { defaultValue: 'Loading plan info…' })}
          </p>
        ) : (
          <>
            {(tiers ?? []).length > 0 ? (
              <section className={'grid grid-cols-1 gap-4 lg:grid-cols-3'}>
                {(tiers ?? []).map((p, idx) => {
                  const priceObj = p.prices?.[0]
                  const { price, cadence } = formatPrice(
                    priceObj,
                    t('billing.freeLabel', {}, { defaultValue: 'Free' }),
                  )
                  const isCurrent = p.key === currentKey
                  const isFeatured = !isCurrent && idx === (tiers ?? []).length - 1
                  const features = FEATURES_BY_KEY[p.key] ?? []
                  return (
                    <article
                      key={p.key}
                      className={cm.cn(
                        cm.sp('p', 6),
                        cm.flex({ direction: 'col', gap: 'md' }),
                        'rounded-3xl border-2 transition-all',
                        isFeatured
                          ? 'border-primary bg-gradient-to-br from-primary to-primary-container text-white shadow-2xl'
                          : isCurrent
                            ? 'border-primary bg-surface-container-lowest shadow-ambient'
                            : 'border-outline-variant/20 bg-surface-container-lowest',
                      )}
                    >
                      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
                        <h3
                          className={cm.cn(
                            cm.textSize('lg'),
                            cm.fontWeight('bold'),
                            isFeatured ? 'text-white' : 'text-on-surface',
                          )}
                        >
                          {p.name}
                        </h3>
                        {isCurrent ? (
                          <span
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              cm.textSize('xs'),
                              cm.fontWeight('bold'),
                              'rounded-full uppercase tracking-wider bg-primary text-on-primary',
                            )}
                          >
                            {t('nav.current', {}, { defaultValue: 'Current' })}
                          </span>
                        ) : isFeatured ? (
                          <span
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              cm.textSize('xs'),
                              cm.fontWeight('bold'),
                              'rounded-full uppercase tracking-wider bg-surface/25 text-white',
                            )}
                          >
                            {t('billing.popular', {}, { defaultValue: 'Most loved' })}
                          </span>
                        ) : null}
                      </div>
                      <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
                        <span
                          className={cm.cn(
                            'text-4xl font-extrabold tracking-tighter tabular-nums',
                            isFeatured ? 'text-white' : 'text-on-surface',
                          )}
                        >
                          {price}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            'serif-text italic',
                            isFeatured ? 'text-primary-fixed/80' : 'text-on-surface-variant',
                          )}
                        >
                          {cadence}
                        </span>
                      </div>
                      <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.flex1)}>
                        {features.map((f) => (
                          <li
                            key={f.key}
                            className={cm.cn(
                              cm.flex({ align: 'start', gap: 'xs' }),
                              cm.textSize('sm'),
                            )}
                          >
                            <span
                              className={cm.cn(
                                'material-symbols-outlined text-base mt-0.5',
                                isFeatured ? 'text-primary-fixed' : 'text-primary',
                              )}
                              aria-hidden="true"
                            >
                              check
                            </span>
                            <span className={isFeatured ? 'text-white/95' : 'text-on-surface'}>
                              {t(f.key, {}, { defaultValue: f.defaultValue })}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        data-mol-id={`pricing-cta-${p.key}`}
                        disabled={isCurrent || busy || !priceObj?.stripePriceId}
                        onClick={() => handlePlan(priceObj?.stripePriceId ?? undefined)}
                        className={cm.cn(
                          cm.sp('py', 3),
                          cm.fontWeight('bold'),
                          cm.textSize('sm'),
                          'rounded-xl uppercase tracking-wider transition-opacity',
                          isFeatured
                            ? 'bg-surface text-primary hover:opacity-90'
                            : isCurrent
                              ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                              : 'bg-primary text-on-primary hover:opacity-90',
                          'disabled:opacity-50',
                        )}
                      >
                        {isCurrent
                          ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                          : t('billing.cta.upgrade', {}, { defaultValue: 'Choose plan' })}
                      </button>
                    </article>
                  )
                })}
              </section>
            ) : null}

            <section
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-3xl bg-surface-container-lowest border border-outline-variant/15',
              )}
            >
              <h3
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface mb-4')}
              >
                {t('billing.history', {}, { defaultValue: 'Billing history' })}
              </h3>
              {(summary?.history ?? []).length === 0 ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}
                >
                  {t('billing.history.empty', {}, { defaultValue: 'No payments yet.' })}
                </p>
              ) : (
                <table className={'w-full'}>
                  <thead>
                    <tr
                      className={
                        'text-left text-xs font-bold uppercase tracking-widest text-on-surface-variant/70'
                      }
                    >
                      <th className={'pb-3'}>{t('form.date', {}, { defaultValue: 'Date' })}</th>
                      <th className={'pb-3'}>
                        {t('form.description', {}, { defaultValue: 'Description' })}
                      </th>
                      <th className={'pb-3 text-right'}>
                        {t('form.amount', {}, { defaultValue: 'Amount' })}
                      </th>
                      <th className={'pb-3 text-right'}>
                        {t('nav.status', {}, { defaultValue: 'Status' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/15">
                    {(summary?.history ?? []).map((row) => (
                      <tr key={row.id}>
                        <td className={'py-3 text-sm text-on-surface'}>{formatDate(row.date)}</td>
                        <td className={'py-3 text-sm text-on-surface'}>{row.description}</td>
                        <td className={'py-3 text-sm tabular-nums text-on-surface text-right'}>
                          {row.amount}
                        </td>
                        <td className={'py-3 text-right'}>
                          <span
                            className={
                              'inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-success-light/60 text-success'
                            }
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </PageBody>
    </div>
  )
}
