import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type AddTransactionFabProps = {
  onClick?: () => void
}

function AddTransactionFab({ onClick }: AddTransactionFabProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const className = cm.cn(
    cm.flex({ align: 'center', justify: 'center' }),
    cm.w(14),
    cm.h(14),
    cm.roundedFull,
    cm.cursorPointer,
    'bg-primary text-white shadow-2xl shadow-primary/40 hover:scale-110 transition-transform group',
  )
  const label = (
    <span
      className={cm.cn(
        cm.sp('mr', 4),
        cm.sp('px', 3),
        cm.fontWeight('bold'),
        'absolute right-full py-1.5 bg-inverse-surface text-inverse-on-surface text-[10px] uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none',
      )}
    >
      {t('addTransactionFab.tooltip', {}, { defaultValue: 'Quick Add' })}
    </span>
  )
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'fixed bottom-10 right-10')}>
      {onClick ? (
        <button type="button" className={className} onClick={onClick}>
          <span className={cm.cn('material-symbols-outlined')} data-weight="fill">
            add
          </span>
          {label}
        </button>
      ) : (
        <Link to="/transactions/new" className={className}>
          <span className={cm.cn('material-symbols-outlined')} data-weight="fill">
            add
          </span>
          {label}
        </Link>
      )}
    </div>
  )
}

export default AddTransactionFab
export { AddTransactionFab }
