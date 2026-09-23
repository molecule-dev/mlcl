import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type InvoiceStatus, InvoiceStatusPill } from '../components/InvoiceStatusPill.js'
import { formatCents } from '../lib/format.js'
import type { ApiClient, ApiInvoice } from '../lib/types.js'
import { unwrapSingle } from '../lib/unwrap.js'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function deriveStatus(inv: ApiInvoice): InvoiceStatus {
  if (inv.status === 'paid') return 'paid'
  if (inv.status === 'void' || inv.status === 'cancelled') return 'void'
  if (inv.status === 'draft') return 'draft'
  if (inv.due_at && new Date(inv.due_at).getTime() < Date.now()) return 'overdue'
  return 'sent'
}

export function InvoiceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [invoice, setInvoice] = useState<ApiInvoice | null>(null)
  const [client, setClient] = useState<ApiClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/invoices/${id}`)
      .then(async (res) => {
        if (cancelled) return
        const inv = unwrapSingle<ApiInvoice>(res)
        if (!inv) {
          setInvoice(null)
          return
        }
        setInvoice(inv)
        if (inv.client_id) {
          try {
            const cres = await http.get(`/api/clients/${inv.client_id}`)
            if (!cancelled) setClient(unwrapSingle<ApiClient>(cres))
          } catch (_error) {
            // client fetch is best-effort; invoice can render without client details
            if (!cancelled) setClient(null)
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, version])

  const subtotal = invoice?.subtotal_cents ?? 0
  const tax = invoice?.tax_cents ?? 0
  const total = invoice?.total_cents ?? 0
  const currency = invoice?.currency ?? 'USD'

  const lineItems = useMemo(() => invoice?.line_items ?? [], [invoice])

  const setStatus = async (status: ApiInvoice['status']) => {
    if (!invoice) return
    setActing(true)
    setError(null)
    try {
      await http.put(`/api/invoices/${invoice.id}`, { status })
      void track({
        name: 'invoice.status_changed',
        properties: { invoice_id: invoice.id, status },
      })
      setVersion((n) => n + 1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setActing(false)
    }
  }

  const onPdf = () => {
    if (!invoice) return
    window.print()
  }

  if (loading) {
    return (
      <p
        className={cm.cn(
          cm.sp('p', 12),
          cm.textCenter,
          cm.textSize('sm'),
          'text-foreground-secondary',
        )}
        data-test="invoice-loading"
      >
        {t('invoiceDetail.loading', {}, { defaultValue: 'Loading invoice…' })}
      </p>
    )
  }

  if (!invoice) {
    return (
      <div
        className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.stack(4))}
        data-test="invoice-missing"
      >
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
          {t('invoiceDetail.notFound', {}, { defaultValue: 'Invoice not found.' })}
        </p>
        <Link to="/invoices" className={cm.cn(cm.textSize('sm'), 'text-blue-600 hover:underline')}>
          {t('invoiceDetail.back', {}, { defaultValue: 'Back to invoices' })}
        </Link>
      </div>
    )
  }

  const status = deriveStatus(invoice)
  const isPaid = invoice.status === 'paid'

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(6), 'max-w-[1100px] mx-auto')}
      data-test="invoice-detail"
    >
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('xs'),
          'text-foreground-secondary',
        )}
      >
        <Link
          to="/invoices"
          className={cm.cn('hover:text-blue-600 uppercase tracking-widest font-bold')}
        >
          {t('nav.invoices', {}, { defaultValue: 'Invoices' })}
        </Link>
        <span className={cm.cn('material-symbols-outlined text-base')}>chevron_right</span>
        <span className={cm.cn('uppercase tracking-widest font-bold text-foreground')}>
          {invoice.number}
        </span>
      </nav>

      {error && (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'text-error bg-rose-50 border border-rose-200 rounded-lg',
          )}
        >
          {error}
        </p>
      )}

      <section
        className={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' }))}
      >
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              'font-extrabold tracking-tight text-foreground tabular-nums font-mono',
            )}
          >
            {invoice.number}
          </h1>
          <InvoiceStatusPill status={status} />
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            onClick={onPdf}
            type="button"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2.5),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-surface border border-border text-foreground hover:bg-surface-secondary transition-colors',
            )}
            data-test="invoice-pdf"
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>print</span>
            {t('invoiceDetail.downloadPdf', {}, { defaultValue: 'Print / PDF' })}
          </button>
          {invoice.status === 'draft' && (
            <button
              onClick={() => void setStatus('sent')}
              disabled={acting}
              type="button"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2.5),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60',
              )}
              data-test="invoice-send"
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>send</span>
              {t('invoiceDetail.send', {}, { defaultValue: 'Send to client' })}
            </button>
          )}
          {!isPaid && invoice.status !== 'void' && invoice.status !== 'cancelled' && (
            <button
              onClick={() => void setStatus('paid')}
              disabled={acting}
              type="button"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2.5),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-secondary text-on-secondary shadow-md hover:bg-secondary-dark transition-all disabled:opacity-60',
              )}
              data-test="invoice-mark-paid"
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                check_circle
              </span>
              {t('invoiceDetail.markPaid', {}, { defaultValue: 'Mark paid' })}
            </button>
          )}
        </div>
      </section>

      <article className={cm.cn(cm.sp('p', 10), 'bg-surface rounded-2xl shadow-sm')}>
        <header
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'start', wrap: 'wrap', gap: 'md' }),
            cm.sp('mb', 10),
          )}
        >
          <div className={cm.stack(1)}>
            <p className={cm.cn('text-[10px] uppercase tracking-widest font-bold text-blue-600')}>
              {t('invoiceDetail.billTo', {}, { defaultValue: 'Bill to' })}
            </p>
            <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
              {client?.name ?? invoice.client_id}
            </p>
            {client?.email && (
              <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                {client.email}
              </p>
            )}
          </div>
          <div className={cm.cn(cm.stack(2), cm.textRight)}>
            <div className={cm.stack(1)}>
              <p
                className={cm.cn(
                  'text-[10px] uppercase tracking-widest font-bold text-foreground-secondary',
                )}
              >
                {t('invoiceDetail.issued', {}, { defaultValue: 'Issued' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-foreground')}>
                {fmtDate(invoice.issued_at)}
              </p>
            </div>
            <div className={cm.stack(1)}>
              <p
                className={cm.cn(
                  'text-[10px] uppercase tracking-widest font-bold text-foreground-secondary',
                )}
              >
                {t('form.due', {}, { defaultValue: 'Due' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-foreground')}>
                {fmtDate(invoice.due_at)}
              </p>
            </div>
            {invoice.paid_at && (
              <div className={cm.stack(1)}>
                <p
                  className={cm.cn('text-[10px] uppercase tracking-widest font-bold text-success')}
                >
                  {t('invoiceDetail.paidAt', {}, { defaultValue: 'Paid' })}
                </p>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-success')}>
                  {fmtDate(invoice.paid_at)}
                </p>
              </div>
            )}
          </div>
        </header>

        <div className={cm.cn('overflow-hidden rounded-xl border border-border')}>
          <div
            className={cm.cn(
              'grid items-center bg-surface-secondary text-[10px] uppercase tracking-widest font-bold text-foreground-secondary',
            )}
            style={{
              gridTemplateColumns:
                'minmax(220px,1.6fr) minmax(100px,0.6fr) minmax(120px,0.6fr) minmax(140px,0.7fr)',
            }}
          >
            <div className={cm.cn(cm.sp('px', 5), cm.sp('py', 3))}>
              {t('form.description', {}, { defaultValue: 'Description' })}
            </div>
            <div className={cm.cn(cm.sp('py', 3))}>
              {t('invoiceDetail.col.hours', {}, { defaultValue: 'Hours' })}
            </div>
            <div className={cm.cn(cm.sp('py', 3))}>
              {t('form.rate', {}, { defaultValue: 'Rate' })}
            </div>
            <div className={cm.cn(cm.sp('py', 3), cm.textRight, cm.sp('pr', 5))}>
              {t('form.amount', {}, { defaultValue: 'Amount' })}
            </div>
          </div>
          {lineItems.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('p', 8),
                cm.textCenter,
                cm.textSize('sm'),
                'text-foreground-secondary',
              )}
              data-test="invoice-no-lines"
            >
              {t('invoiceDetail.noLines', {}, { defaultValue: 'No line items.' })}
            </p>
          ) : (
            lineItems.map((l) => {
              const qty = typeof l.quantity === 'string' ? Number(l.quantity) : l.quantity
              return (
                <div
                  key={l.id}
                  className={cm.cn('grid items-center border-t border-border')}
                  style={{
                    gridTemplateColumns:
                      'minmax(220px,1.6fr) minmax(100px,0.6fr) minmax(120px,0.6fr) minmax(140px,0.7fr)',
                  }}
                >
                  <div
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 4),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-foreground',
                    )}
                  >
                    {l.description}
                  </div>
                  <div
                    className={cm.cn(cm.textSize('sm'), 'tabular-nums font-mono text-foreground')}
                  >
                    {qty.toFixed(2)}
                  </div>
                  <div
                    className={cm.cn(cm.textSize('sm'), 'tabular-nums font-mono text-foreground')}
                  >
                    {formatCents(l.rate_cents, currency)}/hr
                  </div>
                  <div
                    className={cm.cn(
                      cm.textRight,
                      cm.sp('pr', 5),
                      cm.textSize('sm'),
                      'tabular-nums font-mono font-bold text-foreground',
                    )}
                  >
                    {formatCents(l.amount_cents, currency)}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className={cm.cn(cm.flex({ justify: 'end' }), cm.sp('mt', 6))}>
          <div className={cm.cn(cm.w(80), cm.stack(2))}>
            <Row
              label={t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
              value={formatCents(subtotal, currency)}
            />
            <Row
              label={t('form.tax', {}, { defaultValue: 'Tax' })}
              value={formatCents(tax, currency)}
            />
            <div
              className={cm.cn(
                cm.flex({ justify: 'between', align: 'center' }),
                cm.sp('pt', 3),
                'border-t border-border',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  'uppercase tracking-widest font-black text-foreground-secondary',
                )}
              >
                {t('invoiceDetail.total', {}, { defaultValue: 'Total due' })}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('2xl'),
                  'tabular-nums font-mono font-extrabold text-success',
                )}
                data-test="invoice-total"
              >
                {formatCents(total, currency)}
              </span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.sp('p', 4),
              cm.textSize('sm'),
              'text-foreground-secondary bg-surface-secondary rounded-xl border border-border',
            )}
          >
            <span
              className={cm.cn(
                'block text-[10px] uppercase tracking-widest font-bold text-foreground-secondary mb-1',
              )}
            >
              {t('form.notes', {}, { defaultValue: 'Notes' })}
            </span>
            {invoice.notes}
          </p>
        )}
      </article>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
      <span className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>{label}</span>
      <span
        className={cm.cn(cm.textSize('sm'), 'tabular-nums font-mono font-bold text-foreground')}
      >
        {value}
      </span>
    </div>
  )
}

export default InvoiceDetail
export { InvoiceDetail as InvoiceDetailPage }
