import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { formatMoney } from '../lib/money.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Account {
  id: string
  name: string
  kind: string
  balance_cents: number
  available_cents: number
  /** ISO-4217 code for this account's balances (defaults to USD). */
  currency?: string
  last4: string
  status?: 'active' | 'frozen' | 'closed'
}

const STATUS_BADGE: Record<NonNullable<Account['status']>, string> = {
  active: 'bg-success-light text-success',
  frozen: 'bg-warning-light text-warning',
  closed: 'bg-surface-container text-on-surface-variant',
}

interface Transaction {
  id: string
  account_id: string
  description: string
  amount_cents: number
  date_iso: string
  category: string
  status: 'posted' | 'pending'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function AccountDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [account, setAccount] = useState<Account | null>(null)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extracted so the shared LoadErrorBanner's Retry can re-run the same
  // fetch the mount effect uses (the banner owns the retry pending state).
  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [aRes, tRes] = await Promise.all([
        http.get(`/api/accounts/${id}`).catch(() => null),
        http.get('/api/transactions').catch(() => null),
      ])
      setAccount(unwrapSingle<Account>(aRes))
      setTxs(unwrapList<Transaction>(tRes).filter((t) => t.account_id === id))
    } catch (_error) {
      setError(t('accountDetail.loadError', {}, { defaultValue: 'Failed to load account.' }))
    } finally {
      setLoading(false)
    }
  }, [id, http, t])

  useEffect(() => {
    void load()
  }, [load])

  // Posted vs pending split for summary
  const postedCount = txs.filter((t) => t.status === 'posted').length
  const pendingCount = txs.filter((t) => t.status === 'pending').length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/accounts"
        className={cm.cn(
          cm.textSize('sm'),
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textMuted,
          'hover:text-on-surface transition-colors w-fit group',
        )}
      >
        <span
          className={cm.cn(
            'material-symbols-outlined text-base group-hover:-translate-x-0.5 transition-transform',
          )}
          aria-hidden="true"
        >
          arrow_back
        </span>
        {t('accountDetail.backLink', {}, { defaultValue: 'All accounts' })}
      </Link>

      {error ? (
        <LoadErrorBanner message={error} onRetry={load} />
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : !account ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textMuted)}>
          {t(
            'accountDetail.unavailable',
            {},
            { defaultValue: 'This account is no longer available. Pick another from the list.' },
          )}
        </p>
      ) : (
        <div className={cm.cn(cm.sp('mt', 4), 'space-y-6')}>
          {/* Hero header card with decorative sparkline §9.2 */}
          <header className={cm.cn(cm.card(), cm.sp('p', 6), 'relative overflow-hidden')}>
            <div className={cm.cn('relative z-10')}>
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.textMuted,
                    'uppercase tracking-wider font-bold',
                  )}
                >
                  {t(`accountDetail.kind.${account.kind}`, {}, { defaultValue: account.kind })} ·
                  •••• {account.last4}
                </p>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'py-0.5 uppercase tracking-wider',
                    STATUS_BADGE[account.status ?? 'active'],
                  )}
                >
                  {account.status === 'frozen'
                    ? t('accounts.status.frozen', {}, { defaultValue: 'Frozen' })
                    : account.status === 'closed'
                      ? t('accounts.status.closed', {}, { defaultValue: 'Closed' })
                      : t('accountDetail.activeBadge', {}, { defaultValue: 'Active' })}
                </span>
              </div>
              <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                {account.name}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 4),
                  'tabular-nums tracking-tight',
                )}
              >
                {formatMoney(account.balance_cents, account.currency)}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t(
                  'accountDetail.availableLabel',
                  { amount: formatMoney(account.available_cents, account.currency) },
                  { defaultValue: '{{amount}} available' },
                )}
              </p>
            </div>
            {/* Decorative sparkline on right — §9.2 brand stroke */}
            <svg
              aria-hidden="true"
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              className={cm.cn(
                'absolute right-0 bottom-0 h-20 w-48 opacity-20 stroke-primary stroke-2 fill-none',
              )}
            >
              <path d="M0 35 Q 20 10, 40 25 T 100 5" strokeLinecap="round" />
            </svg>
          </header>

          <section>
            <div
              className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), cm.sp('mb', 3))}
            >
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
                {t('nav.transactions', {}, { defaultValue: 'Transactions' })}
              </h2>
              {txs.length > 0 ? (
                <div className={cm.flex({ gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'py-0.5 bg-success-light text-success uppercase tracking-wider',
                    )}
                  >
                    {t(
                      'accountDetail.postedCount',
                      { count: postedCount },
                      { defaultValue: '{{count}} posted' },
                    )}
                  </span>
                  {pendingCount > 0 ? (
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'py-0.5 bg-warning-light text-warning uppercase tracking-wider',
                      )}
                    >
                      {t(
                        'accountDetail.pendingCount',
                        { count: pendingCount },
                        { defaultValue: '{{count}} pending' },
                      )}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {txs.length === 0 ? (
              <p className={cm.cn(cm.sp('py', 8), cm.textMuted)}>
                {t('accountDetail.txEmpty', {}, { defaultValue: 'No transactions yet.' })}
              </p>
            ) : (
              <ul className={cm.cn(cm.card(), 'divide-y divide-outline-variant')}>
                {txs.map((tx) => (
                  <li
                    key={tx.id}
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.flex({ align: 'center', justify: 'between' }),
                    )}
                  >
                    <div className={cm.flex1}>
                      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                        <p className={cm.fontWeight('medium')}>{tx.description}</p>
                        {tx.status === 'pending' ? (
                          <span
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.textSize('xs'),
                              cm.roundedFull,
                              'bg-warning/10 text-warning',
                            )}
                          >
                            {t('status.pending', {}, { defaultValue: 'Pending' })}
                          </span>
                        ) : null}
                      </div>
                      <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                        {tx.category} · {fmtDate(tx.date_iso)}
                      </p>
                    </div>
                    <span
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        'tabular-nums',
                        tx.amount_cents >= 0 ? 'text-success' : 'text-error',
                      )}
                    >
                      {formatMoney(tx.amount_cents, account.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
