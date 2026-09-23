import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { formatDate, getDateFormat } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SETTINGS_SECTIONS = [
  { to: '/settings', key: 'general', defaultLabel: 'General', icon: 'tune' },
  { to: '/settings/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
]

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits?: Record<string, number | boolean>
}

interface PaymentRow {
  id: string
  description: string
  created_at: string | null
  amount_cents: number
  currency: string
  status: string
  receiptUrl: string | null
}

function fmtAmount(cents: number, currency: string): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${currency === 'USD' ? '$' : `${currency} `}${(abs / 100).toFixed(2)}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return formatDate(iso, getDateFormat())
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [invoices, setInvoices] = useState<PaymentRow[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/billing/status').catch(() => null),
      http.get('/api/payments').catch(() => null),
    ]).then(([bRes, pRes]) => {
      if (cancelled) return
      const b = unwrapSingle<BillingStatus>(bRes)
      if (b) setBilling(b)
      setInvoices(unwrapList<PaymentRow>(pRes))
      setLoadingInvoices(false)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  async function handleCancel() {
    if (!billing || billing.isFree) return
    if (
      !confirm(
        t(
          'billing.confirmCancel',
          {},
          {
            defaultValue:
              'Cancel your subscription? You will keep access until the end of the period.',
          },
        ),
      )
    )
      return
    setCancelling(true)
    try {
      await http.post('/api/billing/cancel', {})
      const bRes = await http.get('/api/billing/status').catch(() => null)
      const b = unwrapSingle<BillingStatus>(bRes)
      if (b) setBilling(b)
    } catch (_error) {
      // surfaced via reload of billing — the UI refreshes billing status regardless
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8 max-w-5xl mx-auto')}>
      <header>
        <p
          className={cm.cn(
            cm.fontWeight('extrabold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1
          className={cm.cn(cm.fontWeight('extrabold'), 'text-3xl md:text-4xl tracking-tight mt-1')}
        >
          {t('settings.billing', {}, { defaultValue: 'Billing' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'billing.subheading',
            { app: APP_NAME },
            { defaultValue: 'Your {{app}} plan, payment method, and invoice history.' },
          )}
        </p>
      </header>

      <div className={cm.grid({ cols: 12, gap: 'md' })}>
        <nav
          className={cm.cn(
            'col-span-12 md:col-span-3',
            cm.sp('p', 2),
            'bg-surface-container-lowest rounded-2xl shadow-sm self-start sticky top-6',
          )}
        >
          <ul className={cm.stack(1)}>
            {SETTINGS_SECTIONS.map((s) => {
              const active = s.key === 'billing'
              return (
                <li key={s.key}>
                  <Link
                    to={s.to}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'rounded-xl transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface hover:bg-surface-container-low',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
                      {s.icon}
                    </span>
                    {t(`settingsSubNav.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className={cm.cn('col-span-12 md:col-span-9 space-y-6')}>
          {/* Plan hero */}
          <section
            className={cm.cn(
              cm.sp('p', 8),
              'bg-gradient-to-br from-primary to-primary-container text-white rounded-[2rem] relative overflow-hidden',
            )}
            data-testid="billing-plan-hero"
          >
            <div className="relative z-10">
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
                <div>
                  <p
                    className={cm.cn(
                      cm.fontWeight('extrabold'),
                      'text-[10px] uppercase tracking-widest text-white/70',
                    )}
                  >
                    {t('billing.currentPlanEyebrow', {}, { defaultValue: 'Current plan' })}
                  </p>
                  <h2
                    className={cm.cn('text-4xl font-extrabold tracking-tight mt-2')}
                    data-testid="billing-plan-name"
                  >
                    {billing
                      ? billing.name
                      : t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                  </h2>
                  <p
                    className={cm.cn(cm.sp('mt', 2), 'text-white/85')}
                    data-testid="billing-plan-key"
                  >
                    {billing
                      ? t(
                          'billing.planLine',
                          { key: billing.planKey },
                          { defaultValue: 'Plan key: {{key}}' },
                        )
                      : ''}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.roundedFull,
                    'bg-surface/20 backdrop-blur-md text-sm font-extrabold tracking-tight',
                  )}
                >
                  {billing?.isFree
                    ? t('nav.free', {}, { defaultValue: 'Free' })
                    : t('billing.paidBadge', {}, { defaultValue: 'Paid' })}
                </span>
              </div>
              <div className={cm.flex({ gap: 'sm' })}>
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  className={cm.cn(
                    cm.sp('mt', 6),
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('extrabold'),
                    cm.textSize('sm'),
                    'inline-flex rounded-full bg-surface text-primary hover:bg-surface/90 transition-colors',
                  )}
                  data-testid="billing-change-plan"
                >
                  {billing?.isFree
                    ? t('billing.upgradePlan', {}, { defaultValue: 'Upgrade plan' })
                    : t('billing.changePlan', {}, { defaultValue: 'Change plan' })}
                </button>
                {billing && !billing.isFree ? (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className={cm.cn(
                      cm.sp('mt', 6),
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('extrabold'),
                      cm.textSize('sm'),
                      'inline-flex rounded-full border border-surface/30 text-white hover:bg-surface/10 transition-colors disabled:opacity-60',
                    )}
                    data-testid="billing-cancel-plan"
                  >
                    {cancelling
                      ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                      : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
                  </button>
                ) : null}
              </div>
            </div>
            <span
              className={cm.cn(
                cm.w(80),
                cm.h(80),
                cm.roundedFull,
                'absolute -right-32 -bottom-32 bg-surface/10 blur-3xl pointer-events-none',
              )}
              aria-hidden="true"
            />
          </section>

          {/* Invoices */}
          <section
            className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          >
            <header className={cm.sp('mb', 4)}>
              <p
                className={cm.cn(
                  cm.fontWeight('extrabold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nav.history', {}, { defaultValue: 'History' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                {t('nav.invoices', {}, { defaultValue: 'Invoices' })}
              </h2>
            </header>
            <div className="overflow-x-auto">
              {loadingInvoices ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('billing.loadingInvoices', {}, { defaultValue: 'Loading invoices…' })}
                </p>
              ) : invoices.length === 0 ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  data-testid="billing-invoices-empty"
                >
                  {t(
                    'billing.noInvoices',
                    {},
                    {
                      defaultValue:
                        'No invoices yet. Past payments will appear here once your first subscription renews.',
                    },
                  )}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className={cm.cn('w-full text-sm')} data-testid="billing-invoices-table">
                    <thead>
                      <tr
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant uppercase tracking-widest',
                        )}
                      >
                        <th className={cm.cn('text-left font-extrabold py-3')}>
                          {t('form.date', {}, { defaultValue: 'Date' })}
                        </th>
                        <th className={cm.cn('text-left font-extrabold py-3')}>
                          {t('form.description', {}, { defaultValue: 'Description' })}
                        </th>
                        <th className={cm.cn('text-right font-extrabold py-3')}>
                          {t('form.amount', {}, { defaultValue: 'Amount' })}
                        </th>
                        <th className={cm.cn('text-left font-extrabold py-3 pl-4')}>
                          {t('nav.status', {}, { defaultValue: 'Status' })}
                        </th>
                        <th className={cm.cn('text-right font-extrabold py-3')}>
                          {t('billing.col.receipt', {}, { defaultValue: 'Receipt' })}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {invoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className={cm.cn('hover:bg-surface-container-low transition-colors')}
                        >
                          <td className={cm.cn('py-3 tabular-nums text-on-surface-variant')}>
                            {fmtDate(inv.created_at)}
                          </td>
                          <td className={cm.cn('py-3 font-semibold')}>{inv.description}</td>
                          <td className={cm.cn('py-3 text-right tabular-nums font-bold')}>
                            {fmtAmount(inv.amount_cents, inv.currency)}
                          </td>
                          <td className={cm.cn('py-3 pl-4')}>
                            <span
                              className={cm.cn(
                                'inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-success/15 text-success',
                              )}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className={cm.cn('py-3 text-right')}>
                            {inv.receiptUrl ? (
                              <a
                                href={inv.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={cm.cn(
                                  cm.fontWeight('bold'),
                                  cm.textPrimary,
                                  'hover:underline text-xs inline-flex items-center gap-1',
                                )}
                              >
                                <span
                                  className={cm.cn(
                                    cm.textSize('base'),
                                    'material-symbols-outlined',
                                  )}
                                >
                                  open_in_new
                                </span>
                                {t('billing.viewReceipt', {}, { defaultValue: 'View' })}
                              </a>
                            ) : (
                              <span className={cm.cn('text-xs text-on-surface-variant')}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
