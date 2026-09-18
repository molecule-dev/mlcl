import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PlanInfo {
  planKey: string
  name: string
  category: string
  limits: Record<string, unknown>
  isFree: boolean
}

interface InvoiceRow {
  id: string
  transactionId: string
  productId: string
  amountCents: number | null
  status: string
  receiptUrl: string | null
  createdAt: string
}

interface BillingSummary {
  plan: PlanInfo
  invoices: InvoiceRow[]
}

const STATUS_CLASS: Record<string, string> = {
  paid: 'bg-success-container text-on-success-container',
  succeeded: 'bg-success-container text-on-success-container',
  pending: 'bg-secondary-container text-on-secondary-container',
  failed: 'bg-error-container text-on-error-container',
}

function statusClass(status: string): string {
  return STATUS_CLASS[status.toLowerCase()] ?? 'bg-info-container text-on-info-container'
}

function formatAmount(cents: number | null): string {
  if (cents == null || Number.isNaN(cents)) return '—'
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(value: string): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get<BillingSummary>('/billing/summary')
      .then((res) => {
        if (cancelled) return
        setSummary(res.data ?? null)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('billing.loadError', {}, { defaultValue: 'Could not load billing summary.' }))
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const plan = summary?.plan
  const invoices = summary?.invoices ?? []
  const aiLimit =
    typeof plan?.limits?.maxGenerate === 'number' ? (plan.limits.maxGenerate as number) : null

  async function handleCancel() {
    setBusy(true)
    setActionMessage(null)
    try {
      await http.post('/billing/cancel', {})
      setActionMessage(
        t(
          'billing.cancelSuccess',
          {},
          { defaultValue: 'Subscription cancelled. Refresh to update plan.' },
        ),
      )
    } catch (error) {
      logError('billing.cancel', error)
      setActionMessage(
        t('billing.cancelFailed', {}, { defaultValue: 'Could not cancel subscription.' }),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('p', 8), 'bg-background min-h-screen')}>
      <div className={cm.cn('max-w-5xl', cm.mxAuto, cm.stack(8))}>
        <div>
          <h1
            className={cm.cn(
              'text-3xl font-extrabold tracking-tight font-serif text-on-background',
            )}
          >
            {t('settings.billing', {}, { defaultValue: 'Billing' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textMuted)}>
            {t(
              'billing.subtitle',
              {},
              { defaultValue: 'Manage your plan, AI usage, and payment history.' },
            )}
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : null}
        {actionMessage ? (
          <div
            role="status"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-lg bg-info-container text-on-info-container',
            )}
          >
            {actionMessage}
          </div>
        ) : null}

        <section
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl text-white relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark shadow-lg',
          )}
        >
          <div className="relative z-10">
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'uppercase tracking-widest text-white/70',
              )}
            >
              {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
            </p>
            <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), cm.sp('mb', 6))}>
              <span className="text-4xl font-extrabold tracking-tight font-serif">
                {plan?.name ?? t('billing.loadingPlan', {}, { defaultValue: 'Loading plan…' })}
              </span>
            </div>
            {aiLimit !== null ? (
              <div className={cm.cn(cm.stack(2), cm.sp('mb', 6))}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('sm'),
                  )}
                >
                  <span className="font-medium text-white/80">
                    {t('billing.aiWordsLabel', {}, { defaultValue: 'AI generations included' })}
                  </span>
                  <span className="font-mono tabular-nums">
                    {aiLimit >= 999_999
                      ? t('billing.unlimited', {}, { defaultValue: 'Unlimited' })
                      : aiLimit.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : null}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
              )}
            >
              <p className={cm.cn(cm.textSize('sm'), 'text-white/80')}>
                {plan?.isFree
                  ? t('billing.freePlan', {}, { defaultValue: 'You are on the free plan.' })
                  : t('billing.activePlan', {}, { defaultValue: 'Subscription active.' })}
              </p>
              <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-full bg-surface/20 backdrop-blur-md hover:bg-surface/30 transition-colors',
                  )}
                >
                  {plan?.isFree
                    ? t('billing.viewPlans', {}, { defaultValue: 'View plans' })
                    : t('billing.changePlan', {}, { defaultValue: 'Change plan' })}
                </button>
                {plan && !plan.isFree ? (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={busy}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'rounded-full bg-surface text-primary hover:bg-surface/90 transition-colors disabled:opacity-60',
                    )}
                  >
                    {busy
                      ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                      : t('billing.cancelPlan', {}, { defaultValue: 'Cancel plan' })}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div
            className={cm.cn(
              'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute right-12 top-8 w-20 h-20 rounded-full bg-secondary/30 blur-xl',
            )}
            aria-hidden="true"
          />
        </section>

        <section
          className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface border border-outline-variant')}
        >
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('mb', 4),
              'text-lg font-extrabold tracking-tight font-serif',
            )}
          >
            <span className="material-symbols-outlined text-primary" aria-hidden="true">
              receipt_long
            </span>
            {t('billing.history', {}, { defaultValue: 'Invoice history' })}
          </h2>
          {summary === null ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('billing.loading', {}, { defaultValue: 'Loading invoices…' })}
            </p>
          ) : invoices.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-serif italic')}>
              {t(
                'billing.noInvoices',
                {},
                {
                  defaultValue: 'No invoices yet. Invoices appear here after a successful payment.',
                },
              )}
            </p>
          ) : (
            <table className={cm.cn('w-full text-sm')}>
              <thead>
                <tr className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                  <th className={cm.cn('text-left pb-3')}>
                    {t('form.date', {}, { defaultValue: 'Date' })}
                  </th>
                  <th className={cm.cn('text-left pb-3')}>
                    {t('billing.col.invoice', {}, { defaultValue: 'Invoice' })}
                  </th>
                  <th className={cm.cn('text-right pb-3')}>
                    {t('form.amount', {}, { defaultValue: 'Amount' })}
                  </th>
                  <th className={cm.cn('text-right pb-3')}>
                    {t('nav.status', {}, { defaultValue: 'Status' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={cm.cn('hover:bg-surface-container-low transition-colors')}
                  >
                    <td className={cm.cn('py-3 font-serif')}>{formatDate(inv.createdAt)}</td>
                    <td className={cm.cn('py-3 font-mono text-xs text-on-surface-variant')}>
                      {inv.transactionId || inv.id.slice(0, 8)}
                    </td>
                    <td className={cm.cn('py-3 text-right font-mono tabular-nums')}>
                      {formatAmount(inv.amountCents)}
                    </td>
                    <td className={cm.cn('py-3 text-right')}>
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.sp('px', 2),
                          cm.roundedFull,
                          'text-[10px] uppercase tracking-widest py-0.5',
                          statusClass(inv.status),
                        )}
                      >
                        {t(
                          `billing.status.${inv.status.toLowerCase()}`,
                          {},
                          { defaultValue: inv.status },
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className={cm.cn(cm.sp('mt', 6), cm.flex({ align: 'center', justify: 'between' }))}>
            <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t('billing.helpHint', {}, { defaultValue: 'Need help with billing?' })}
            </span>
            <Link
              to="/settings"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-primary hover:text-primary-dark',
              )}
            >
              {t('billing.openSettings', {}, { defaultValue: 'Open account settings' })}
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Billing
export { Billing as BillingPage }
