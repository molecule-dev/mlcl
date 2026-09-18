/**
 * Editorial transaction row — payee + category pill + account meta + amount.
 * Inflows render in success, outflows in on-surface, transfers in transfer
 * (purple) per Coffer's DESIGN.md semantic palette. Tabular-num amounts.
 *
 * Translated from personal-finance's ActivityRow + AccountRecentTransactions
 * — kept the round avatar, category-pill chip, and meta-line treatment.
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney, getCurrency } from '../lib/format.js'

export interface TransactionRecord {
  id: string
  posted_at: string
  payee: string
  category: string
  account_name: string
  amount_cents: number
  memo?: string
  cleared?: boolean
}

interface TransactionRowProps {
  tx: TransactionRecord
  showAccount?: boolean
}

function fmt(cents: number): string {
  return formatMoney(cents, getCurrency(), { signed: true })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function categoryTone(category: string): { pill: string; avatar: string; icon: string } {
  if (category === 'Income')
    return {
      pill: 'bg-success/15 text-success',
      avatar: 'bg-success/10 text-success',
      icon: 'south_west',
    }
  if (category === 'Transfer')
    return {
      pill: 'bg-primary/15 text-primary',
      avatar: 'bg-primary/10 text-primary',
      icon: 'swap_horiz',
    }
  if (category === 'Payment')
    return {
      pill: 'bg-secondary/15 text-secondary',
      avatar: 'bg-secondary/10 text-secondary',
      icon: 'credit_card',
    }
  return {
    pill: 'bg-surface-container text-on-surface-variant',
    avatar: 'bg-primary/10 text-primary',
    icon: 'shopping_bag',
  }
}

export function TransactionRow({ tx, showAccount = true }: TransactionRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = categoryTone(tx.category)
  const isInflow = tx.amount_cents > 0
  const amountColor =
    tx.category === 'Transfer' ? 'text-primary' : isInflow ? 'text-success' : 'text-on-surface'

  return (
    <Link
      to={`/transactions/${tx.id}`}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'rounded-xl hover:bg-surface-container-low transition-colors group',
      )}
      data-mol-id={`transaction-row-${tx.id}`}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0 flex-1')}>
        <span
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'shrink-0',
            tone.avatar,
          )}
          aria-hidden="true"
        >
          <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>
            {tone.icon}
          </span>
        </span>
        <div className={cm.cn('min-w-0 flex-1')}>
          <p
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'truncate text-on-surface',
            )}
          >
            {tx.payee}
          </p>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('mt', 0),
              'text-[11px] text-on-surface-variant',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 2),
                'rounded-full text-[10px] font-bold uppercase tracking-wider',
                tone.pill,
              )}
            >
              {tx.category}
            </span>
            <span>{fmtDate(tx.posted_at)}</span>
            {showAccount ? <span className="truncate">· {tx.account_name}</span> : null}
            {tx.cleared === false ? (
              <span
                className={cm.cn('text-[10px] uppercase tracking-wider font-bold', 'text-warning')}
              >
                {t('status.pending', {}, { defaultValue: 'Pending' })}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <span
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('extrabold'),
          'tabular-nums shrink-0',
          amountColor,
        )}
      >
        {fmt(tx.amount_cents)}
      </span>
    </Link>
  )
}
