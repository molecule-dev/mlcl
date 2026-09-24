import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

interface Account {
  id: string
  name: string
  type: string
  balance?: number | string
  institution?: string | null
  currency?: string
}

const TYPE_META: Record<
  string,
  { icon: string; bg: string; color: string; badgeKey: string; badgeDefault: string }
> = {
  checking: {
    icon: 'account_balance',
    bg: 'bg-success-light',
    color: 'text-success',
    badgeKey: 'accountCard.badgeChecking',
    badgeDefault: 'Bank',
  },
  savings: {
    icon: 'savings',
    bg: 'bg-sky-50',
    color: 'text-sky-600',
    badgeKey: 'accountCard.badgeSavings',
    badgeDefault: 'Savings',
  },
  credit: {
    icon: 'credit_card',
    bg: 'bg-rose-50',
    color: 'text-error',
    badgeKey: 'accountCard.badgeCredit',
    badgeDefault: 'Credit',
  },
  investment: {
    icon: 'trending_up',
    bg: 'bg-violet-50',
    color: 'text-violet-600',
    badgeKey: 'accountCard.badgeInvestment',
    badgeDefault: 'Investment',
  },
  cash: {
    icon: 'payments',
    bg: 'bg-warning-light',
    color: 'text-warning',
    badgeKey: 'accountCard.badgeCash',
    badgeDefault: 'Cash',
  },
  other: {
    icon: 'account_balance_wallet',
    bg: 'bg-surface-secondary',
    color: 'text-foreground-secondary',
    badgeKey: 'accountCard.badgeOther',
    badgeDefault: 'Other',
  },
}

function formatBalance(amount: number | string | undefined, currency = 'USD'): string {
  const n = typeof amount === 'number' ? amount : Number(amount ?? 0)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
}

export type AccountGridProps = {
  accounts?: Account[]
  loading?: boolean
  onAccountClick?: (id: string) => void
  onDeleteAccount?: (id: string) => void | Promise<void>
}

function AccountGrid({ accounts = [], loading = false, onDeleteAccount }: AccountGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (loading) {
    return (
      <div
        data-mol-id="accounts-grid-loading"
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-low animate-pulse')}
            style={{ minHeight: 200 }}
          />
        ))}
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div
        data-mol-id="accounts-grid-empty"
        className={cm.cn(
          cm.sp('p', 12),
          cm.textCenter,
          cm.stack(4),
          'bg-surface-container-lowest rounded-3xl',
        )}
      >
        <span
          className="material-symbols-outlined"
          aria-hidden="true"
          style={{ fontSize: '3rem', opacity: 0.4 }}
        >
          account_balance_wallet
        </span>
        <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
          {t('accountsGrid.emptyTitle', {}, { defaultValue: 'No accounts yet' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t(
            'accountsGrid.emptyDescription',
            {},
            {
              defaultValue:
                'Add your checking, savings, credit cards or investment accounts to start tracking your net worth.',
            },
          )}
        </p>
        <Link
          to="/accounts/new"
          data-mol-id="accounts-grid-empty-cta"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.cursorPointer,
            'bg-primary text-on-primary rounded-xl inline-block self-center',
          )}
        >
          {t('accountsGrid.emptyCta', {}, { defaultValue: 'Add your first account' })}
        </Link>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}
      data-mol-id="accounts-grid"
    >
      {accounts.map((account) => {
        const meta = TYPE_META[account.type] || TYPE_META.other
        return (
          <article
            key={account.id}
            data-mol-id="accounts-grid-card"
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group relative',
            )}
          >
            <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
              <div className={cm.cn(cm.sp('p', 3), 'rounded-xl', meta.bg, meta.color)}>
                <span className={cm.cn('material-symbols-outlined')}>{meta.icon}</span>
              </div>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  meta.bg,
                  meta.color,
                  'text-[10px] uppercase tracking-wider',
                )}
              >
                {t(meta.badgeKey, {}, { defaultValue: meta.badgeDefault })}
              </span>
            </div>
            <Link to={`/accounts/${account.id}`} className={cm.cn('block')}>
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  'font-headline text-on-surface-variant group-hover:text-primary transition-colors',
                )}
              >
                {account.name}
              </h3>
              <p
                data-mol-id="accounts-grid-card-balance"
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.sp('mt', 1),
                  'font-headline font-extrabold tracking-tight',
                  Number(account.balance ?? 0) < 0 ? 'text-tertiary' : '',
                )}
              >
                {formatBalance(account.balance, account.currency || 'USD')}
              </p>
              {account.institution && (
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), cm.textMuted)}>
                  {account.institution}
                </p>
              )}
            </Link>
            {onDeleteAccount && (
              <ConfirmButton
                data-mol-id="accounts-grid-card-delete"
                label={t('accountsGrid.deleteCta', {}, { defaultValue: 'Remove account' })}
                confirmLabel={t(
                  'accountsGrid.deleteConfirm',
                  {},
                  { defaultValue: 'Delete this account? Transactions will be kept.' },
                )}
                onConfirm={() => onDeleteAccount(account.id)}
                disarmSeconds={5}
                size="sm"
                color="error"
                variant="link"
                className={cm.cn(cm.sp('mt', 4), cm.textSize('xs'), cm.fontWeight('semibold'))}
              />
            )}
          </article>
        )
      })}
    </div>
  )
}

export default AccountGrid
export { AccountGrid }
