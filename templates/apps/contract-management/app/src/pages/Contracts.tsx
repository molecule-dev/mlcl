import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ContractStatusPill } from '../components/ContractStatusPill.js'
import { unwrapList } from '../lib/unwrap.js'

interface Contract {
  id: string
  title: string
  counterparty: string
  type: 'msa' | 'sow' | 'nda' | 'order' | 'employment' | 'other'
  status: 'draft' | 'pending' | 'active' | 'expiring' | 'expired' | 'voided'
  amount_cents: number | null
  effective_at: string | null
  expires_at: string | null
  owner_name: string
}

const STATUSES = ['all', 'draft', 'pending', 'active', 'expiring', 'expired', 'voided'] as const
type Status = (typeof STATUSES)[number]

function fmtUsd(cents: number | null): string {
  if (cents == null) return '—'
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Contracts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [filter, setFilter] = useState<Status>('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/contracts')
      .then((res) => {
        if (!cancelled) setContracts(unwrapList<Contract>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('contracts.loadError', {}, { defaultValue: 'Failed to load contracts.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    let rows = contracts
    if (filter !== 'all') rows = rows.filter((c) => c.status === filter)
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      rows = rows.filter(
        (c) => c.title.toLowerCase().includes(q) || c.counterparty.toLowerCase().includes(q),
      )
    }
    return rows
  }, [contracts, filter, query])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }))}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('contracts.heading', {}, { defaultValue: 'Contracts' })}
        </h1>
        <Link
          to="/contracts/new"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('contracts.newCta', {}, { defaultValue: 'New contract' })}
        </Link>
      </header>

      <div className={cm.cn(cm.card(), cm.sp('p', 4), 'space-y-3')}>
        <div className={cm.cn(cm.flex({ gap: 'sm', align: 'center', wrap: 'wrap' }))}>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.roundedFull,
                filter === s
                  ? cm.cn('bg-primary text-on-primary')
                  : cm.cn(
                      'bg-surface-container',
                      'text-on-surface-variant',
                      'hover:bg-surface-container-high',
                    ),
              )}
            >
              {s === 'all'
                ? t('contracts.filter.all', {}, { defaultValue: 'All' })
                : t(
                    `contractStatusPill.${s}`,
                    {},
                    { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                  )}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'contracts.searchPlaceholder',
            {},
            { defaultValue: 'Search title or counterparty…' },
          )}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        contracts.length === 0 ? (
          // Nothing at all — friendly empty state with the primary CTA.
          <div
            className={cm.cn(
              cm.card(),
              cm.sp('py', 12),
              cm.sp('px', 6),
              cm.textCenter,
              'space-y-4',
            )}
          >
            <p className={cm.cn('text-on-surface-variant')}>
              {t(
                'contracts.emptyAll',
                {},
                { defaultValue: 'No contracts yet. Create your first one to get started.' },
              )}
            </p>
            <Link
              to="/contracts/new"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'inline-block bg-primary text-on-primary rounded-md',
              )}
            >
              {t('contracts.newCta', {}, { defaultValue: 'New contract' })}
            </Link>
          </div>
        ) : (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {t('contracts.empty', {}, { defaultValue: 'No contracts match.' })}
          </p>
        )
      ) : (
        <section className={cm.cn(cm.card(), 'overflow-hidden')}>
          {/* 7 columns don't fit a 390px screen — scroll the table, never clip it. */}
          <div className="overflow-x-auto">
            <table className={'w-full min-w-[640px]'}>
              <thead
                className={cm.cn(
                  'bg-surface-container',
                  cm.textSize('xs'),
                  'uppercase tracking-wide',
                  'text-on-surface-variant',
                )}
              >
                <tr>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('form.title', {}, { defaultValue: 'Title' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('contracts.col.counterparty', {}, { defaultValue: 'Counterparty' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('form.type', {}, { defaultValue: 'Type' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('nav.status', {}, { defaultValue: 'Status' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('form.amount', {}, { defaultValue: 'Amount' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('contracts.col.expires', {}, { defaultValue: 'Expires' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('contracts.col.owner', {}, { defaultValue: 'Owner' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((c) => (
                  <tr key={c.id} className={'hover:bg-surface-container'}>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <Link
                        to={`/contracts/${c.id}`}
                        className={cm.cn(cm.fontWeight('semibold'), 'hover:underline')}
                      >
                        {c.title}
                      </Link>
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'))}>
                      {c.counterparty}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        'uppercase',
                      )}
                    >
                      {c.type}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <ContractStatusPill status={c.status} />
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'text-right tabular-nums',
                        cm.fontWeight('semibold'),
                      )}
                    >
                      {fmtUsd(c.amount_cents)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                        'whitespace-nowrap',
                      )}
                    >
                      {fmtDate(c.expires_at)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {c.owner_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
