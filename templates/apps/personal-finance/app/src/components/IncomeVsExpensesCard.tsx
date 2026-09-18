import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function IncomeVsExpensesCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  return (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ direction: 'col', gap: 'lg' }),
        'bg-surface-container-lowest rounded-2xl group hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
      data-mol-id="report-card-1"
    >
      <div className={cm.flex({ justify: 'between', align: 'start' })}>
        <div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'text-[10px] tracking-wider uppercase text-outline block',
            )}
          >
            {t('incomeVsExpensesCard.category', {}, { defaultValue: 'Comparison' })}
          </span>
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-headline')}>
            {t('incomeVsExpensesCard.title', {}, { defaultValue: 'Income vs Expenses' })}
          </h3>
        </div>
        <div ref={menuRef} className={cm.cn('relative')}>
          <button
            className={cm.cn(cm.sp('p', 2), cm.roundedFull, cm.textPrimary, 'hover:bg-primary/5')}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className={cm.cn('material-symbols-outlined')}>more_horiz</span>
          </button>
          {menuOpen && (
            <div
              className={cm.cn(
                cm.sp('mt', 1),
                cm.sp('py', 1),
                cm.w(40),
                'absolute right-0 bg-surface-container-low rounded-xl shadow-lg z-10',
              )}
            >
              <Link
                to="/reports"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'block text-left hover:bg-primary/5',
                )}
                onClick={() => setMenuOpen(false)}
              >
                {t('common.viewDetails', {}, { defaultValue: 'View details' })}
              </Link>
            </div>
          )}
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', gap: 'md' }),
          cm.sp('px', 4),
          cm.sp('pb', 2),
          cm.h(64),
        )}
        data-mol-id="viz-1"
      >
        <div className={cm.cn(cm.flex({ justify: 'center', gap: 'sm' }), 'w-full')}>
          <div className={cm.cn(cm.w(4), cm.h(40), 'bg-primary rounded-t-sm opacity-20')}></div>
          <div className={cm.cn(cm.w(4), cm.h(24), 'bg-primary rounded-t-sm')}></div>
        </div>
        <div className={cm.cn(cm.flex({ justify: 'center', gap: 'sm' }), 'w-full')}>
          <div className={cm.cn(cm.w(4), cm.h(48), 'bg-primary rounded-t-sm opacity-20')}></div>
          <div className={cm.cn(cm.w(4), cm.h(28), 'bg-primary rounded-t-sm')}></div>
        </div>
        <div className={cm.cn(cm.flex({ justify: 'center', gap: 'sm' }), 'w-full')}>
          <div className={cm.cn(cm.w(4), cm.h(56), 'bg-primary rounded-t-sm opacity-20')}></div>
          <div className={cm.cn(cm.w(4), cm.h(32), 'bg-primary rounded-t-sm')}></div>
        </div>
        <div className={cm.cn(cm.flex({ justify: 'center', gap: 'sm' }), 'w-full')}>
          <div className={cm.cn(cm.w(4), cm.h(44), 'bg-primary rounded-t-sm opacity-20')}></div>
          <div className={cm.cn(cm.w(4), cm.h(20), 'bg-primary rounded-t-sm')}></div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('pt', 4),
          'mt-auto border-t border-surface-container-high',
        )}
      >
        <div className={cm.cn(cm.flex({ gap: 'md' }))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.textSize('xs'),
              'gap-1.5 text-outline',
            )}
          >
            <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary/20')}></span>
            {t('incomeVsExpensesCard.legendIncome', {}, { defaultValue: 'Income' })}
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.textSize('xs'),
              'gap-1.5 text-outline',
            )}
          >
            <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary')}></span>
            {t('incomeVsExpensesCard.legendExpenses', {}, { defaultValue: 'Expenses' })}
          </div>
        </div>
        <Link
          className={cm.cn(
            'text-primary font-bold text-sm tracking-tight hover:underline underline-offset-4',
          )}
          data-mol-id="link-details-1"
          to="/reports"
        >
          {t('incomeVsExpensesCard.viewDetails', {}, { defaultValue: 'View Details' })}
        </Link>
      </div>
    </article>
  )
}

export default IncomeVsExpensesCard
export { IncomeVsExpensesCard }
