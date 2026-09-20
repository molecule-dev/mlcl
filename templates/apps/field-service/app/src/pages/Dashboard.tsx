import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { INVOICE_TONE, JOB_TONE, StatusBadge } from '../components/StatusBadge.js'
import { dayKey, dayKeyOffset, formatMoney, formatTime, startOfWeek } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Job {
  id: string
  customer: string
  title: string
  scheduled_start: string | null
  status: string
  technician: string | null
}

interface Quote {
  id: string
  customer: string
  title: string
  status: string
  total_cents: number
  valid_until: string
}

interface Invoice {
  id: string
  customer: string
  number: string
  status: string
  total_cents: number
  paid_at: string | null
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [jobs, setJobs] = useState<Job[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/jobs').then((r) => unwrapList<Job>(r)),
      http.get('/quotes').then((r) => unwrapList<Quote>(r)),
      http.get('/invoices').then((r) => unwrapList<Invoice>(r)),
    ])
      .then(([j, q, i]) => {
        if (cancelled) return
        setJobs(j)
        setQuotes(q)
        setInvoices(i)
        setError(null)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('dashboard.loadError', {}, { defaultValue: 'Failed to load the board.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const today = dayKeyOffset(0)
  const todayJobs = useMemo(
    () =>
      jobs
        .filter((j) => dayKey(j.scheduled_start) === today && j.status !== 'cancelled')
        .sort((a, b) => (a.scheduled_start ?? '').localeCompare(b.scheduled_start ?? '')),
    [jobs, today],
  )
  const unassignedJobs = useMemo(
    () =>
      jobs.filter(
        (j) => j.technician == null && (j.status === 'scheduled' || j.status === 'en_route'),
      ),
    [jobs],
  )
  const openQuotes = useMemo(
    () =>
      quotes
        .filter((q) => q.status === 'sent' || q.status === 'draft')
        .sort((a, b) => a.valid_until.localeCompare(b.valid_until))
        .slice(0, 6),
    [quotes],
  )
  const revenueWeek = useMemo(() => {
    const from = startOfWeek().getTime()
    return invoices
      .filter((i) => i.status === 'paid' && i.paid_at && Date.parse(i.paid_at) >= from)
      .reduce((sum, i) => sum + i.total_cents, 0)
  }, [invoices])
  const outstanding = useMemo(
    () => invoices.filter((i) => i.status === 'sent').reduce((s, i) => s + i.total_cents, 0),
    [invoices],
  )
  const unassignedJobIds = useMemo(() => new Set(unassignedJobs.map((j) => j.id)), [unassignedJobs])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('dashboard.heading', {}, { defaultValue: "Today's board" })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              { count: todayJobs.length },
              { defaultValue: '{{count}} jobs on the board today' },
            )}
          </p>
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
            + {t('dashboard.newQuote', {}, { defaultValue: 'New quote' })}
          </Link>
          <Link
            to="/dispatch"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md',
            )}
          >
            {t('dashboard.openDispatch', {}, { defaultValue: 'Open dispatch' })}
          </Link>
        </div>
      </header>

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <Kpi
          label={t('dashboard.kpi.todayJobs', {}, { defaultValue: "Today's jobs" })}
          value={String(todayJobs.length)}
        />
        <Kpi
          label={t('dashboard.kpi.unassigned', {}, { defaultValue: 'Need a technician' })}
          value={String(unassignedJobs.length)}
          tone={unassignedJobs.length > 0 ? 'warning' : 'default'}
        />
        <Kpi
          label={t('dashboard.kpi.revenueWeek', {}, { defaultValue: 'Revenue this week' })}
          value={formatMoney(revenueWeek)}
          tone="success"
        />
        <Kpi
          label={t('dashboard.kpi.outstanding', {}, { defaultValue: 'Outstanding invoices' })}
          value={formatMoney(outstanding)}
          tone="info"
        />
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('dashboard.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <div className={cm.grid({ cols: 3, gap: 'lg' })}>
          <section className={cm.cn(cm.card(), 'col-span-2')}>
            <h2
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 4),
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                'border-b border-outline-variant',
              )}
            >
              {t('dashboard.todayHeading', {}, { defaultValue: "Today's jobs" })}
            </h2>
            {todayJobs.length === 0 ? (
              <p className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant text-sm')}>
                {t('dashboard.todayEmpty', {}, { defaultValue: 'No jobs scheduled for today.' })}
              </p>
            ) : (
              <ul>
                {todayJobs.map((j) => (
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
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          'font-mono text-on-surface-variant w-16',
                        )}
                      >
                        {formatTime(j.scheduled_start) || '—'}
                      </span>
                      <span className={cm.flex1}>
                        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                          {j.title}
                        </span>
                        <span className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}>
                          {j.customer}
                          {unassignedJobIds.has(j.id)
                            ? ` · ${t('dashboard.needsTech', {}, { defaultValue: 'needs a tech' })}`
                            : j.technician
                              ? ` · ${j.technician}`
                              : ''}
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

          <div className={cm.cn(cm.stack(6))}>
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
                {t('dashboard.quotesHeading', {}, { defaultValue: 'Quotes waiting' })}
              </h2>
              {openQuotes.length === 0 ? (
                <p
                  className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant text-sm')}
                >
                  {t(
                    'dashboard.quotesEmpty',
                    {},
                    { defaultValue: 'No open quotes — send one from a customer page.' },
                  )}
                </p>
              ) : (
                <ul>
                  {openQuotes.map((q) => (
                    <li key={q.id} className={'border-b border-outline-variant last:border-b-0'}>
                      <Link
                        to={`/quotes/${q.id}`}
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          'block hover:bg-surface-container',
                        )}
                      >
                        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                          {q.customer}
                        </span>
                        <span className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}>
                          {q.title} · {formatMoney(q.total_cents)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className={cm.cn(cm.sp('p', 3))}>
                <Link
                  to="/quotes"
                  className={cm.cn(cm.textSize('sm'), 'font-medium text-primary hover:underline')}
                >
                  {t('dashboard.allQuotes', {}, { defaultValue: 'All quotes →' })}
                </Link>
              </div>
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
                {t('dashboard.invoicesHeading', {}, { defaultValue: 'Recent invoices' })}
              </h2>
              {invoices.length === 0 ? (
                <p
                  className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant text-sm')}
                >
                  {t('dashboard.invoicesEmpty', {}, { defaultValue: 'No invoices yet.' })}
                </p>
              ) : (
                <ul>
                  {invoices.slice(0, 5).map((i) => (
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
                        <span>
                          <span className={cm.cn(cm.textSize('sm'), 'font-mono')}>{i.number}</span>
                          <span
                            className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}
                          >
                            {i.customer}
                          </span>
                        </span>
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
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning' | 'info'
}) {
  const cm = getClassMap()
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'info'
          ? 'text-info'
          : 'text-on-surface'
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant uppercase tracking-wider')}>
        {label}
      </p>
      <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 2), toneClass)}>
        {value}
      </p>
    </div>
  )
}
