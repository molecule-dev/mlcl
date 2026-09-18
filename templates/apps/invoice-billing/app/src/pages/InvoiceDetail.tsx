import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ActivityFeed, type ActivityItem, type ActivityKind } from '../components/ActivityFeed.js'
import { type InvoiceStatus, InvoiceStatusBadge } from '../components/InvoiceStatusBadge.js'

interface InvoiceData {
  id: string
  invoice_number: string
  status: string
  client_id?: string | null
  client_name?: string | null
  client_company?: string | null
  total: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  amount_paid: number
  currency: string
  notes: string | null
  due_date: string | null
  sent_at: string | null
  created_at: string | null
  items: Array<{ description: string; quantity: number; unit_price: number }>
}

interface ClientData {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
}

interface PaymentData {
  id: string
  amount: number
  method: string
  reference: string | null
  status: string
  created_at: string | null
}

const formatCurrency = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)

const formatDate = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function dueLabel(t: ReturnType<typeof useTranslation>['t'], dueDate: string | null) {
  if (!dueDate) return t('invoiceDetail.dueLabelNone', {}, { defaultValue: 'No due date' })
  const due = new Date(dueDate).getTime()
  const now = Date.now()
  const days = Math.round((due - now) / (1000 * 60 * 60 * 24))
  if (days > 0) return t('invoiceDetail.dueIn', { days }, { defaultValue: 'Due in {{days}} days' })
  if (days === 0) return t('invoiceDetail.dueToday', {}, { defaultValue: 'Due today' })
  return t('invoiceDetail.dueAgo', { days: -days }, { defaultValue: '{{days}} days overdue' })
}

