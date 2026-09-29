import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { INVOICE_TONE, JOB_TONE, StatusBadge } from '../components/StatusBadge.js'
import {
  dayKey,
  dayKeyOffset,
  formatDate,
  formatMoney,
  formatTime,
  startOfWeek,
} from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Job {
  id: string
  customer: string
  title: string
  scheduled_start: string | null
  status: string
  technician_id: string | null
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

interface Technician {
  id: string
  name: string
  trade: string
  active: boolean
  active_jobs: number
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [jobs, setJobs] = useState<Job[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/jobs').then((r) => unwrapList<Job>(r)),
      http.get('/api/quotes').then((r) => unwrapList<Quote>(r)),
      http.get('/api/invoices').then((r) => unwrapList<Invoice>(r)),
      http.get('/api/technicians').then((r) => unwrapList<Technician>(r)),
    ])
      .then(([j, q, i, techs]) => {
        if (cancelled) return
        setJobs(j)
        setQuotes(q)
        setInvoices(i)
        setTechnicians(techs)
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

  /** Quote-to-cash pipeline stage values computed from the live lists. */
  const pipeline = useMemo(() => {
    const sentQuotes = quotes.filter((q) => q.status === 'sent')
    const acceptedQuotes = quotes.filter((q) => q.status === 'accepted')
    const scheduled = jobs.filter((j) => j.status === 'scheduled')
    const rolling = jobs.filter((j) => j.status === 'en_route' || j.status === 'in_progress')
    const proof = jobs.filter((j) => j.status === 'completed')
    const awaiting = invoices.filter((i) => i.status === 'sent')
    const settled = invoices.filter((i) => i.status === 'paid')
    return [
      {
        key: 'sent',
        icon: 'request_quote',
        label: t('dashboard.pipeline.sent', {}, { defaultValue: '01. Quote sent' }),
        value: t(
          'dashboard.pipeline.sentValue',
          { count: sentQuotes.length },
          { defaultValue: '{{count}} open' },
        ),
      },
      {
        key: 'accept',
        icon: 'draw',
        label: t('dashboard.pipeline.accept', {}, { defaultValue: '02. Customer accept' }),
        value: t(
          'dashboard.pipeline.acceptValue',
          { count: acceptedQuotes.length },
          { defaultValue: '{{count}} accepted' },
        ),
      },
      {
        key: 'schedule',
        icon: 'calendar_today',
        label: t('dashboard.pipeline.schedule', {}, { defaultValue: '03. Auto-schedule' }),
        value: t(
          'dashboard.pipeline.scheduleValue',
          { count: scheduled.length },
          { defaultValue: '{{count}} slotted' },
        ),
      },
      {
        key: 'dispatch',
        icon: 'navigation',
        label: t('dashboard.pipeline.dispatch', {}, { defaultValue: '04. Field dispatch' }),
        value: t(
          'dashboard.pipeline.dispatchValue',
          { count: rolling.length },
          { defaultValue: '{{count}} rolling' },
        ),
      },
      {
        key: 'proof',
        icon: 'photo_camera',
        label: t('dashboard.pipeline.proof', {}, { defaultValue: '05. Field proof' }),
        value: t(
          'dashboard.pipeline.proofValue',
          { count: proof.length },
          { defaultValue: '{{count}} completed' },
        ),
      },
      {
        key: 'invoice',
        icon: 'receipt_long',
        label: t('dashboard.pipeline.invoice', {}, { defaultValue: '06. 1-tap invoice' }),
        value: t(
          'dashboard.pipeline.invoiceValue',
          { count: awaiting.length },
          { defaultValue: '{{count}} awaiting' },
        ),
      },
      {
        key: 'deposit',
        icon: 'account_balance',
        label: t('dashboard.pipeline.deposit', {}, { defaultValue: '07. Bank deposit' }),
        value: formatMoney(settled.reduce((s, i) => s + i.total_cents, 0)),
      },
    ]
  }, [jobs, quotes, invoices, t])

  /** Recently completed jobs — the field proof / timesheet view. */
  const recentProof = useMemo(
    () =>
      jobs
        .filter((j) => j.status === 'completed')
        .sort((a, b) => (b.scheduled_start ?? '').localeCompare(a.scheduled_start ?? ''))
        .slice(0, 5),
    [jobs],
  )

  /** Live per-tech telemetry: current status derived from their job states. */
  const fleet = useMemo(() => {
    return technicians
      .filter((tech) => tech.active)
      .map((tech) => {
        const techJobs = jobs.filter((j) => j.technician_id === tech.id)
        const onSite = techJobs.find((j) => j.status === 'in_progress')
        const rolling = techJobs.find((j) => j.status === 'en_route')
        const next = techJobs
          .filter((j) => j.status === 'scheduled' && j.scheduled_start)
          .sort((a, b) => (a.scheduled_start ?? '').localeCompare(b.scheduled_start ?? ''))[0]
        const status = onSite
          ? {
              tone: 'bg-success' as const,
              label: t('dashboard.fleet.onSite', {}, { defaultValue: 'On site' }),
              detail: onSite.title,
            }
          : rolling
            ? {
                tone: 'bg-warning' as const,
                label: t('dashboard.fleet.enRoute', {}, { defaultValue: 'En route' }),
                detail: rolling.title,
              }
            : next
              ? {
                  tone: 'bg-info' as const,
                  label: t('dashboard.fleet.scheduled', {}, { defaultValue: 'Scheduled' }),
                  detail: next.title,
                }
              : {
                  tone: 'bg-surface-variant' as const,
                  label: t('dashboard.fleet.available', {}, { defaultValue: 'Available' }),
                  detail: t('dashboard.fleet.standby', {}, { defaultValue: 'Standing by at shop' }),
                }
        return {
          tech,
          openCount: techJobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled')
            .length,
          status,
        }
      })
  }, [technicians, jobs, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
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
        <div className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
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
        <>
          <section data-mol-id="dashboard-pipeline" className={cm.card()}>
            <h2
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 4),
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                'border-b border-outline-variant',
              )}
            >
              <span
                className="material-symbols-outlined text-base align-middle mr-2 text-primary"
                aria-hidden="true"
              >
                alt_route
              </span>
              {t(
                'dashboard.pipeline.heading',
                {},
                { defaultValue: 'Quote-to-Cash Pipeline Architecture' },
              )}
            </h2>
            <ol className={cm.cn(cm.grid({ cols: 4, gap: 'sm' }), cm.sp('p', 4))}>
              {pipeline.map((stage) => (
                <li
                  key={stage.key}
                  className={cm.cn(cm.card(), cm.sp('p', 3), cm.stack(1), 'bg-surface-container')}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.roundedFull,
                      'h-7 w-7 bg-primary-container text-on-primary-container',
                    )}
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                      {stage.icon}
                    </span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-on-surface-variant',
                    )}
                  >
                    {stage.label}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {stage.value}
                  </span>
                </li>
              ))}
            </ol>
          </section>

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
                {t('dashboard.todayHeading', {}, { defaultValue: "Today's Live Jobs Board" })}
              </h2>
              {todayJobs.length === 0 ? (
                <p
                  className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant text-sm')}
                >
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
                          <span
                            className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}
                          >
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
                    className={cm.cn(
                      cm.sp('p', 6),
                      cm.textCenter,
                      'text-on-surface-variant text-sm',
                    )}
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
                          <span
                            className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}
                          >
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
                    className={cm.cn(
                      cm.textSize('sm'),
                      'font-medium text-primary hover:underline inline-block py-2',
                    )}
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
                    className={cm.cn(
                      cm.sp('p', 6),
                      cm.textCenter,
                      'text-on-surface-variant text-sm',
                    )}
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
                            <span className={cm.cn(cm.textSize('sm'), 'font-mono')}>
                              {i.number}
                            </span>
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

          <section data-mol-id="dashboard-field-proof" className={cm.card()}>
            <h2
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 4),
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                'border-b border-outline-variant',
              )}
            >
              <span
                className="material-symbols-outlined text-base align-middle mr-2 text-primary"
                aria-hidden="true"
              >
                receipt_long
              </span>
              {t(
                'dashboard.proofHeading',
                {},
                { defaultValue: 'Recent Field Proof & Timesheet Entries' },
              )}
            </h2>
            {recentProof.length === 0 ? (
              <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant text-sm')}>
                {t(
                  'dashboard.proofEmpty',
                  {},
                  { defaultValue: 'No completed jobs yet — field proof lands here.' },
                )}
              </p>
            ) : (
              <ul>
                {recentProof.map((j) => (
                  <li key={j.id} className={'border-b border-outline-variant last:border-b-0'}>
                    <Link
                      to={`/jobs/${j.id}`}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        cm.flex({ align: 'center', gap: 'md' }),
                        'hover:bg-surface-container',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.roundedFull,
                          'h-7 w-7 shrink-0 bg-success-container text-on-success-container',
                        )}
                      >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                          check_circle
                        </span>
                      </span>
                      <span className={cm.flex1}>
                        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                          {j.title}
                        </span>
                        <span className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}>
                          {j.technician ?? j.customer}
                          {j.scheduled_start ? ` · ${formatDate(j.scheduled_start)}` : ''}
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

          <section data-mol-id="dashboard-fleet-telemetry" className={cm.card()}>
            <h2
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 4),
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                'border-b border-outline-variant',
              )}
            >
              <span
                className="material-symbols-outlined text-base align-middle mr-2 text-primary"
                aria-hidden="true"
              >
                fmd_good
              </span>
              {t('dashboard.fleet.heading', {}, { defaultValue: 'Fleet Telemetry & Handhelds' })}
              <span
                className={cm.cn(
                  cm.sp('ml', 2),
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-primary-container text-primary uppercase tracking-wider',
                )}
              >
                {t(
                  'dashboard.fleet.liveCount',
                  { count: fleet.length },
                  { defaultValue: '{{count}} techs live' },
                )}
              </span>
            </h2>
            {fleet.length === 0 ? (
              <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant text-sm')}>
                {t('dashboard.fleet.empty', {}, { defaultValue: 'No active technicians yet.' })}
              </p>
            ) : (
              <ul>
                {fleet.map(({ tech, openCount, status }) => (
                  <li
                    key={tech.id}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.flex({ align: 'center', gap: 'md' }),
                      'border-b border-outline-variant last:border-b-0',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.roundedFull,
                        'h-9 w-9 shrink-0 font-bold bg-primary-container text-on-primary-container text-xs',
                      )}
                      aria-hidden="true"
                    >
                      {tech.name
                        .split(' ')
                        .map((part) => part[0] ?? '')
                        .join('')
                        .slice(0, 2)}
                    </span>
                    <span className={cm.flex1}>
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                        {tech.name}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}>
                        {tech.trade} ·{' '}
                        {t(
                          'technicians.openJobs',
                          { count: openCount },
                          { defaultValue: '{{count}} open' },
                        )}
                        {' · '}
                        {status.detail}
                      </span>
                    </span>
                    <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                      <span
                        className={cm.cn('inline-block h-2 w-2 rounded-full', status.tone)}
                        aria-hidden="true"
                      />
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {status.label}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
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
