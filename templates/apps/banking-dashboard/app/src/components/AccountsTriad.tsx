import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/money.js'

interface Account {
  id: string
  name: string
  kind: 'checking' | 'savings' | 'credit' | 'brokerage' | 'loan'
  balance_cents: number
  available_cents: number
  /** ISO-4217 code for this account's balances (defaults to USD). */
  currency?: string
  last4: string
}

interface AccountsTriadProps {
  accounts: Account[]
}

const KIND_ICON: Record<Account['kind'], string> = {
  checking: 'account_balance',
  savings: 'savings',
  credit: 'credit_card',
  brokerage: 'show_chart',
  loan: 'home',
}

const KIND_TINT: Record<Account['kind'], string> = {
  checking: 'text-primary',
  savings: 'text-secondary',
  credit: 'text-tertiary',
  brokerage: 'text-info',
  loan: 'text-warning',
}

/**
 * Three-up account-card section — surface-container-low cards with icon
 * chip in white-shadow square, uppercase 10px label, 3xl extrabold balance,
 * group-hover icon scale.
 *
 * Translated from personal-finance's DashboardAccountOverview pattern.
 * Falls back to fewer-than-3 cards if the account list is short.
 */
export function AccountsTriad({ accounts }: AccountsTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const featured = accounts.slice(0, 3)

  if (featured.length === 0) return null

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
      {featured.map((a) => (
        <Link
          key={a.id}
          to={`/accounts/${a.id}`}
          className={cm.cn(
            cm.sp('p', 6),
            cm.cursorPointer,
            'block bg-surface-container-low rounded-2xl hover:bg-surface-container-lowest transition-all group',
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
            <div
              className={cm.cn(
                cm.sp('p', 3),
                KIND_TINT[a.kind],
                'bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {KIND_ICON[a.kind]}
              </span>
            </div>
            <span className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">
              •••• {a.last4}
            </span>
          </div>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('mb', 1),
              'text-on-surface-variant',
            )}
          >
            {t(
              `accountsTriad.kind.${a.kind}`,
              {},
              { defaultValue: a.kind.charAt(0).toUpperCase() + a.kind.slice(1) },
            )}
          </p>
          <p
            className={cm.cn(
              cm.textSize('3xl'),
              'font-extrabold tabular-nums',
              a.kind === 'credit' || a.kind === 'loan' ? 'text-tertiary' : '',
            )}
          >
            {formatMoney(a.balance_cents, a.currency)}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'accountsTriad.availableLabel',
              { amount: formatMoney(a.available_cents, a.currency) },
              { defaultValue: '{{amount}} available' },
            )}
          </p>
        </Link>
      ))}
    </section>
  )
}
