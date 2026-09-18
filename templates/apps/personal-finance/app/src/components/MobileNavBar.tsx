import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function MobileNavBar() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <nav
      className={cm.cn(
        cm.flex({ justify: 'around', align: 'center' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'md:hidden fixed bottom-0 left-0 right-0 glass-nav z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.05)]',
      )}
    >
      <Link
        to="/"
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
          'text-foreground-tertiary',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')}>dashboard</span>
        <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] uppercase tracking-tighter')}>
          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </span>
      </Link>
      <Link
        to="/transactions"
        className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }), 'text-success')}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          receipt_long
        </span>
        <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] uppercase tracking-tighter')}>
          {t('nav.transactions', {}, { defaultValue: 'Transactions' })}
        </span>
      </Link>
      <Link
        to="/transactions/new"
        className={cm.cn(
          cm.sp('p', 3),
          cm.roundedFull,
          'bg-primary text-white -mt-10 shadow-lg shadow-primary/30',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')}>add</span>
      </Link>
      <Link
        to="/accounts"
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
          'text-foreground-tertiary',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')}>account_balance_wallet</span>
        <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] uppercase tracking-tighter')}>
          {t('common.accounts', {}, { defaultValue: 'Accounts' })}
        </span>
      </Link>
      <Link
        to="/settings"
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
          'text-foreground-tertiary',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')}>settings</span>
        <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] uppercase tracking-tighter')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </span>
      </Link>
    </nav>
  )
}

export default MobileNavBar
export { MobileNavBar }
