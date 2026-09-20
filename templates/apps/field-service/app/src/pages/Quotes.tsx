import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { QUOTE_TONE, StatusBadge } from '../components/StatusBadge.js'
import { formatDate, formatMoney } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Quote {
  id: string
  customer: string
  title: string
  status: string
  valid_until: string
  total_cents: number
}

const STATUSES = ['all', 'draft', 'sent', 'accepted', 'declined'] as const
type StatusFilter = (typeof STATUSES)[number]

export function Quotes() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Quote[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/quotes')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Quote>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('quotes.loadError', {}, { defaultValue: 'Failed to load quotes.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((x) => {
      if (filter !== 'all' && x.status !== filter) return false
      if (q && !x.customer.toLowerCase().includes(q) && !x.title.toLowerCase().includes(q))
        return false
      return true
    })
  }, [list, filter, search])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('quotes.heading', {}, { defaultValue: 'Quotes' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'quotes.subheading',
              { count: visible.length, total: list.length },
              { defaultValue: '{{count}} of {{total}} quotes' },
            )}
          </p>
        </div>
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
          + {t('quotes.addLabel', {}, { defaultValue: 'New quote' })}
        </Link>
      </header>

      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('quotes.searchPlaceholder', {}, { defaultValue: 'Customer or title…' })}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'border border-outline-variant rounded-md flex-1 max-w-md',
            cm.textSize('sm'),
          )}
        />
        <nav
          aria-label={t('quotes.filterLabel', {}, { defaultValue: 'Filter quotes by status' })}
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
                  `quotes.status.${s}`,
                  {},
                  {
                    defaultValue: s.charAt(0).toUpperCase() + s.slice(1),
                  },
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('quotes.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('quotes.empty', {}, { defaultValue: 'No quotes match.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={'w-full text-left text-sm'}>
            <thead>
              <tr className={'border-b border-outline-variant'}>
                <Th>{t('quotes.col.customer', {}, { defaultValue: 'Customer' })}</Th>
                <Th>{t('quotes.col.title', {}, { defaultValue: 'Title' })}</Th>
                <Th>{t('quotes.col.validUntil', {}, { defaultValue: 'Valid until' })}</Th>
                <Th>{t('quotes.col.total', {}, { defaultValue: 'Total' })}</Th>
                <Th>{t('nav.status', {}, { defaultValue: 'Status' })}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((x) => (
                <tr
                  key={x.id}
                  className={'border-b border-outline-variant hover:bg-surface-container'}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('medium'))}>
                    <Link to={`/quotes/${x.id}`}>{x.customer}</Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    <Link to={`/quotes/${x.id}`}>{x.title}</Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {formatDate(x.valid_until)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-mono')}>
                    {formatMoney(x.total_cents)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <StatusBadge
                      status={x.status}
                      tone={QUOTE_TONE[x.status] ?? 'neutral'}
                      translationKeyPrefix="quotes.status"
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
