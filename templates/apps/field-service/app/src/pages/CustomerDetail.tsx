import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { INVOICE_TONE, JOB_TONE, QUOTE_TONE, StatusBadge } from '../components/StatusBadge.js'
import { formatDate, formatMoney } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string
  notes: string
}

interface Job {
  id: string
  customer_id: string
  title: string
  status: string
  scheduled_start: string | null
  technician: string | null
}

interface Quote {
  id: string
  customer_id: string
  title: string
  status: string
  total_cents: number
}

interface Invoice {
  id: string
  customer_id: string
  number: string
  status: string
  total_cents: number
}

export function CustomerDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/customers/${id}`).then((r) => unwrapSingle<Customer>(r)),
      http.get('/jobs').then((r) => unwrapList<Job>(r)),
      http.get('/quotes').then((r) => unwrapList<Quote>(r)),
      http.get('/invoices').then((r) => unwrapList<Invoice>(r)),
    ])
      .then(([c, j, q, i]) => {
        if (cancelled) return
        setCustomer(c)
        setJobs(j.filter((x) => x.customer_id === id))
        setQuotes(q.filter((x) => x.customer_id === id))
        setInvoices(i.filter((x) => x.customer_id === id))
        setError(null)
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('customers.detail.loadError', {}, { defaultValue: 'Failed to load customer.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('customers.loading', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }
  if (error || !customer) {
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
        <p className={'text-error'}>{error}</p>
        <Link to="/customers" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('customers.backToList', {}, { defaultValue: 'Back to customers' })}
        </Link>
      </div>
    )
  }

  const lifetimeBilled = invoices
    .filter((i) => i.status !== 'draft')
    .reduce((sum, i) => sum + i.total_cents, 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <nav>
        <Link to="/customers" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('customers.backToList', {}, { defaultValue: 'Back to customers' })}
        </Link>
      </nav>

      <header className={cm.flex({ align: 'start', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{customer.name}</h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {customer.address}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {customer.email ?? '—'}
            {customer.phone ? ` · ${customer.phone}` : ''}
          </p>
          {customer.notes ? (
            <p
              className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'italic text-on-surface-variant')}
            >
              {customer.notes}
            </p>
          ) : null}
        </div>
        <div className={cm.flex({ gap: 'sm' })}>
          <Link
            to="/quotes/new"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md',
            )}
          >
            + {t('customers.detail.newQuote', {}, { defaultValue: 'New quote' })}
          </Link>
        </div>
      </header>

      <div className={cm.grid({ cols: 3, gap: 'md' })}>
        <Stat
          label={t('customers.detail.jobs', {}, { defaultValue: 'Jobs' })}
          value={String(jobs.length)}
        />
        <Stat
          label={t('customers.detail.quotes', {}, { defaultValue: 'Quotes' })}
          value={String(quotes.length)}
        />
        <Stat
          label={t('customers.detail.billed', {}, { defaultValue: 'Billed to date' })}
          value={formatMoney(lifetimeBilled)}
        />
      </div>

      <section className={cm.card()}>
        <h2
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 4),
            cm.textSize('lg'),
            cm.fontWeight('semibold'),
            'border-b border-outline-variant',
          )}
        >
          {t('customers.detail.serviceHistory', {}, { defaultValue: 'Service history' })}
        </h2>
        {jobs.length === 0 ? (
          <p className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant text-sm')}>
            {t('customers.detail.noJobs', {}, { defaultValue: 'No jobs yet for this customer.' })}
          </p>
        ) : (
          <ul>
            {jobs.map((j) => (
              <li key={j.id} className={'border-b border-outline-variant last:border-b-0'}>
                <Link
                  to={`/jobs/${j.id}`}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 4),
                    cm.flex({ align: 'center', gap: 'md' }),
                    'hover:bg-surface-container',
                  )}
                >
                  <span className={cm.flex1}>
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                      {j.title}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}>
                      {formatDate(j.scheduled_start)}
                      {j.technician ? ` · ${j.technician}` : ''}
                    </span>
                  </span>
                  <StatusBadge
                    status={j.status}
                    tone={JOB_TONE[j.status] ?? 'neutral'}
                    translationKeyPrefix="jobs.status"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={cm.grid({ cols: 2, gap: 'lg' })}>
        <section className={cm.card()}>
          <h2
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 4),
              cm.textSize('lg'),
              cm.fontWeight('semibold'),
              'border-b border-outline-variant',
            )}
          >
            {t('customers.detail.quotesHeading', {}, { defaultValue: 'Quotes' })}
          </h2>
          {quotes.length === 0 ? (
            <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant text-sm')}>
              {t('customers.detail.noQuotes', {}, { defaultValue: 'No quotes yet.' })}
            </p>
          ) : (
            <ul>
              {quotes.map((q) => (
                <li key={q.id} className={'border-b border-outline-variant last:border-b-0'}>
                  <Link
                    to={`/quotes/${q.id}`}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.flex({ align: 'center', justify: 'between' }),
                      'hover:bg-surface-container',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'))}>{q.title}</span>
                    <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span className={cm.cn(cm.textSize('sm'), 'font-mono')}>
                        {formatMoney(q.total_cents)}
                      </span>
                      <StatusBadge
                        status={q.status}
                        tone={QUOTE_TONE[q.status] ?? 'neutral'}
                        translationKeyPrefix="quotes.status"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cm.card()}>
          <h2
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 4),
              cm.textSize('lg'),
              cm.fontWeight('semibold'),
              'border-b border-outline-variant',
            )}
          >
            {t('customers.detail.invoicesHeading', {}, { defaultValue: 'Invoices' })}
          </h2>
          {invoices.length === 0 ? (
            <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant text-sm')}>
              {t('customers.detail.noInvoices', {}, { defaultValue: 'No invoices yet.' })}
            </p>
          ) : (
            <ul>
              {invoices.map((i) => (
                <li key={i.id} className={'border-b border-outline-variant last:border-b-0'}>
                  <Link
                    to={`/invoices/${i.id}`}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.flex({ align: 'center', justify: 'between' }),
                      'hover:bg-surface-container',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'), 'font-mono')}>{i.number}</span>
                    <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span className={cm.cn(cm.textSize('sm'), 'font-mono')}>
                        {formatMoney(i.total_cents)}
                      </span>
                      <StatusBadge
                        status={i.status}
                        tone={INVOICE_TONE[i.status] ?? 'neutral'}
                        translationKeyPrefix="invoices.status"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant uppercase tracking-wider')}>
        {label}
      </p>
      <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 2))}>{value}</p>
    </div>
  )
}
