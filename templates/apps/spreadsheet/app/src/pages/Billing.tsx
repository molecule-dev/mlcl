import { useState } from 'react'

import {
  useBillingStatus,
  useCancelSubscription,
  usePricingTiers,
  useStartCheckout,
} from '@molecule/app-billing-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CalciteKpiTile } from '../components/CalciteKpiTile.js'
import { WorkbenchLayout } from '../components/WorkbenchLayout.js'

interface SpreadsheetLimits {
  maxSpreadsheets?: number
  maxSheets?: number
  maxRows?: number
  maxColumns?: number
  retentionDays?: number
  advancedFeatures?: boolean
  canExport?: boolean
}

function fmtNum(v: number | undefined): string {
  if (v === undefined || v === null) return '—'
  if (v >= 1_000_000) return 'Unlimited'
  return v.toLocaleString()
}

function fmtBool(v: boolean | undefined): string {
  return v ? 'Yes' : 'No'
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tiers = usePricingTiers<SpreadsheetLimits>()
  const status = useBillingStatus<SpreadsheetLimits>()
  const checkout = useStartCheckout()
  const cancel = useCancelSubscription()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function upgrade(priceId: string | null, key: string) {
    setError(null)
    if (!priceId) {
      setError(
        t(
          'billing.error.priceMissing',
          {},
          {
            defaultValue:
              'No Stripe price configured for this tier. Set STRIPE_*_PRICE_ID env vars.',
          },
        ),
      )
      return
    }
    setBusy(key)
    try {
      const res = await checkout.start(priceId)
      if (res?.checkoutUrl) {
        window.location.assign(res.checkoutUrl)
      } else if (res?.updated) {
        await status.execute()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  async function doCancel() {
    setError(null)
    setBusy('cancel')
    try {
      await cancel.cancel()
      await status.execute()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const planList = tiers.data?.data ?? []
  const currentCategory = status.data?.category ?? 'free'
  const limits = status.data?.limits ?? {}

  return (
    <WorkbenchLayout>
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('settings.billing', {}, { defaultValue: 'Billing' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('lg'), 'text-on-surface-variant')}>
            {t(
              'billing.subhead',
              {},
              { defaultValue: 'Subscription, usage, and Stripe checkout flow.' },
            )}
          </p>
        </div>
        {currentCategory !== 'free' && (
          <button
            type="button"
            onClick={doCancel}
            disabled={busy === 'cancel'}
            className={
              'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-surface-variant rounded-full border border-outline-variant hover:border-error hover:text-error transition-colors disabled:opacity-50'
            }
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              cancel
            </span>
            {busy === 'cancel'
              ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
              : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
          </button>
        )}
      </div>

      {(error || tiers.error || status.error) && (
        <div
          role="alert"
          className={cm.cn('p-4 rounded-2xl text-sm bg-error-container/40 text-error')}
        >
          {error ?? tiers.error?.message ?? status.error?.message}
        </div>
      )}

      <div className={cm.cn(cm.grid({ cols: 4, gap: 'lg' }))}>
        <CalciteKpiTile
          icon="paid"
          accent="primary"
          label={t('billing.kpi.planLabel', {}, { defaultValue: 'Active plan' })}
          value={status.loading ? '—' : (status.data?.name ?? 'Free')}
          hint={t(
            'billing.kpi.planHint',
            { key: status.data?.planKey ?? 'free' },
            { defaultValue: 'plan: {{key}}' },
          )}
        />
        <CalciteKpiTile
          icon="grid_on"
          accent="info"
          label={t('billing.kpi.workbooksLabel', {}, { defaultValue: 'Workbooks' })}
          value={fmtNum(limits.maxSpreadsheets)}
        />
        <CalciteKpiTile
          icon="table_rows"
          accent="success"
          label={t('billing.kpi.rowsLabel', {}, { defaultValue: 'Rows / sheet' })}
          value={fmtNum(limits.maxRows)}
        />
        <CalciteKpiTile
          icon="schedule"
          accent="warning"
          label={t('nav.history', {}, { defaultValue: 'History' })}
          value={limits.retentionDays ? `${limits.retentionDays}d` : '—'}
        />
      </div>

      {tiers.loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('nav.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
        </p>
      ) : planList.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('billing.empty', {}, { defaultValue: 'No plans available.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))}>
          {planList.map((tier) => {
            const monthly = tier.prices.find((p) => p.period === 'month') ?? tier.prices[0]
            const isCurrent = tier.key === currentCategory
            const ctaBusy = busy === tier.key
            return (
              <article
                key={tier.key}
                data-testid={`plan-${tier.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl shadow-sm border flex flex-col gap-4 overflow-hidden',
                  isCurrent
                    ? 'bg-gradient-to-br from-primary to-primary-dark text-on-primary border-transparent shadow-xl shadow-primary/20'
                    : 'bg-surface-container-lowest border-outline-variant/40 text-on-surface',
                )}
              >
                <p
                  className={cm.cn(
                    'text-[10px] uppercase tracking-[0.25em] font-bold',
                    isCurrent ? 'text-white/80' : 'text-on-surface-variant',
                  )}
                >
                  {tier.name}
                </p>
                <p className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
                  <span className="text-5xl font-extrabold tracking-tight tabular-nums">
                    {monthly?.price ?? '—'}
                  </span>
                  <span
                    className={cm.cn(
                      'text-sm',
                      isCurrent ? 'text-white/80' : 'text-on-surface-variant',
                    )}
                  >
                    {monthly?.period ? ` / ${monthly.period}` : ''}
                  </span>
                </p>
                <ul
                  className={cm.cn(
                    cm.stack(1),
                    'text-sm leading-relaxed',
                    isCurrent ? 'text-white/90' : 'text-on-surface-variant',
                  )}
                >
                  <li>
                    <span className="font-bold">Workbooks:</span>{' '}
                    {fmtNum(tier.limits.maxSpreadsheets)}
                  </li>
                  <li>
                    <span className="font-bold">Rows/sheet:</span> {fmtNum(tier.limits.maxRows)}
                  </li>
                  <li>
                    <span className="font-bold">Columns/sheet:</span>{' '}
                    {fmtNum(tier.limits.maxColumns)}
                  </li>
                  <li>
                    <span className="font-bold">History retention:</span>{' '}
                    {tier.limits.retentionDays ? `${tier.limits.retentionDays}d` : '—'}
                  </li>
                  <li>
                    <span className="font-bold">CSV export:</span> {fmtBool(tier.limits.canExport)}
                  </li>
                  <li>
                    <span className="font-bold">Advanced features:</span>{' '}
                    {fmtBool(tier.limits.advancedFeatures)}
                  </li>
                </ul>
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className={
                      'mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full bg-surface text-primary cursor-default'
                    }
                  >
                    {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
                  </button>
                ) : tier.key === 'free' ? (
                  <button
                    type="button"
                    disabled
                    className={
                      'mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full border border-outline-variant text-on-surface-variant cursor-default opacity-70'
                    }
                  >
                    {t('billing.freePlan', {}, { defaultValue: 'Free plan' })}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => upgrade(monthly?.stripePriceId ?? null, tier.key)}
                    disabled={ctaBusy || !monthly?.stripePriceId}
                    data-testid={`upgrade-${tier.key}`}
                    className={
                      'mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-colors disabled:opacity-50'
                    }
                  >
                    {ctaBusy
                      ? t('billing.starting', {}, { defaultValue: 'Starting checkout…' })
                      : t(
                          'billing.upgrade',
                          { name: tier.name },
                          { defaultValue: 'Upgrade to {{name}}' },
                        )}
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}
    </WorkbenchLayout>
  )
}

export default Billing