export function InvoiceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()

  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [client, setClient] = useState<ClientData | null>(null)
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'send' | 'duplicate' | 'pdf' | 'pay' | 'void' | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    try {
      const inv = await http.get<InvoiceData>(`/api/invoices/${id}`)
      setInvoice(inv.data)
      if (inv.data?.client_id) {
        try {
          const c = await http.get<ClientData>(`/api/clients/${inv.data.client_id}`)
          setClient(c.data)
        } catch (_error) {
          // Client lookup is best-effort; invoice can display without it
          setClient(null)
        }
      }
      try {
        const pays = await http.get<PaymentData[]>(`/api/payments?invoice_id=${id}`)
        setPayments(Array.isArray(pays.data) ? pays.data : [])
      } catch (_error) {
        // Payments lookup is best-effort; invoice can display without payment history
        setPayments([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load invoice')
    }
  }, [http, id])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleSend = async () => {
    if (!invoice) return
    setBusy('send')
    setFeedback(null)
    try {
      await http.post(`/api/invoices/${invoice.id}/send`, {})
      setFeedback(t('invoiceDetail.feedback.sent', {}, { defaultValue: 'Invoice sent.' }))
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setBusy(null)
    }
  }

  const handleDownload = () => {
    if (!invoice) return
    setBusy('pdf')
    try {
      window.open(`/api/invoices/${invoice.id}/pdf`, '_blank', 'noopener')
    } finally {
      setBusy(null)
    }
  }

  const handleDuplicate = async () => {
    if (!invoice) return
    setBusy('duplicate')
    setFeedback(null)
    try {
      const dup = await http.post<InvoiceData>(`/api/invoices/${invoice.id}/duplicate`, {})
      if (dup.data?.id) navigate(`/invoices/${dup.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplicate failed')
    } finally {
      setBusy(null)
    }
  }

  const handleVoid = async () => {
    if (!invoice) return
    setBusy('void')
    setFeedback(null)
    try {
      await http.post(`/api/invoices/${invoice.id}/void`, {})
      setFeedback(t('invoiceDetail.feedback.voided', {}, { defaultValue: 'Invoice voided.' }))
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Void failed')
    } finally {
      setBusy(null)
    }
  }

  const handleRecordPayment = async () => {
    if (!invoice) return
    const remaining = Number(invoice.total) - Number(invoice.amount_paid)
    if (remaining <= 0) {
      setFeedback(
        t('invoiceDetail.feedback.alreadyPaid', {}, { defaultValue: 'Invoice is already paid.' }),
      )
      return
    }
    setBusy('pay')
    setFeedback(null)
    try {
      await http.post('/api/payments', {
        invoice_id: invoice.id,
        amount: remaining,
        method: 'manual',
        reference: 'Recorded from invoice page',
      })
      setFeedback(t('invoiceDetail.feedback.paid', {}, { defaultValue: 'Payment recorded.' }))
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record payment')
    } finally {
      setBusy(null)
    }
  }

  if (!invoice) {
    return (
      <div data-mol-id="page-invoice-detail" style={{ padding: '40px', textAlign: 'center' }}>
        {error ? (
          <p role="alert" style={{ color: 'var(--color-danger-hover)' }}>
            {error}
          </p>
        ) : (
          <p style={{ color: 'var(--mol-color-text-secondary)' }}>
            {t('invoiceDetail.loading', {}, { defaultValue: 'Loading invoice…' })}
          </p>
        )}
        <Link to="/invoices" style={{ color: 'var(--color-sidebar-hover)', fontWeight: 600 }}>
          {t('invoiceDetail.back', {}, { defaultValue: '← Back to invoices' })}
        </Link>
      </div>
    )
  }

  const total = invoice.total
  const subtotal = invoice.subtotal
  const tax = invoice.tax_amount
  const amountPaid = invoice.amount_paid
  const balance = total - amountPaid
  const status = (invoice.status as InvoiceStatus) ?? 'draft'

  const timeline: ActivityItem[] = []
  if (invoice.created_at) {
    timeline.push({
      id: 'created',
      kind: 'created' as ActivityKind,
      invoice_number: invoice.invoice_number,
      client_name: invoice.client_name ?? '',
      message: t('invoiceDetail.event.created', {}, { defaultValue: 'Invoice drafted' }),
      occurred_at: invoice.created_at,
    })
  }
  if (invoice.sent_at) {
    timeline.unshift({
      id: 'sent',
      kind: 'sent' as ActivityKind,
      invoice_number: invoice.invoice_number,
      client_name: invoice.client_name ?? '',
      message: t('invoiceDetail.event.sent', {}, { defaultValue: 'Invoice sent' }),
      amount_cents: Math.round(total * 100),
      occurred_at: invoice.sent_at,
    })
  }
  for (const p of payments) {
    timeline.unshift({
      id: 'pay-' + p.id,
      kind: 'paid' as ActivityKind,
      invoice_number: invoice.invoice_number,
      client_name: invoice.client_name ?? '',
      message: t(
        'invoiceDetail.event.paid',
        { method: p.method },
        { defaultValue: 'Payment received via {{method}}' },
      ),
      amount_cents: Math.round(p.amount * 100),
      occurred_at: p.created_at ?? new Date().toISOString(),
    })
  }

  return (
    <div
      data-mol-id="page-invoice-detail"
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
    >
      <div>
        <Link
          to="/invoices"
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-sidebar-hover)',
            textDecoration: 'none',
          }}
        >
          {t('invoiceDetail.back', {}, { defaultValue: '← Back to invoices' })}
        </Link>
      </div>

      {feedback ? (
        <div
          role="status"
          data-testid="invoice-feedback"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-paid-light)',
            color: 'var(--color-paid)',
            borderRadius: '12px',
            fontSize: '13px',
            border: '1px solid var(--color-paid-light)',
          }}
        >
          {feedback}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-overdue-light)',
            color: 'var(--color-danger-hover)',
            borderRadius: '12px',
            fontSize: '13px',
            border:
              '1px solid color-mix(in srgb, var(--mol-color-error) 40%, var(--mol-color-surface))',
          }}
        >
          {error}
        </div>
      ) : null}

      <section
        className={cm.cn(cm.sp('p', 8), 'rounded-2xl text-white relative overflow-hidden')}
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-sidebar-hover) 60%, var(--color-auth-gradient-end) 100%)',
        }}
      >
        <div
          className={cm.cn(cm.flex({ align: 'start', justify: 'between' }))}
          style={{ flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1 }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 700,
              }}
            >
              {t('invoiceDetail.eyebrow', {}, { defaultValue: 'Invoice' })}
            </span>
            <h1
              data-testid="invoice-number"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '32px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                margin: '4px 0 0',
              }}
            >
              {invoice.invoice_number}
            </h1>
            <p style={{ marginTop: '6px', fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>
              {t(
                'invoiceDetail.summary',
                {
                  client: invoice.client_name ?? 'Client',
                  date: formatDate(invoice.sent_at ?? invoice.created_at),
                },
                { defaultValue: '{{client}} · sent {{date}}' },
              )}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className={cm.cn(cm.flex({ justify: 'end' }))} style={{ marginBottom: '12px' }}>
              <InvoiceStatusBadge status={status} />
            </div>
            <div
              data-testid="invoice-total"
              style={{
                fontSize: '40px',
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.025em',
              }}
            >
              {formatCurrency(total, invoice.currency)}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
              {status === 'void'
                ? t('invoiceDetail.voided', {}, { defaultValue: 'Voided' })
                : status === 'paid' || balance <= 0
                  ? t('invoiceDetail.paidInFull', {}, { defaultValue: 'Paid in full' })
                  : dueLabel(t, invoice.due_date)}
            </div>
          </div>
        </div>
        <div
          className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 8))}
          style={{ position: 'relative', zIndex: 1, flexWrap: 'wrap' }}
        >
          <button
            type="button"
            data-action="send-invoice"
            onClick={handleSend}
            disabled={busy !== null || status === 'void'}
            style={{
              padding: '10px 18px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-sidebar-text-active)',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy === 'send' ? 0.6 : 1,
            }}
          >
            {status === 'sent' || status === 'paid' || status === 'partial'
              ? t('invoiceDetail.action.resend', {}, { defaultValue: 'Resend invoice' })
              : t('invoiceDetail.action.send', {}, { defaultValue: 'Send invoice' })}
          </button>
          <button
            type="button"
            data-action="download-pdf"
            onClick={handleDownload}
            disabled={busy !== null}
            style={{
              padding: '10px 18px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: 'var(--color-sidebar-text-active)',
              fontWeight: 600,
              fontSize: '13px',
              border: '1px solid rgba(255,255,255,0.4)',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {t('invoiceDetail.action.download', {}, { defaultValue: 'Download PDF' })}
          </button>
          {status === 'draft' ? (
            <Link
              to={`/invoices/new?edit=${invoice.id}`}
              data-action="edit-invoice"
              style={{
                padding: '10px 18px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: 'var(--color-sidebar-text-active)',
                fontWeight: 600,
                fontSize: '13px',
                border: '1px solid rgba(255,255,255,0.4)',
                textDecoration: 'none',
              }}
            >
              {t('invoiceDetail.action.edit', {}, { defaultValue: 'Edit' })}
            </Link>
          ) : null}
          <button
            type="button"
            data-action="duplicate-invoice"
            onClick={handleDuplicate}
            disabled={busy !== null}
            style={{
              padding: '10px 18px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: 'var(--color-sidebar-text-active)',
              fontWeight: 600,
              fontSize: '13px',
              border: '1px solid rgba(255,255,255,0.4)',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {t('invoiceDetail.action.duplicate', {}, { defaultValue: 'Duplicate' })}
          </button>
          {balance > 0 && status !== 'void' ? (
            <button
              type="button"
              data-action="record-payment"
              onClick={handleRecordPayment}
              disabled={busy !== null}
              style={{
                padding: '10px 18px',
                borderRadius: '9999px',
                backgroundColor: 'var(--color-paid)',
                color: 'var(--color-sidebar-text-active)',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {t('invoiceDetail.action.markPaid', {}, { defaultValue: 'Mark as paid' })}
            </button>
          ) : null}
          {status !== 'void' && status !== 'paid' ? (
            <button
              type="button"
              data-action="void-invoice"
              onClick={handleVoid}
              disabled={busy !== null}
              style={{
                padding: '10px 18px',
                borderRadius: '9999px',
                backgroundColor: 'transparent',
                color: 'var(--color-sidebar-text-active)',
                fontWeight: 600,
                fontSize: '13px',
                border: '1px solid rgba(255,255,255,0.4)',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {t('invoiceDetail.action.void', {}, { defaultValue: 'Void' })}
            </button>
          ) : null}
        </div>
        <div
          style={{
            position: 'absolute',
            right: '-90px',
            bottom: '-90px',
            width: '320px',
            height: '320px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            filter: 'blur(60px)',
          }}
        />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <section
          className={cm.cn(cm.sp('p', 8), 'bg-surface rounded-2xl shadow-sm')}
          style={{ border: '1px solid var(--mol-color-border)' }}
        >
          <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }))}>
            <div>
              <span
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--mol-color-text-tertiary)',
                  fontWeight: 700,
                }}
              >
                {t('invoiceDetail.billTo', {}, { defaultValue: 'Bill to' })}
              </span>
              <p
                data-testid="bill-to-name"
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--mol-color-text)',
                  margin: '4px 0 0',
                }}
              >
                {invoice.client_name ?? client?.name ?? '—'}
              </p>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--mol-color-text-secondary)',
                  margin: '2px 0 0',
                }}
              >
                {client?.email ?? ''}
                {client?.phone ? ' · ' + client.phone : ''}
              </p>
            </div>
            <div
              style={{
                textAlign: 'right',
                fontSize: '13px',
                color: 'var(--mol-color-text-secondary)',
              }}
            >
              <p>
                {t(
                  'invoiceDetail.issued',
                  { date: formatDate(invoice.created_at) },
                  { defaultValue: 'Issued {{date}}' },
                )}
              </p>
              <p style={{ marginTop: '2px' }}>
                {t(
                  'invoiceDetail.due',
                  { date: formatDate(invoice.due_date) },
                  { defaultValue: 'Due {{date}}' },
                )}
              </p>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2.6fr 0.6fr 0.9fr 0.9fr',
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--mol-color-text-tertiary)',
                fontWeight: 800,
                paddingBottom: '8px',
                borderBottom: '1px solid var(--mol-color-border)',
              }}
            >
              <span>{t('form.description', {}, { defaultValue: 'Description' })}</span>
              <span>{t('invoiceDetail.col.qty', {}, { defaultValue: 'Qty' })}</span>
              <span style={{ textAlign: 'right' }}>
                {t('form.rate', {}, { defaultValue: 'Rate' })}
              </span>
              <span style={{ textAlign: 'right' }}>
                {t('form.amount', {}, { defaultValue: 'Amount' })}
              </span>
            </div>
            {invoice.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.6fr 0.6fr 0.9fr 0.9fr',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--color-draft-light)',
                  alignItems: 'center',
                  fontSize: '14px',
                }}
              >
                <span style={{ color: 'var(--mol-color-text)', fontWeight: 500 }}>
                  {item.description}
                </span>
                <span style={{ color: 'var(--mol-color-text-secondary)' }}>{item.quantity}</span>
                <span
                  style={{
                    textAlign: 'right',
                    color: 'var(--mol-color-text-secondary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCurrency(item.unit_price, invoice.currency)}
                </span>
                <span
                  style={{
                    textAlign: 'right',
                    color: 'var(--mol-color-text)',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCurrency(item.quantity * item.unit_price, invoice.currency)}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '20px',
              display: 'grid',
              gap: '6px',
              maxWidth: '320px',
              marginLeft: 'auto',
            }}
          >
            <DetailRow
              label={t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
              value={formatCurrency(subtotal, invoice.currency)}
            />
            <DetailRow
              label={t(
                'invoiceDetail.tax',
                { rate: invoice.tax_rate },
                { defaultValue: 'Tax ({{rate}}%)' },
              )}
              value={formatCurrency(tax, invoice.currency)}
            />
            <DetailRow
              label={t('invoiceDetail.amountPaid', {}, { defaultValue: 'Amount paid' })}
              value={formatCurrency(amountPaid, invoice.currency)}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingTop: '12px',
                marginTop: '4px',
                borderTop: '2px solid var(--color-primary-dark)',
              }}
            >
              <span
                style={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '15px' }}
              >
                {t('invoiceDetail.balance', {}, { defaultValue: 'Balance due' })}
              </span>
              <span
                data-testid="invoice-balance"
                style={{
                  fontWeight: 800,
                  color: balance > 0 ? 'var(--color-accent)' : 'var(--color-primary-dark)',
                  fontSize: '22px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCurrency(balance, invoice.currency)}
              </span>
            </div>
          </div>

          {invoice.notes ? (
            <div
              style={{
                marginTop: '24px',
                padding: '14px 16px',
                backgroundColor: 'var(--mol-color-surface-secondary)',
                borderRadius: '12px',
                fontSize: '13px',
                color: 'var(--mol-color-text-secondary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {invoice.notes}
            </div>
          ) : null}
        </section>

        <ActivityFeed
          items={timeline}
          title={t('invoiceDetail.timeline', {}, { defaultValue: 'Timeline' })}
        />
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: '13px', color: 'var(--mol-color-text-secondary)' }}>{label}</span>
      <span
        style={{
          fontSize: '14px',
          color: 'var(--mol-color-text)',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  )
}

export default InvoiceDetail
