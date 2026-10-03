import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { formatMoney } from '../lib/money.js'
import { unwrapList } from '../lib/unwrap.js'

interface Account {
  id: string
  name: string
  kind: 'checking' | 'savings' | 'credit' | 'brokerage' | 'loan'
  balance_cents: number
  available_cents: number
  /** ISO-4217 code for this account's balances (defaults to USD). */
  currency?: string
  last4: string
  status: 'active' | 'frozen' | 'closed'
}

const STATUS_BADGE: Record<Account['status'], string> = {
  active: 'bg-success/10 text-success',
  frozen: 'bg-warning/10 text-warning',
  closed: 'bg-on-surface-variant/10 text-on-surface-variant',
}

export function Accounts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extracted so the shared LoadErrorBanner's Retry can re-run the same
  // fetch the mount effect uses (the banner owns the retry pending state).
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/accounts')
      setAccounts(unwrapList<Account>(res))
    } catch (_error) {
      setError(t('accounts.loadError', {}, { defaultValue: 'Failed to load accounts.' }))
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void load()
  }, [load])

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance_cents, 0)
  const activeCount = accounts.filter((a) => a.status === 'active').length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('accounts.eyebrow', {}, { defaultValue: 'Linked institutions' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('accounts.heading', {}, { defaultValue: 'Accounts' })}
        </h1>
        {!loading && !error && accounts.length > 0 ? (
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary-container text-primary uppercase tracking-wider tabular-nums',
              )}
            >
              {t(
                'accounts.totalBalance',
                // Cross-account total: rendered in USD (the platform default). A true
                // multi-currency total would need per-currency grouping or FX.
                { amount: formatMoney(totalBalance) },
                { defaultValue: '{{amount}} total' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-success-light text-success uppercase tracking-wider',
              )}
            >
              {t(
                'accounts.activeCount',
                { count: activeCount },
                { defaultValue: '{{count}} active' },
              )}
            </span>
          </div>
        ) : null}
      </header>

      {error ? (
        <LoadErrorBanner message={error} onRetry={load} />
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : accounts.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('accounts.empty', {}, { defaultValue: 'No accounts linked yet.' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {accounts.map((a) => (
            <li key={a.id}>
              <Link
                to={`/accounts/${a.id}`}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 5),
                  cm.flex({ align: 'center', justify: 'between' }),
                  'block hover:shadow-md transition-shadow',
                )}
              >
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <h2
                      className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'truncate')}
                    >
                      {a.name}
                    </h2>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        cm.roundedFull,
                        'shrink-0',
                        STATUS_BADGE[a.status],
                      )}
                    >
                      {t(`accounts.status.${a.status}`, {}, { defaultValue: a.status })}
                    </span>
                  </div>
                  <p className={cm.cn(cm.textSize('xs'), cm.textMuted, 'font-mono truncate')}>
                    {t(`accounts.kind.${a.kind}`, {}, { defaultValue: a.kind })} · •••• {a.last4}
                  </p>
                </div>
                <div className={cm.cn(cm.textRight, 'shrink-0 pl-2')}>
                  <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}>
                    {formatMoney(a.balance_cents, a.currency)}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                    {t(
                      'accounts.availableLabel',
                      { amount: formatMoney(a.available_cents, a.currency) },
                      { defaultValue: '{{amount}} available' },
                    )}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
