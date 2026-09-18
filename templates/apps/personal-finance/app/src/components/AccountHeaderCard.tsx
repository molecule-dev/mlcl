import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/money.js'

function AccountHeaderCard({
  account,
}: {
  account: {
    id: string
    name: string
    type: string
    institution: string
    account_number: string
    balance: number
    currency: string
  }
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-[2rem] min-h-[340px] relative overflow-hidden group hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
    >
      <div
        className={cm.cn(
          cm.roundedFull,
          cm.w(64),
          cm.h(64),
          'absolute top-0 right-0 bg-primary/5 -mr-20 -mt-20 blur-3xl transition-all group-hover:bg-primary/10',
        )}
      ></div>
      <div className={cm.cn('z-10')}>
        <div className={cm.flex({ align: 'start', justify: 'between' })}>
          <div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 2))}>
              <h1
                className={cm.cn(
                  cm.textSize('3xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {account.name}
              </h1>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'bg-surface-container-high text-on-surface-variant text-[10px] tracking-wider uppercase',
                )}
              >
                {account.type}
              </span>
            </div>
            <p className={cm.cn(cm.fontWeight('medium'), 'text-foreground-secondary')}>
              {account.institution}
            </p>
          </div>
          <div className={cm.textRight}>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 1),
                'text-[10px] uppercase tracking-[0.2em] text-foreground-tertiary',
              )}
            >
              {t('nav.status', {}, { defaultValue: 'Status' })}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'text-success',
              )}
            >
              <span
                className={cm.cn(cm.roundedFull, cm.w(2), cm.h(2), 'bg-emerald-500 animate-pulse')}
              ></span>
              {t('accountHeaderCard.statusLinked', {}, { defaultValue: 'Linked' })}
            </div>
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.sp('mt', 12), 'z-10')}>
        <div className={cm.flex({ direction: 'col' })}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'text-[11px] tracking-[0.25em] uppercase text-foreground-tertiary',
            )}
          >
            {t('accountHeaderCard.currentBalance', {}, { defaultValue: 'Current Balance' })}
          </span>
          <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }))}>
            <span className={cm.cn('text-6xl font-extrabold tracking-tighter text-success')}>
              {formatMoney(account.balance, account.currency)}
            </span>
          </div>
          <div className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', gap: 'lg' }))}>
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-wider text-foreground-tertiary',
                )}
              >
                {t('accountHeaderCard.available', {}, { defaultValue: 'Available' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'text-on-surface-variant',
                )}
              >
                {formatMoney(account.balance, account.currency)}
              </p>
            </div>
            <div className={cm.cn(cm.h(8), 'w-[1px] bg-border')}></div>
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-wider text-foreground-tertiary',
                )}
              >
                {t('settings.account', {}, { defaultValue: 'Account' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-foreground-secondary',
                )}
              >
                {account.account_number
                  ? `••••${account.account_number.slice(-4)}`
                  : account.currency}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AccountHeaderCard
export { AccountHeaderCard }
