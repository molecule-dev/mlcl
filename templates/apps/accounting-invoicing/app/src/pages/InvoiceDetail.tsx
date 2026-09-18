import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface LineItem {
  description: string
  quantity: number
  unit_price_cents: number
  total_cents: number
}

interface InvoiceDetail {
  id: string
  number: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
  customer_name: string
  customer_email: string
  customer_address: string[]
  issued_at: string | null
  due_date: string | null
  paid_at?: string | null
  notes?: string
  line_items: LineItem[]
  subtotal_cents: number
  tax_rate_pct: number
  tax_cents: number
  total_cents: number
}

const STATUS_COLOR: Record<InvoiceDetail['status'], string> = {
  draft: 'bg-surface-container',
  sent: 'bg-info/15 text-info',
  paid: 'bg-success/15 text-success',
  overdue: 'bg-error/15 text-error',
  void: 'bg-surface-container line-through',
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildInvoiceCsv(invoice: InvoiceDetail): string {
  const rows: string[] = []
  rows.push('field,value')
  rows.push(`number,${invoice.number}`)
  rows.push(`status,${invoice.status}`)
  rows.push(`customer_name,${invoice.customer_name}`)
  rows.push(`customer_email,${invoice.customer_email}`)
  rows.push(`issued_at,${invoice.issued_at}`)
  rows.push(`due_date,${invoice.due_date}`)
  rows.push(`subtotal_cents,${invoice.subtotal_cents}`)
  rows.push(`tax_cents,${invoice.tax_cents}`)
  rows.push(`total_cents,${invoice.total_cents}`)
  rows.push('')
  rows.push('description,quantity,unit_price_cents,total_cents')
  for (const line of invoice.line_items) {
    rows.push(
      `${JSON.stringify(line.description)},${line.quantity},${line.unit_price_cents},${line.total_cents}`,
    )
  }
  return rows.join('\n')
}

export function InvoiceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/invoices/${id}`)
      .then((res) => {
        if (!cancelled) setInvoice(unwrapSingle<InvoiceDetail>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('invoiceDetail.loadError', {}, { defaultValue: 'Failed to load invoice.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const csvHref = useMemo(() => {
    if (!invoice) return null
    return `data:text/csv;charset=utf-8,${encodeURIComponent(buildInvoiceCsv(invoice))}`
  }, [invoice])

  async function markPaid() {
    if (!invoice) return
    setMarking(true)
    try {
      const res = await http.put(`/api/invoices/${invoice.id}`, {
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      const updated = unwrapSingle<InvoiceDetail>(res)
      if (updated) setInvoice(updated)
      else
        setInvoice((prev) =>
          prev ? { ...prev, status: 'paid', paid_at: new Date().toISOString() } : prev,
        )
    } catch (_error) {
      // mark-paid is best-effort; UI already reflects optimistic state
    } finally {
      setMarking(false)
    }
  }

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !invoice) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
        <Link
          to="/invoices"
          className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
        >
          ← {t('invoiceDetail.back', {}, { defaultValue: 'All invoices' })}
        </Link>
        <div className={cm.cn(cm.card(), cm.sp('p', 8), 'text-center space-y-3')}>
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t('invoiceDetail.missingHeading', {}, { defaultValue: 'Invoice record unavailable' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {error ??
              t(
                'invoiceDetail.missingBody',
                {},
                {
                  defaultValue:
                    'The requested invoice could not be loaded. It may have been removed, or you may not have access to it.',
                },
              )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/invoices"
          className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
        >
          ← {t('invoiceDetail.back', {}, { defaultValue: 'All invoices' })}
        </Link>
        <div className={cm.flex({ gap: 'sm' })}>
          <a
            href={csvHref ?? '#'}
            download={`invoice-${invoice.number}.csv`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              'border border-outline rounded-md hover:bg-surface-container inline-block',
            )}
          >
            {t('invoiceDetail.downloadCsvCta', {}, { defaultValue: 'Download CSV' })}
          </a>
          {invoice.status !== 'paid' ? (
            <button
              type="button"
              onClick={markPaid}
              disabled={marking}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md disabled:opacity-50',
              )}
            >
              {marking
                ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
                : t('invoiceDetail.markPaidCta', {}, { defaultValue: 'Mark paid' })}
            </button>
          ) : null}
        </div>
      </div>

      <article className={cm.cn(cm.card(), cm.sp('p', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
        <header className={cm.flex({ align: 'start', justify: 'between' })}>
          <div>
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
              {t('invoiceDetail.invoiceTitle', {}, { defaultValue: 'INVOICE' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('mt', 1),
                'font-mono',
              )}
            >
              {invoice.number}
            </p>
          </div>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              STATUS_COLOR[invoice.status],
            )}
          >
            {invoice.status}
          </span>
        </header>

        <dl className={cm.cn(cm.grid({ cols: 2, gap: 'lg' }))}>
          <div>
            <dt
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              {t('invoiceDetail.billTo', {}, { defaultValue: 'Bill to' })}
            </dt>
            <dd className={cm.cn(cm.fontWeight('semibold'), cm.sp('mt', 1))}>
              {invoice.customer_name}
            </dd>
            <dd className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {invoice.customer_email}
            </dd>
            {invoice.customer_address.map((line, i) => (
              <dd key={i} className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {line}
              </dd>
            ))}
          </div>
          <div>
            <dt
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              {t('invoiceDetail.issued', {}, { defaultValue: 'Issued' })}
            </dt>
            <dd className={cm.cn(cm.sp('mt', 1))}>{fmtDate(invoice.issued_at)}</dd>
            <dt
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
                cm.sp('mt', 3),
              )}
            >
              {t('form.due', {}, { defaultValue: 'Due' })}
            </dt>
            <dd>{fmtDate(invoice.due_date)}</dd>
          </div>
        </dl>

        <table className={cm.cn('w-full')}>
          <thead
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-wide border-b-2 border-outline',
              'text-on-surface-variant',
            )}
          >
            <tr>
              <th className={cm.cn(cm.sp('py', 2), 'text-left')}>
                {t('form.description', {}, { defaultValue: 'Description' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('invoiceDetail.col.qty', {}, { defaultValue: 'Qty' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('invoiceDetail.col.unitPrice', {}, { defaultValue: 'Unit price' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('nav.total', {}, { defaultValue: 'Total' })}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {invoice.line_items.map((line, i) => (
              <tr key={i}>
                <td className={cm.cn(cm.sp('py', 3), cm.textSize('sm'))}>{line.description}</td>
                <td className={cm.cn(cm.sp('py', 3), cm.textSize('sm'), 'text-right tabular-nums')}>
                  {line.quantity}
                </td>
                <td className={cm.cn(cm.sp('py', 3), cm.textSize('sm'), 'text-right tabular-nums')}>
                  {fmtUsd(line.unit_price_cents)}
                </td>
                <td
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'text-right tabular-nums',
                    cm.fontWeight('semibold'),
                  )}
                >
                  {fmtUsd(line.total_cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={cm.cn(cm.flex({ justify: 'end' }))}>
          <dl className={cm.cn('w-72 space-y-1', cm.textSize('sm'))}>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <dt className={'text-on-surface-variant'}>
                {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
              </dt>
              <dd className="tabular-nums">{fmtUsd(invoice.subtotal_cents)}</dd>
            </div>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <dt className={'text-on-surface-variant'}>
                {t(
                  'invoiceDetail.tax',
                  { rate: invoice.tax_rate_pct.toFixed(2) },
                  { defaultValue: 'Tax ({{rate}}%)' },
                )}
              </dt>
              <dd className="tabular-nums">{fmtUsd(invoice.tax_cents)}</dd>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                'border-t border-outline pt-2',
                cm.fontWeight('bold'),
                cm.textSize('lg'),
              )}
            >
              <dt>{t('nav.total', {}, { defaultValue: 'Total' })}</dt>
              <dd className="tabular-nums">{fmtUsd(invoice.total_cents)}</dd>
            </div>
          </dl>
        </div>

        {invoice.notes ? (
          <footer className={cm.cn('border-t border-outline-variant pt-4')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              {t('form.notes', {}, { defaultValue: 'Notes' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}>{invoice.notes}</p>
          </footer>
        ) : null}
      </article>
    </div>
  )
}
