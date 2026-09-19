import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatSignedCents } from '../lib/money.js'

interface FriendNet {
  name: string
  net_cents: number
  is_self: boolean
}

interface BalancesSummary {
  you_owe_cents: number
  you_are_owed_cents: number
  groups: { id: string; name: string; my_balance_cents: number }[]
  friends: FriendNet[]
}

export function Balances() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [summary, setSummary] = useState<BalancesSummary | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get<BalancesSummary>('/api/dashboard/summary')
      .then((response) => {
        if (cancelled) return
        setSummary((response?.data as BalancesSummary) ?? null)
        setError(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const friends = summary?.friends ?? []
  const youOwe = friends.filter((f) => f.net_cents < 0)
  const oweYou = friends.filter((f) => f.net_cents > 0)
  const settledFriends = friends.filter((f) => f.net_cents === 0)

  return (
    <div data-mol-id="page-balances" className={cm.stack(8)}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('balances.eyebrow', {}, { defaultValue: 'Who owes whom' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('balances.title', {}, { defaultValue: 'Balances & settle up' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant max-w-2xl')}
        >
          {t(
            'balances.subtitle',
            {},
            {
              defaultValue:
                'Per-person nets aggregated across every group. Settle up inside each group to record what actually moved.',
            },
          )}
        </p>
      </header>

      {error ? (
        <div
          data-mol-id="balances-error"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-warning-container/40 text-on-warning-container',
          )}
        >
          {t(
            'balances.loadFailed',
            {},
            { defaultValue: 'Balances are unavailable right now — refresh to retry.' },
          )}
        </div>
      ) : null}

      <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-error-container/30 border border-error/30',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('balances.youOweTitle', {}, { defaultValue: 'You owe' })}
          </p>
          <p className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 2), 'font-extrabold tabular-nums')}>
            {formatSignedCents(summary?.you_owe_cents ?? 0)}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'balances.youOweCount',
              { count: youOwe.length },
              { defaultValue: 'To {{count}} people' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-primary-container/40 border border-primary/30',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('balances.owedTitle', {}, { defaultValue: 'Owed to you' })}
          </p>
          <p className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 2), 'font-extrabold tabular-nums')}>
            {formatSignedCents(summary?.you_are_owed_cents ?? 0)}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'balances.owedCount',
              { count: oweYou.length },
              { defaultValue: 'From {{count}} people' },
            )}
          </p>
        </div>
      </div>

      <section data-mol-id="balances-by-friend" className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('balances.byFriend', {}, { defaultValue: 'By person' })}
        </h2>
        <div
          className={cm.cn(
            'rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden',
          )}
        >
          <ul className={cm.cn('divide-y divide-outline-variant/40')}>
            {friends.map((friend, idx) => (
              <li
                key={`${friend.name}-${idx}`}
                data-mol-id={`balance-row-${idx}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-9 w-9 shrink-0 rounded-full text-xs font-bold uppercase',
                    friend.net_cents < 0
                      ? 'bg-error-container text-on-error-container'
                      : friend.net_cents > 0
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container-low text-on-surface-variant',
                  )}
                  aria-hidden="true"
                >
                  {friend.name.slice(0, 2)}
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {friend.name}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {friend.net_cents === 0
                      ? t('balances.settled', {}, { defaultValue: 'Settled up' })
                      : friend.net_cents < 0
                        ? t('balances.youOweThem', {}, { defaultValue: 'You owe them' })
                        : t('balances.theyOweYou', {}, { defaultValue: 'They owe you' })}
                  </span>
                </div>
                <span
                  className={cm.cn(
                    'text-base font-bold tabular-nums shrink-0',
                    friend.net_cents < 0
                      ? 'text-error'
                      : friend.net_cents > 0
                        ? 'text-primary'
                        : 'text-on-surface-variant',
                  )}
                >
                  {friend.net_cents === 0 ? '—' : formatSignedCents(Math.abs(friend.net_cents))}
                </span>
              </li>
            ))}
          </ul>
          {loaded && friends.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'balances.empty',
                {},
                {
                  defaultValue: 'No balances yet — once groups have expenses, nets show up here.',
                },
              )}
            </div>
          ) : null}
          {settledFriends.length > 0 ? (
            <p
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('xs'),
                'text-on-surface-variant',
                'border-t border-outline-variant/40',
              )}
            >
              {t(
                'balances.settledCount',
                { count: settledFriends.length },
                { defaultValue: '{{count}} people are fully settled with you.' },
              )}
            </p>
          ) : null}
        </div>
      </section>

      <section data-mol-id="balances-by-group" className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('balances.byGroup', {}, { defaultValue: 'By group' })}
        </h2>
        <div
          className={cm.cn(
            'rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden',
          )}
        >
          <ul className={cm.cn('divide-y divide-outline-variant/40')}>
            {(summary?.groups ?? []).map((group) => (
              <li key={group.id}>
                <Link
                  to={`/groups/${group.id}`}
                  data-mol-id={`balance-group-${group.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    cm.sp('px', 5),
                    cm.sp('py', 4),
                    'hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {group.name}
                  </span>
                  <span
                    className={cm.cn(
                      'text-sm font-bold tabular-nums',
                      group.my_balance_cents < 0
                        ? 'text-error'
                        : group.my_balance_cents > 0
                          ? 'text-primary'
                          : 'text-on-surface-variant',
                    )}
                  >
                    {group.my_balance_cents === 0
                      ? t('balances.settled', {}, { defaultValue: 'Settled up' })
                      : formatSignedCents(group.my_balance_cents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'balances.settleHint',
            {},
            {
              defaultValue: 'Open a group to see the suggested minimal transfers that zero it out.',
            },
          )}
        </p>
      </section>
    </div>
  )
}
