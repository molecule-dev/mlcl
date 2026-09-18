import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BudgetProgressPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl border border-outline-variant/15 shadow-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 8))}>
        <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'))}>
          {t('budgetProgressPanel.title', {}, { defaultValue: 'Budget Progress' })}
        </h3>
        <div ref={menuRef} className={cm.cn('relative')}>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label={t('budgetProgressPanel.openMenu', {}, { defaultValue: 'Budget options' })}
            className={cm.cn(
              'material-symbols-outlined text-foreground-tertiary',
              cm.cursorPointer,
            )}
            onClick={() => setMenuOpen((o) => !o)}
          >
            more_horiz
          </button>
          {menuOpen && (
            <div
              className={cm.cn(
                cm.sp('mt', 1),
                cm.sp('p', 2),
                'absolute right-0 top-full min-w-[120px] z-10 bg-surface rounded-lg shadow-lg border border-outline-variant',
              )}
            >
              <button
                type="button"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('p', 2),
                  cm.textSize('sm'),
                  'text-left rounded-md hover:bg-surface-container-highest',
                )}
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/budgets')
                }}
              >
                {t('common.edit', {}, { defaultValue: 'Edit' })}
              </button>
              <button
                type="button"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('p', 2),
                  cm.textSize('sm'),
                  'text-left rounded-md hover:bg-surface-container-highest',
                )}
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/budgets')
                }}
              >
                {t('common.viewDetails', {}, { defaultValue: 'View Details' })}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className={cm.stack(8)}>
        {/* Budget Item */}
        <div className={cm.stack(2)}>
          <div className={cm.flex({ justify: 'between', align: 'end' })}>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined text-success')}>
                local_grocery_store
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('budgetProgressPanel.groceries', {}, { defaultValue: 'Groceries' })}
              </span>
            </div>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
              {t('budgetProgressPanel.spent', { amount: '$450' }, { defaultValue: '{{amount}}' })}
              <span className={cm.cn(cm.fontWeight('medium'), 'text-foreground-tertiary')}>
                {t(
                  'budgetProgressPanel.total',
                  { amount: '$600' },
                  { defaultValue: '/ {{amount}}' },
                )}
              </span>
            </span>
          </div>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.h(1),
              cm.roundedFull,
              'bg-surface-container-highest overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), 'bg-primary')} style={{ width: '75%' }}></div>
          </div>
        </div>
        <div className={cm.stack(2)}>
          <div className={cm.flex({ justify: 'between', align: 'end' })}>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined text-warning')}>
                restaurant
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('budgetProgressPanel.diningOut', {}, { defaultValue: 'Dining Out' })}
              </span>
            </div>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
              {t('budgetProgressPanel.spent', { amount: '$280' }, { defaultValue: '{{amount}}' })}
              <span className={cm.cn(cm.fontWeight('medium'), 'text-foreground-tertiary')}>
                {t(
                  'budgetProgressPanel.total',
                  { amount: '$300' },
                  { defaultValue: '/ {{amount}}' },
                )}
              </span>
            </span>
          </div>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.h(1),
              cm.roundedFull,
              'bg-surface-container-highest overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), 'bg-amber-500')} style={{ width: '93%' }}></div>
          </div>
        </div>
        <div className={cm.stack(2)}>
          <div className={cm.flex({ justify: 'between', align: 'end' })}>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined text-success')}>
                directions_car
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('budgetProgressPanel.transport', {}, { defaultValue: 'Transport' })}
              </span>
            </div>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'font-manrope')}>
              {t('budgetProgressPanel.spent', { amount: '$120' }, { defaultValue: '{{amount}}' })}
              <span className={cm.cn(cm.fontWeight('medium'), 'text-foreground-tertiary')}>
                {t(
                  'budgetProgressPanel.total',
                  { amount: '$200' },
                  { defaultValue: '/ {{amount}}' },
                )}
              </span>
            </span>
          </div>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.h(1),
              cm.roundedFull,
              'bg-surface-container-highest overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), 'bg-primary')} style={{ width: '60%' }}></div>
          </div>
        </div>
        <div className={cm.stack(2)}>
          <div className={cm.flex({ justify: 'between', align: 'end' })}>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined text-tertiary')}>
                theater_comedy
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t('budgetProgressPanel.entertainment', {}, { defaultValue: 'Entertainment' })}
              </span>
            </div>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'font-manrope text-tertiary',
              )}
            >
              {t('budgetProgressPanel.spent', { amount: '$350' }, { defaultValue: '{{amount}}' })}
              <span className={cm.cn(cm.fontWeight('medium'), 'text-foreground-tertiary')}>
                {t(
                  'budgetProgressPanel.total',
                  { amount: '$250' },
                  { defaultValue: '/ {{amount}}' },
                )}
              </span>
            </span>
          </div>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.h(1),
              cm.roundedFull,
              'bg-surface-container-highest overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), 'bg-tertiary')} style={{ width: '100%' }}></div>
          </div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] text-tertiary italic tracking-wide',
            )}
          >
            {t(
              'budgetProgressPanel.budgetExceeded',
              { amount: '$100' },
              { defaultValue: "You've exceeded this budget by {{amount}}" },
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default BudgetProgressPanel
export { BudgetProgressPanel }
