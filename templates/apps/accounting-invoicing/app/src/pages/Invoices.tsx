import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Invoice {
  id: string
  number: string
  customer_name: string
  issued_at: string | null
  due_date: string | null
  amount_cents: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
}

const STATUSES = ['all', 'draft', 'sent', 'paid', 'overdue', 'void'] as const
type Status = (typeof STATUSES)[number]

const STATUS_TONE: Record<Invoice['status'], { bg: string; text: string }> = {
  draft: { bg: 'bg-surface-container', text: 'text-on-surface-variant' },
  sent: { bg: 'bg-info/15', text: 'text-info' },
  paid: { bg: 'bg-success/15', text: 'text-success' },
  overdue: { bg: 'bg-error/15', text: 'text-error' },
  void: { bg: 'bg-surface-container', text: 'text-on-surface-variant' },
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

export function Invoices() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState<Status>('all')
  const [filterTick, setFilterTick] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/invoices')
      .then((res) => {
        if (!cancelled) setInvoices(unwrapList<Invoice>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('invoices.loadError', {}, { defaultValue: 'Failed to load invoices.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    let rows = invoices
    if (filter !== 'all') rows = rows.filter((i) => i.status === filter)
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      rows = rows.filter(
        (i) => i.number.toLowerCase().includes(q) || i.customer_name.toLowerCase().includes(q),
      )
    }
    return rows
  }, [invoices, filter, query])

  const counts = useMemo(() => {
    const c = invoices.reduce(
      (acc, inv) => {
        acc[inv.status] = (acc[inv.status] ?? 0) + 1
        return acc
      },
      {} as Record<Invoice['status'], number>,
    )
    return c
  }, [invoices])

  const totals = useMemo(() => {
    const outstanding = invoices
      .filter((i) => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.amount_cents, 0)
    const overdue = invoices
      .filter((i) => i.status === 'overdue')
      .reduce((sum, i) => sum + i.amount_cents, 0)
    const paid = invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount_cents, 0)
    return { outstanding, overdue, paid }
  }, [invoices])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}>
      <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'uppercase tracking-[0.2em] text-on-surface-variant',
            )}
          >
            {t('invoices.eyebrow', {}, { defaultValue: 'Accounts receivable' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {filter === 'all'
              ? t('nav.invoices', {}, { defaultValue: 'Invoices' })
              : t(
                  `invoices.heading.${filter}`,
                  { filter },
                  { defaultValue: `Invoices · {{filter}}` },
                )}
            {filterTick > 0 ? (
              <span
                className={cm.cn(
                  cm.sp('ml', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant align-middle',
                )}
              >
                {t('invoices.tick', { count: filterTick }, { defaultValue: '#{{count}}' })}
              </span>
            ) : null}
          </h1>
        </div>
        <Link
          to="/invoices/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-full hover:bg-primary-dark transition-colors',
          )}
        >
          {t('nav.newInvoice', {}, { defaultValue: 'New invoice' })}
        </Link>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
        <SummaryStat
          label={t('status.outstanding', {}, { defaultValue: 'Outstanding' })}
          value={fmtUsd(totals.outstanding)}
          tone="warning"
        />
        <SummaryStat
          label={t('status.overdue', {}, { defaultValue: 'Overdue' })}
          value={fmtUsd(totals.overdue)}
          tone="error"
        />
        <SummaryStat
          label={t('invoices.summary.paid', {}, { defaultValue: 'Paid this period' })}
          value={fmtUsd(totals.paid)}
          tone="success"
        />
      </section>

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <div className={cm.cn(cm.flex({ gap: 'sm', align: 'center' }), 'flex-wrap')}>
          {STATUSES.map((s) => {
            const isActive = filter === s
            const count = s === 'all' ? invoices.length : (counts[s as Invoice['status']] ?? 0)
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setFilter(s)
                  setFilterTick((prev) => prev + 1)
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'uppercase tracking-widest transition-colors',
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                )}
              >
                {s} <span className={cm.cn(cm.sp('ml', 1), 'opacity-70 font-normal')}>{count}</span>
              </button>
            )
          })}
        </div>
        <div className="relative">
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'invoices.searchPlaceholder',
              {},
              { defaultValue: 'Search invoice # or customer…' },
            )}
            className={cm.cn(
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.w('full'),
              'rounded-xl',
              'bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 placeholder:text-on-surface-variant',
            )}
          />
        </div>
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('invoices.empty', {}, { defaultValue: 'No invoices match.' })}
        </p>
      ) : (
        <section
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant',
          )}
        >
          <table className={cm.cn('w-full')}>
            <thead
              className={cm.cn(
                'bg-surface-container',
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              <tr>
                <th
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'text-left',
                  )}
                >
                  {t('invoices.col.number', {}, { defaultValue: 'Invoice #' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'text-left',
                  )}
                >
                  {t('nav.customer', {}, { defaultValue: 'Customer' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'text-left',
                  )}
                >
                  {t('invoices.col.issued', {}, { defaultValue: 'Issued' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'text-left',
                  )}
                >
                  {t('form.due', {}, { defaultValue: 'Due' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'text-right',
                  )}
                >
                  {t('form.amount', {}, { defaultValue: 'Amount' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'text-left',
                  )}
                >
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((i) => {
                const tone = STATUS_TONE[i.status]
                return (
                  <tr
                    key={i.id}
                    className={cm.cn('hover:bg-surface-container/40 transition-colors')}
                  >
                    <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                      <Link
                        to={`/invoices/${i.id}`}
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          'hover:underline font-mono text-primary',
                        )}
                      >
                        {i.number}
                      </Link>
                    </td>
                    <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), cm.textSize('sm'))}>
                      {i.customer_name}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 4),
                        cm.textSize('sm'),
                        'text-on-surface-variant whitespace-nowrap',
                      )}
                    >
                      {fmtDate(i.issued_at)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 4),
                        cm.textSize('sm'),
                        'text-on-surface-variant whitespace-nowrap',
                      )}
                    >
                      {fmtDate(i.due_date)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 4),
                        cm.fontWeight('bold'),
                        'text-right tabular-nums',
                      )}
                    >
                      {fmtUsd(i.amount_cents)}
                    </td>
                    <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.roundedFull,
                          'uppercase tracking-widest',
                          tone.bg,
                          tone.text,
                        )}
                      >
                        {i.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

interface SummaryStatProps {
  label: string
  value: string
  tone: 'success' | 'warning' | 'error'
}

function SummaryStat({ label, value, tone }: SummaryStatProps) {
  const cm = getClassMap()
  const accent =
    tone === 'success'
      ? 'var(--mol-color-success)'
      : tone === 'warning'
        ? 'var(--mol-color-warning)'
        : 'var(--mol-color-error)'
  const text =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-error'
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl border-l-4 hover:-translate-y-0.5 transition-transform',
      )}
      style={{ borderLeftColor: accent }}
    >
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
          'uppercase tracking-[0.2em] text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('bold'),
          'tabular-nums tracking-tight',
          text,
        )}
      >
        {value}
      </p>
    </div>
  )
}
