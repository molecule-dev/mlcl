import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function DashboardAccountOverview() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
      <Link
        to="/accounts/checking"
        className={cm.cn(
          cm.sp('p', 6),
          'block bg-surface-container-low rounded-2xl hover:bg-surface-container-lowest transition-all group',
        )}
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textPrimary,
              'bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="account_balance">
              account_balance
            </span>
          </div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-foreground-tertiary',
            )}
          >
            {t('dashboardAccountOverview.checkingLabel', {}, { defaultValue: 'Main Account' })}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('mb', 1),
            'text-foreground-secondary',
          )}
        >
          {t('common.checkingAccount', {}, { defaultValue: 'Checking' })}
        </p>
        <p className={cm.cn(cm.textSize('3xl'), 'font-manrope font-extrabold')}>
          {t(
            'dashboardAccountOverview.balance',
            { sign: '', amount: '12,450.20' },
            { defaultValue: '{{sign}}${{amount}}' },
          )}
        </p>
      </Link>
      <Link
        to="/accounts/savings"
        className={cm.cn(
          cm.sp('p', 6),
          'block bg-surface-container-low rounded-2xl hover:bg-surface-container-lowest transition-all group',
        )}
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
          <div
            className={cm.cn(
              cm.sp('p', 3),
              'bg-surface rounded-xl shadow-sm text-secondary group-hover:scale-110 transition-transform',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="savings">
              savings
            </span>
          </div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-foreground-tertiary',
            )}
          >
            {t('dashboardAccountOverview.savingsLabel', {}, { defaultValue: 'Emergency Fund' })}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('mb', 1),
            'text-foreground-secondary',
          )}
        >
          {t('common.savingsAccount', {}, { defaultValue: 'Savings' })}
        </p>
        <p className={cm.cn(cm.textSize('3xl'), 'font-manrope font-extrabold')}>
          {t(
            'dashboardAccountOverview.balance',
            { sign: '', amount: '28,000.00' },
            { defaultValue: '{{sign}}${{amount}}' },
          )}
        </p>
      </Link>
      <Link
        to="/accounts/credit-card"
        className={cm.cn(
          cm.sp('p', 6),
          'block bg-surface-container-low rounded-2xl hover:bg-surface-container-lowest transition-all group',
        )}
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
          <div
            className={cm.cn(
              cm.sp('p', 3),
              'bg-surface rounded-xl shadow-sm text-tertiary group-hover:scale-110 transition-transform',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="credit_card">
              credit_card
            </span>
          </div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-foreground-tertiary',
            )}
          >
            {t('dashboardAccountOverview.creditCardLabel', {}, { defaultValue: 'Mastercard' })}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('mb', 1),
            'text-foreground-secondary',
          )}
        >
          {t('common.creditCard', {}, { defaultValue: 'Credit Card' })}
        </p>
        <p className={cm.cn(cm.textSize('3xl'), 'font-manrope font-extrabold text-tertiary')}>
          {t(
            'dashboardAccountOverview.balance',
            { sign: '-', amount: '3,200.45' },
            { defaultValue: '{{sign}}${{amount}}' },
          )}
        </p>
      </Link>
    </section>
  )
}

export default DashboardAccountOverview
export { DashboardAccountOverview }
