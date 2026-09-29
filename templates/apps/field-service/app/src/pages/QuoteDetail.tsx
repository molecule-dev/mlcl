import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { QUOTE_TONE, StatusBadge } from '../components/StatusBadge.js'
import { formatDate, formatDateTime, formatMoney } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface Quote {
  id: string
  customer_id: string
  customer: string
  title: string
  status: string
  valid_until: string
  total_cents: number
  notes: string
  items: Array<{ id: string; description: string; qty: number; unit: string; rate_cents: number }>
  job_id: string | null
  sent_at: string | null
  accepted_at: string | null
  declined_at: string | null
}

interface CustomerRecord {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string
  notes: string
}

export function QuoteDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [customer, setCustomer] = useState<CustomerRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await http.get(`/api/quotes/${id}`)
      const shaped = unwrapSingle<Quote>(res)
      setQuote(shaped)
      setError(null)
      if (shaped?.customer_id) {
        // Jobsite logistics come from the customer record — fetch best-effort;
        // the quote itself stays fully usable without it.
        try {
          setCustomer(
            unwrapSingle<CustomerRecord>(await http.get(`/api/customers/${shaped.customer_id}`)),
          )
        } catch {
          setCustomer(null)
        }
      }
    } catch (_error) {
      setError(t('quotes.detail.loadError', {}, { defaultValue: 'Failed to load quote.' }))
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void load()
  }, [load])

  async function act(action: 'send' | 'accept' | 'decline') {
    if (!id || acting) return
    setActing(true)
    setError(null)
    try {
      const res = await http.post(`/api/quotes/${id}/${action}`)
      // send/decline return the shaped quote; accept returns { quote, job }.
      const data = res as { job?: { id?: string } | null; job_id?: string | null } | null
      const jobId = data?.job?.id ?? data?.job_id ?? null
      track({
        name:
          action === 'send'
            ? 'quote.sent'
            : action === 'accept'
              ? 'quote.accepted'
              : 'quote.declined',
        properties: { quote_id: id, job_id: jobId },
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActing(false)
    }
  }

  if (loading && !quote) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('quotes.loading', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }
  if (error && !quote) {
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
        <p className={'text-error'}>{error}</p>
        <Link to="/quotes" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('quotes.backToList', {}, { defaultValue: 'Back to quotes' })}
        </Link>
      </div>
    )
  }
  if (!quote) return null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <nav>
        <Link to="/quotes" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('quotes.backToList', {}, { defaultValue: 'Back to quotes' })}
        </Link>
      </nav>

      <header className={cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{quote.title}</h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            <Link to={`/customers/${quote.customer_id}`} className={'hover:underline'}>
              {quote.customer}
            </Link>
            {' · '}
            {t(
              'quotes.detail.validUntil',
              { date: formatDate(quote.valid_until) },
              { defaultValue: 'Valid until {{date}}' },
            )}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {quote.sent_at
              ? t(
                  'quotes.detail.sentAt',
                  { at: formatDateTime(quote.sent_at) },
                  { defaultValue: 'Sent {{at}}' },
                )
              : t('quotes.detail.notSent', {}, { defaultValue: 'Not sent yet' })}
            {quote.accepted_at
              ? ` · ${t('quotes.detail.acceptedAt', { at: formatDateTime(quote.accepted_at) }, { defaultValue: 'Accepted {{at}}' })}`
              : ''}
            {quote.declined_at
              ? ` · ${t('quotes.detail.declinedAt', { at: formatDateTime(quote.declined_at) }, { defaultValue: 'Declined {{at}}' })}`
              : ''}
          </p>
        </div>
        <StatusBadge
          status={quote.status}
          tone={QUOTE_TONE[quote.status] ?? 'neutral'}
          translationKeyPrefix="quotes.status"
        />
      </header>

      <section
        data-mol-id="quote-customer-logistics"
        className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'font-display')}>
          <span
            className="material-symbols-outlined text-base align-middle mr-2 text-primary"
            aria-hidden="true"
          >
            location_on
          </span>
          {t(
            'quotes.detail.logisticsHeading',
            {},
            { defaultValue: 'Customer & Jobsite Logistics' },
          )}
        </h2>
        <div className={cm.grid({ cols: 2, gap: 'md' })}>
          <div className={cm.stack(1)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-wider',
              )}
            >
              {t('quotes.detail.logisticsAccount', {}, { defaultValue: 'Account' })}
            </span>
            <Link
              to={`/customers/${quote.customer_id}`}
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'hover:underline')}
            >
              {quote.customer}
            </Link>
            {customer?.phone ? (
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {customer.phone}
              </span>
            ) : null}
            {customer?.email ? (
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {customer.email}
              </span>
            ) : null}
          </div>
          <div className={cm.stack(1)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-wider',
              )}
            >
              {t('quotes.detail.logisticsSite', {}, { defaultValue: 'Jobsite' })}
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {customer?.address || '—'}
            </span>
            {customer?.notes ? (
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {customer.notes}
              </span>
            ) : null}
          </div>
        </div>
      </section>

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
              <ThRight>{t('quotes.form.col.qty', {}, { defaultValue: 'Qty' })}</ThRight>
              <ThRight>{t('quotes.form.col.rate', {}, { defaultValue: 'Rate' })}</ThRight>
              <ThRight>
                {t('quotes.form.col.lineTotal', {}, { defaultValue: 'Line total' })}
              </ThRight>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it) => (
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
                {formatMoney(quote.total_cents)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section
        data-mol-id="quote-acceptance-audit"
        className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}
      >
        <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'font-display')}>
          <span
            className="material-symbols-outlined text-base align-middle mr-2 text-primary"
            aria-hidden="true"
          >
            history_edu
          </span>
          {t(
            'quotes.detail.auditHeading',
            {},
            { defaultValue: 'Customer Acceptance & Audit Trail' },
          )}
        </h3>
        <ol className={cm.stack(2)}>
          {[
            {
              icon: quote.sent_at ? 'check_circle' : 'radio_button_unchecked',
              label: t('quotes.detail.auditSent', {}, { defaultValue: 'Quote sent to customer' }),
              at: quote.sent_at,
            },
            {
              icon:
                quote.accepted_at || quote.declined_at ? 'check_circle' : 'radio_button_unchecked',
              label: quote.declined_at
                ? t('quotes.detail.auditDeclined', {}, { defaultValue: 'Customer declined' })
                : t('quotes.detail.auditAccepted', {}, { defaultValue: 'Customer accepted' }),
              at: quote.accepted_at ?? quote.declined_at,
            },
          ].map((row) => (
            <li key={row.label} className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-7 w-7 shrink-0',
                  row.at
                    ? 'bg-success-container text-on-success-container'
                    : 'bg-surface-container text-on-surface-variant',
                )}
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  {row.icon}
                </span>
              </span>
              <span className={cm.cn(cm.textSize('sm'))}>{row.label}</span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {row.at ? formatDateTime(row.at) : ''}
              </span>
            </li>
          ))}
        </ol>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'quotes.detail.auditValidUntil',
            { date: formatDate(quote.valid_until) },
            {
              defaultValue:
                'Pricing locked until {{date}} — acceptance is recorded the moment the customer signs.',
            },
          )}
        </p>
      </section>

      {quote.notes ? (
        <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 2))}>
            {t('quotes.form.notes', {}, { defaultValue: 'Notes' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{quote.notes}</p>
        </section>
      ) : null}

      {quote.job_id ? (
        <section
          className={cm.cn(
            cm.card(),
            cm.sp('p', 5),
            cm.flex({ align: 'center', justify: 'between' }),
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'quotes.detail.convertedToJob',
              {},
              { defaultValue: 'This quote was converted to a job.' },
            )}
          </p>
          <Link
            to={`/jobs/${quote.job_id}`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'border border-outline-variant rounded-md',
            )}
          >
            {t('quotes.detail.viewJob', {}, { defaultValue: 'View job' })}
          </Link>
        </section>
      ) : null}

      {error && quote ? (
        <p className={'text-error text-sm'} role="alert">
          {error}
        </p>
      ) : null}

      <section data-mol-id="quote-fast-track" className={cm.stack(2)}>
        <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          <span
            className="material-symbols-outlined text-base align-middle mr-2 text-primary"
            aria-hidden="true"
          >
            rocket_launch
          </span>
          {t('quotes.detail.fastTrack', {}, { defaultValue: 'Fast-Track Dispatch' })}
        </h3>
        <div className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
          {quote.status === 'draft' ? (
            <>
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
                {acting
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Working…' })
                  : t('quotes.detail.send', {}, { defaultValue: 'Send quote' })}
              </button>
              <Link
                to={`/quotes/${quote.id}/edit`}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md',
                )}
              >
                {t('quotes.detail.edit', {}, { defaultValue: 'Edit' })}
              </Link>
            </>
          ) : null}
          {quote.status === 'sent' ? (
            <>
              <button
                type="button"
                disabled={acting}
                onClick={() => act('accept')}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-success text-on-success rounded-md disabled:opacity-50',
                )}
              >
                {t('quotes.detail.accept', {}, { defaultValue: 'Accept → create job' })}
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => act('decline')}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md disabled:opacity-50',
                )}
              >
                {t('quotes.detail.decline', {}, { defaultValue: 'Mark declined' })}
              </button>
            </>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function ThRight({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 5),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant uppercase tracking-wider text-right',
      )}
    >
      {children}
    </th>
  )
}
