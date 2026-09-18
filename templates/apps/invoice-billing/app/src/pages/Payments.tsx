import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiStatCard } from '../components/KpiStatCard.js'

interface PaymentRow {
  id: string
  invoice_id: string | null
  invoice_number: string | null
  client_name: string | null
  method: string
  reference: string | null
  amount: number
  status: string
  created_at: string | null
}

const METHOD_THEME: Record<string, { label: string; bg: string; fg: string; icon: string }> = {
  stripe: {
    label: 'Stripe',
    bg: 'var(--color-payment-stripe-bg)',
    fg: 'var(--color-payment-stripe-fg)',
    icon: 'credit_card',
  },
  bank: {
    label: 'Bank',
    bg: 'var(--color-payment-bank-bg)',
    fg: 'var(--color-payment-bank-fg)',
    icon: 'account_balance',
  },
  paypal: {
    label: 'PayPal',
    bg: 'var(--color-payment-paypal-bg)',
    fg: 'var(--color-payment-paypal-fg)',
    icon: 'payments',
  },
  manual: {
    label: 'Manual',
    bg: 'var(--color-payment-manual-bg)',
    fg: 'var(--color-payment-manual-fg)',
    icon: 'edit_note',
  },
}

const STATUS_THEME: Record<string, { dot: string; label: string }> = {
  completed: { dot: 'var(--color-paid)', label: 'Completed' },
  pending: { dot: 'var(--color-unpaid)', label: 'Pending' },
  failed: { dot: 'var(--color-overdue)', label: 'Failed' },
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const formatDate = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function Payments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let active = true
    http
      .get<PaymentRow[]>('/api/payments')
      .then((r) => {
        if (active) setPayments(Array.isArray(r.data) ? r.data : [])
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load payments')
      })
    return () => {
      active = false
    }
  }, [http])

  const totals = useMemo(() => {
    let collected = 0
    let pending = 0
    let failed = 0
    for (const p of payments) {
      if (p.status === 'completed') collected += Number(p.amount)
      else if (p.status === 'pending') pending += Number(p.amount)
      else if (p.status === 'failed') failed += Number(p.amount)
    }
    return { collected, pending, failed }
  }, [payments])

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      const r = await fetch('/api/exports/payments.csv', {
        credentials: 'include',
        headers: http.defaultHeaders ?? {},
      })
      if (r.status === 402) {
        setError(
          t(
            'payments.exportRequiresPaid',
            {},
            { defaultValue: 'Exports are a paid feature — upgrade to enable.' },
          ),
        )
        return
      }
      if (!r.ok) {
        setError(t('payments.exportError', {}, { defaultValue: 'Export failed.' }))
        return
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'payments.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div data-mol-id="page-payments" className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div>
        <span
          style={{
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-primary-dark)',
            fontWeight: 700,
          }}
        >
          {t('payments.eyebrow', {}, { defaultValue: 'Cash flow' })}
        </span>
        <h1
          className={cm.cn(cm.fontWeight('bold'))}
          style={{
            fontSize: '28px',
            letterSpacing: '-0.02em',
            color: 'var(--mol-color-text)',
            margin: '4px 0 0',
          }}
        >
          {t('payments.title', {}, { defaultValue: 'Payments' })}
        </h1>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-overdue-light)',
            color: 'var(--color-danger-hover)',
            borderRadius: '12px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <KpiStatCard
          label={t('payments.kpi.collected', {}, { defaultValue: 'Collected' })}
          value={formatCurrency(totals.collected)}
          icon="paid"
          tone="revenue"
        />
        <KpiStatCard
          label={t('status.pending', {}, { defaultValue: 'Pending' })}
          value={formatCurrency(totals.pending)}
          icon="schedule_send"
          tone="outstanding"
        />
        <KpiStatCard
          label={t('status.failed', {}, { defaultValue: 'Failed' })}
          value={formatCurrency(totals.failed)}
          icon="error"
          tone="overdue"
        />
      </div>

      <section
        className={cm.cn('bg-surface rounded-2xl shadow-sm overflow-hidden')}
        style={{ border: '1px solid var(--mol-color-border)' }}
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
          style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-draft-light)' }}
        >
          <h3
            className={cm.cn(cm.fontWeight('bold'))}
            style={{ fontSize: '16px', color: 'var(--mol-color-text)', letterSpacing: '-0.01em' }}
          >
            {t('payments.history', {}, { defaultValue: 'Payment history' })}
          </h3>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            data-action="export-payments"
            style={{
              padding: '8px 14px',
              borderRadius: '9999px',
              backgroundColor: 'var(--mol-color-surface)',
              color: 'var(--color-primary-dark)',
              fontWeight: 600,
              fontSize: '12px',
              border: '1px solid var(--mol-color-border)',
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting
              ? t('common.exportingEllipsis', {}, { defaultValue: 'Exporting…' })
              : t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 1.4fr 1fr 1fr 1fr 0.8fr',
            padding: '12px 16px',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--mol-color-text-tertiary)',
            backgroundColor: 'var(--mol-color-surface-secondary)',
            borderBottom: '1px solid var(--mol-color-border)',
            alignItems: 'center',
          }}
        >
          <span />
          <span>{t('payments.col.method', {}, { defaultValue: 'Method' })}</span>
          <span>{t('nav.client', {}, { defaultValue: 'Client' })}</span>
          <span>{t('payments.col.invoice', {}, { defaultValue: 'Invoice' })}</span>
          <span>{t('payments.col.reference', {}, { defaultValue: 'Reference' })}</span>
          <span style={{ textAlign: 'right' }}>
            {t('form.amount', {}, { defaultValue: 'Amount' })}
          </span>
          <span>{t('nav.status', {}, { defaultValue: 'Status' })}</span>
        </div>
        {payments.length === 0 ? (
          <div
            data-testid="payments-empty"
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--mol-color-text-tertiary)',
              fontSize: '14px',
            }}
          >
            {t(
              'payments.empty',
              {},
              { defaultValue: 'No payments yet — record one from an invoice.' },
            )}
          </div>
        ) : (
          payments.map((p) => {
            const method = METHOD_THEME[p.method] ?? {
              label: p.method,
              bg: 'var(--color-payment-manual-bg)',
              fg: 'var(--color-payment-manual-fg)',
              icon: 'payments',
            }
            const status = STATUS_THEME[p.status] ?? {
              dot: 'var(--mol-color-text-secondary)',
              label: p.status,
            }
            return (
              <div
                key={p.id}
                data-testid={`payment-${p.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 1.4fr 1fr 1fr 1fr 0.8fr',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--color-draft-light)',
                  fontSize: '13px',
                }}
              >
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: method.bg,
                    color: method.fg,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {method.icon}
                  </span>
                </span>
                <div>
                  <div
                    style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mol-color-text)' }}
                  >
                    {t(`payments.method.${p.method}`, {}, { defaultValue: method.label })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--mol-color-text-tertiary)' }}>
                    {formatDate(p.created_at)}
                  </div>
                </div>
                <span style={{ color: 'var(--mol-color-text)', fontWeight: 500 }}>
                  {p.client_name ?? '—'}
                </span>
                {p.invoice_id ? (
                  <Link
                    to={`/invoices/${p.invoice_id}`}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'var(--color-sidebar-hover)',
                      fontWeight: 600,
                      fontSize: '12px',
                      textDecoration: 'none',
                    }}
                  >
                    {p.invoice_number ?? '—'}
                  </Link>
                ) : (
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'var(--color-primary-dark)',
                      fontWeight: 600,
                      fontSize: '12px',
                    }}
                  >
                    {p.invoice_number ?? '—'}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'var(--mol-color-text-tertiary)',
                    fontSize: '11px',
                  }}
                >
                  {p.reference ?? '—'}
                </span>
                <span
                  style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    color: 'var(--color-paid)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '15px',
                  }}
                >
                  {formatCurrency(Number(p.amount))}
                </span>
                <span
                  className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: status.dot,
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '9999px',
                      backgroundColor: status.dot,
                      display: 'inline-block',
                    }}
                  />
                  {t(`payments.status.${p.status}`, {}, { defaultValue: status.label })}
                </span>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}

export default Payments
