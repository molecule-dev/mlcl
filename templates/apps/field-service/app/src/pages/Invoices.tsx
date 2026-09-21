import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { INVOICE_TONE, StatusBadge } from '../components/StatusBadge.js'
import { formatDate, formatMoney } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Invoice {
  id: string
  customer: string
  job_title: string | null
  number: string
  status: string
  total_cents: number
  sent_at: string | null
  paid_at: string | null
}

const STATUSES = ['all', 'draft', 'sent', 'paid'] as const
type StatusFilter = (typeof STATUSES)[number]

export function Invoices() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Invoice[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/invoices')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Invoice>(res))
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

  const visible = useMemo(
    () => list.filter((i) => filter === 'all' || i.status === filter),
    [list, filter],
  )
  const totals = useMemo(() => {
    const paid = list.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total_cents, 0)
    const outstanding = list
      .filter((i) => i.status === 'sent')
      .reduce((s, i) => s + i.total_cents, 0)
    const draft = list.filter((i) => i.status === 'draft').reduce((s, i) => s + i.total_cents, 0)
    return { paid, outstanding, draft }
  }, [list])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('invoices.heading', {}, { defaultValue: 'Invoices' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'invoices.subheading',
              {},
              { defaultValue: 'From completed jobs — send, then mark paid' },
            )}
          </p>
        </div>
      </header>

      <div className={cm.grid({ cols: 3, gap: 'md' })}>
        <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <p
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant uppercase tracking-wider')}
          >
            {t('invoices.kpi.paid', {}, { defaultValue: 'Paid' })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 2),
              'text-success',
            )}
          >
            {formatMoney(totals.paid)}
          </p>
        </div>
        <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <p
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant uppercase tracking-wider')}
          >
            {t('invoices.kpi.outstanding', {}, { defaultValue: 'Outstanding' })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 2),
              'text-info',
            )}
          >
            {formatMoney(totals.outstanding)}
          </p>
        </div>
        <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <p
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant uppercase tracking-wider')}
          >
            {t('invoices.kpi.draft', {}, { defaultValue: 'Drafts' })}
          </p>
          <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 2))}>
            {formatMoney(totals.draft)}
          </p>
        </div>
      </div>

      <nav
        aria-label={t('invoices.filterLabel', {}, { defaultValue: 'Filter invoices by status' })}
        className={cm.flex({ gap: 'xs', align: 'center' })}
      >
        {STATUSES.map((s) => {
          const active = filter === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'rounded-full',
                active
                  ? 'bg-primary text-on-primary'
                  : cm.cn('bg-surface border border-outline-variant', 'text-on-surface-variant'),
              )}
              aria-pressed={active}
            >
              {t(
                `invoices.status.${s}`,
                {},
                {
                  defaultValue: s.charAt(0).toUpperCase() + s.slice(1),
                },
              )}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('invoices.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'invoices.empty',
            {},
            {
              defaultValue: 'No invoices yet — complete a job and generate one.',
            },
          )}
        </p>
      ) : (
        <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={'w-full text-left text-sm'}>
            <thead>
              <tr className={'border-b border-outline-variant'}>
                <Th>{t('invoices.col.number', {}, { defaultValue: 'Invoice' })}</Th>
                <Th>{t('invoices.col.customer', {}, { defaultValue: 'Customer' })}</Th>
                <Th>{t('invoices.col.job', {}, { defaultValue: 'Job' })}</Th>
                <Th>{t('invoices.col.sent', {}, { defaultValue: 'Sent' })}</Th>
                <Th>{t('invoices.col.paid', {}, { defaultValue: 'Paid' })}</Th>
                <Th>{t('invoices.col.total', {}, { defaultValue: 'Total' })}</Th>
                <Th>{t('nav.status', {}, { defaultValue: 'Status' })}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr
                  key={i.id}
                  className={'border-b border-outline-variant hover:bg-surface-container'}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-mono')}>
                    <Link to={`/invoices/${i.id}`} className={'inline-block py-3 -my-3'}>
                      {i.number}
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('medium'))}>
                    {i.customer}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {i.job_title ?? '—'}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {formatDate(i.sent_at)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {formatDate(i.paid_at)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-mono')}>
                    {formatMoney(i.total_cents)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <StatusBadge
                      status={i.status}
                      tone={INVOICE_TONE[i.status] ?? 'neutral'}
                      translationKeyPrefix="invoices.status"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant',
        'uppercase tracking-wider',
      )}
    >
      {children}
    </th>
  )
}
