import { useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Account {
  id: string
  code: string
  name: string
  type: string
  description: string
  balance_cents: number
  currency: string
  active: boolean
}

const TYPE_ORDER = ['asset', 'liability', 'equity', 'income', 'expense'] as const

type TranslateFn = ReturnType<typeof useTranslation>['t']

function typeLabel(type: string, t: TranslateFn): string {
  const key = `accounts.type.${type}`
  const fallback = type.charAt(0).toUpperCase() + type.slice(1)
  return t(key, {}, { defaultValue: fallback })
}

function fmtUsd(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Chart of accounts — read-only view over GET /api/accounts (the CRUD surface
 * itself is API-first; rows appear here grouped by account type in code order).
 */
export function Accounts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/accounts')
      .then((res) => {
        if (!cancelled) setAccounts(unwrapList<Account>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('accounts.loadError', {}, { defaultValue: 'Failed to load accounts.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, reloadKey])

  const retry = useCallback(() => setReloadKey((k) => k + 1), [])

  const assets = accounts
    .filter((a) => a.type === 'asset' && a.active)
    .reduce((sum, a) => sum + a.balance_cents, 0)
  const liabilities = accounts
    .filter((a) => a.type === 'liability' && a.active)
    .reduce((sum, a) => sum + a.balance_cents, 0)

  const groups: { type: string; items: Account[] }[] = TYPE_ORDER.map((type) => ({
    type,
    items: accounts.filter((a) => a.type === type),
  })).filter((g) => g.items.length > 0)
  const otherTypes = Array.from(
    new Set(
      accounts
        .filter((a) => !TYPE_ORDER.includes(a.type as (typeof TYPE_ORDER)[number]))
        .map((a) => a.type),
    ),
  )
  for (const type of otherTypes) {
    if (!groups.some((g) => g.type === type)) {
      groups.push({ type, items: accounts.filter((a) => a.type === type) })
    }
  }

  return (
    <div className={cm.cn('px-4 py-5 md:px-8 md:py-8', cm.sp('mb', 6), 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('accounts.heading', {}, { defaultValue: 'Chart of accounts' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'accounts.subheading',
            {},
            {
              defaultValue:
                'Every ledger account behind your invoices, expenses, and payments, grouped by type.',
            },
          )}
        </p>
      </header>

      <div className={cm.grid({ cols: 3, gap: 'md' })}>
        <Stat
          label={t('accounts.kpi.accounts', {}, { defaultValue: 'Accounts' })}
          value={String(accounts.length)}
        />
        <Stat
          label={t('accounts.kpi.assets', {}, { defaultValue: 'Total assets' })}
          value={fmtUsd(assets)}
        />
        <Stat
          label={t('accounts.kpi.liabilities', {}, { defaultValue: 'Total liabilities' })}
          value={fmtUsd(liabilities)}
        />
      </div>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('py', 10),
            cm.textCenter,
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <p className="text-error">{error}</p>
          <button
            type="button"
            onClick={retry}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'min-h-[44px] rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : loading ? (
        <div className={cm.cn('space-y-3')} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cm.cn(cm.card(), 'h-16 animate-pulse bg-surface-container')}
              aria-hidden="true"
            />
          ))}
          <span className="sr-only">
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </span>
        </div>
      ) : accounts.length === 0 ? (
        <div
          className={cm.cn(
            cm.card(),
            cm.sp('py', 12),
            cm.sp('px', 6),
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.textCenter,
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-4xl text-on-surface-variant')}
            aria-hidden="true"
          >
            account_balance
          </span>
          <p className={cm.cn(cm.fontWeight('semibold'))}>
            {t('accounts.emptyTitle', {}, { defaultValue: 'No accounts yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'max-w-md')}>
            {t(
              'accounts.emptyBody',
              {},
              {
                defaultValue:
                  'Ledger accounts track where money lives and moves. They appear here once your bookkeeper or integration sets them up.',
              },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('space-y-6')}>
          {groups.map((group) => (
            <section key={group.type} aria-labelledby={`accounts-group-${group.type}`}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' }),
                  cm.sp('mb', 2),
                )}
              >
                <h2
                  id={`accounts-group-${group.type}`}
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-wide text-on-surface-variant',
                  )}
                >
                  {typeLabel(group.type, t)}
                </h2>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'accounts.count',
                    { count: group.items.length },
                    { defaultValue: '{{count}} accounts' },
                  )}
                </span>
              </div>
              <ul className={cm.cn(cm.card(), 'divide-y divide-outline-variant overflow-hidden')}>
                {group.items.map((a) => (
                  <li
                    key={a.id}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                      'min-w-0',
                      !a.active ? 'opacity-60' : '',
                    )}
                  >
                    <div className={cm.cn('min-w-0 flex-1')}>
                      <p
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm' }),
                          cm.fontWeight('semibold'),
                          'min-w-0',
                        )}
                      >
                        <span className={cm.cn('tabular-nums text-on-surface-variant')}>
                          {a.code}
                        </span>
                        <span className={cm.cn('truncate')}>{a.name}</span>
                        {!a.active ? (
                          <span
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.sp('py', 1),
                              cm.roundedFull,
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                              'shrink-0 bg-surface-container text-on-surface-variant',
                            )}
                          >
                            {t('accounts.tag.inactive', {}, { defaultValue: 'inactive' })}
                          </span>
                        ) : null}
                      </p>
                      {a.description ? (
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                          {a.description}
                        </p>
                      ) : null}
                    </div>
                    <span className={cm.cn(cm.fontWeight('semibold'), 'shrink-0 tabular-nums')}>
                      {fmtUsd(a.balance_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-wide',
          'text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 1), 'tabular-nums')}
      >
        {value}
      </p>
    </div>
  )
}
