import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function TransactionDetailBreadcrumb() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      {/* Breadcrumb */}
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.sp('mb', 10),
          'text-foreground-secondary',
        )}
      >
        <Link
          to="/transactions"
          className={cm.cn(
            'flex items-center justify-center p-2 rounded-full hover:bg-surface-container-low transition-colors',
          )}
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>arrow_back</span>
        </Link>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'font-label tracking-widest uppercase',
          )}
        >
          <Link
            to="/transactions"
            className={cm.cn('hover:text-primary cursor-pointer transition-colors')}
          >
            {t('nav.transactions', {}, { defaultValue: 'Transactions' })}
          </Link>
          <span className={cm.cn('text-foreground-tertiary')}>
            {t('common.separator', {}, { defaultValue: '/' })}
          </span>
          <span className={cm.cn('text-foreground font-extrabold')}>
            {t('transactionDetailBreadcrumb.pageTitle', {}, { defaultValue: 'Transaction Detail' })}
          </span>
        </div>
      </nav>
    </>
  )
}

export default TransactionDetailBreadcrumb
export { TransactionDetailBreadcrumb }
