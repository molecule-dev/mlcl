import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { INVOICE_TONE, StatusBadge } from '../components/StatusBadge.js'
import { formatDateTime, formatMoney } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface Invoice {
  id: string
  job_id: string | null
  job_title: string | null
  customer_id: string
  customer: string
  number: string
  status: string
  total_cents: number
  items: Array<{ id: string; description: string; qty: number; unit: string; rate_cents: number }>
  issued_at: string | null
  sent_at: string | null
  paid_at: string | null
}

export function InvoiceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await http.get(`/invoices/${id}`)
      setInvoice(unwrapSingle<Invoice>(res))
      setError(null)
    } catch (_error) {
      setError(t('invoices.detail.loadError', {}, { defaultValue: 'Failed to load invoice.' }))
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void load()
  }, [load])

  async function act(action: 'send' | 'pay') {
    if (!id || acting) return
    setActing(true)
    setError(null)
    try {
      await http.post(`/invoices/${id}/${action}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActing(false)
    }
  }

  if (loading && !invoice) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('invoices.loading', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }
  if (error && !invoice) {
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
        <p className={'text-error'}>{error}</p>
        <Link to="/invoices" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('invoices.backToList', {}, { defaultValue: 'Back to invoices' })}
        </Link>
      </div>
    )
  }
  if (!invoice) return null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('3xl'), cm.mxAuto, 'space-y-6')}>
      <nav>
        <Link to="/invoices" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('invoices.backToList', {}, { defaultValue: 'Back to invoices' })}
        </Link>
      </nav>

      <header className={cm.flex({ align: 'start', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'font-mono')}>
            {invoice.number}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            <Link to={`/customers/${invoice.customer_id}`} className={'hover:underline'}>
              {invoice.customer}
            </Link>
            {invoice.job_id && invoice.job_title ? (
              <>
                {' · '}
                <Link to={`/jobs/${invoice.job_id}`} className={'hover:underline'}>
                  {invoice.job_title}
                </Link>
              </>
            ) : null}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {invoice.sent_at
              ? t(
                  'invoices.detail.sentAt',
                  { at: formatDateTime(invoice.sent_at) },
                  { defaultValue: 'Sent {{at}}' },
                )
              : t('invoices.detail.notSent', {}, { defaultValue: 'Not sent yet' })}
            {invoice.paid_at
              ? ` · ${t('invoices.detail.paidAt', { at: formatDateTime(invoice.paid_at) }, { defaultValue: 'Paid {{at}}' })}`
              : ''}
          </p>
        </div>
        <StatusBadge
          status={invoice.status}
          tone={INVOICE_TONE[invoice.status] ?? 'neutral'}
          translationKeyPrefix="invoices.status"
        />
      </header>

      <section className={cm.cn(cm.card(), 'overflow-x-auto')}>
        <table className={'w-full text-left text-sm'}>
          <thead>
            <tr className={'border-b border-outline-variant'}>
              <th
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant uppercase tracking-wider',
                )}
              >
                {t('quotes.form.col.description', {}, { defaultValue: 'Description' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant uppercase tracking-wider text-right',
                )}
              >
                {t('quotes.form.col.qty', {}, { defaultValue: 'Qty' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant uppercase tracking-wider text-right',
                )}
              >
                {t('quotes.form.col.rate', {}, { defaultValue: 'Rate' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant uppercase tracking-wider text-right',
                )}
              >
                {t('quotes.form.col.lineTotal', {}, { defaultValue: 'Line total' })}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id} className={'border-b border-outline-variant last:border-b-0'}>
                <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 3))}>
                  {it.description}
                  <span className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}>
                    {t('quotes.detail.perUnit', {}, { defaultValue: 'per' })} {it.unit}
                  </span>
                </td>
                <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'text-right font-mono')}>
                  {it.qty}
                </td>
                <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'text-right font-mono')}>
                  {formatMoney(it.rate_cents)}
                </td>
                <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'text-right font-mono')}>
                  {formatMoney(Math.round(it.qty * it.rate_cents))}
                </td>
              </tr>
            ))}
            <tr>
              <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), cm.fontWeight('semibold'))}>
                {t('quotes.form.total', {}, { defaultValue: 'Total' })}
              </td>
              <td />
              <td />
              <td
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  'text-right font-mono font-bold text-lg',
                )}
              >
                {formatMoney(invoice.total_cents)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
        {t(
          'invoices.detail.statusIsDataNote',
          {},
          {
            defaultValue:
              'Invoice status is record-keeping only — no payment is processed by this template.',
          },
        )}
      </p>

      {error && invoice ? (
        <p className={'text-error text-sm'} role="alert">
          {error}
        </p>
      ) : null}

      <div className={cm.flex({ gap: 'sm' })}>
        {invoice.status === 'draft' ? (
          <button
            type="button"
            disabled={acting}
            onClick={() => act('send')}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {t('invoices.detail.send', {}, { defaultValue: 'Send invoice' })}
          </button>
        ) : null}
        {invoice.status === 'sent' ? (
          <button
            type="button"
            disabled={acting}
            onClick={() => act('pay')}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-success text-on-success rounded-md disabled:opacity-50',
            )}
          >
            {t('invoices.detail.markPaid', {}, { defaultValue: 'Mark paid' })}
          </button>
        ) : null}
      </div>
    </div>
  )
}
