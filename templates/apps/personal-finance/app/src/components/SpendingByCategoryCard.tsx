import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SpendingByCategoryCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl group hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
      data-mol-id="report-card-2"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div>
          <span
            className={cm.cn(
              cm.sp('mb', 1),
              cm.fontWeight('bold'),
              'text-[10px] tracking-wider uppercase text-outline block',
            )}
          >
            {t('spendingByCategoryCard.reportType', {}, { defaultValue: 'Allocation' })}
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-headline')}>
            {t('spendingByCategoryCard.title', {}, { defaultValue: 'Spending by Category' })}
          </h2>
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
                'absolute right-0 top-full bg-surface-container-low rounded-xl shadow-lg z-10 min-w-[140px]',
              )}
            >
              <button
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'text-left hover:bg-primary/5',
                )}
                onClick={() => setMenuOpen(false)}
              >
                {t('common.download', {}, { defaultValue: 'Download' })}
              </button>
              <button
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'text-left hover:bg-primary/5',
                )}
                onClick={() => setMenuOpen(false)}
              >
                {t('common.share', {}, { defaultValue: 'Share' })}
              </button>
            </div>
          )}
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('my', 6),
          cm.h(64),
          cm.flex({ align: 'center', justify: 'center' }),
          'relative',
        )}
        data-mol-id="viz-2"
      >
        <div
          className={cm.cn(
            cm.w(48),
            cm.h(48),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'border-[18px] border-surface-container relative',
          )}
        >
          <div
            className={cm.cn(
              cm.roundedFull,
              'absolute inset-[-18px] border-[18px] border-primary border-t-transparent border-r-transparent rotate-45',
            )}
          ></div>
          <div
            className={cm.cn(
              cm.roundedFull,
              'absolute inset-[-18px] border-[18px] border-secondary border-t-transparent border-l-transparent border-b-transparent -rotate-12',
            )}
          ></div>
          <div className={cm.textCenter}>
            <p className={cm.cn(cm.textSize('3xl'), 'font-extrabold font-headline tracking-tight')}>
              {t(
                'spendingByCategoryCard.totalAmount',
                { amount: '$4,290' },
                { defaultValue: '{{amount}}' },
              )}
            </p>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-outline tracking-widest uppercase',
              )}
            >
              {t('spendingByCategoryCard.totalSpent', {}, { defaultValue: 'Total Spent' })}
            </p>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('pt', 4),
          'border-t border-surface-container-high',
        )}
      >
        <div className={cm.flex({ wrap: 'wrap', gap: 'md' })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.textSize('xs'),
              'gap-1.5 text-outline',
            )}
          >
            <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary')}></span>
            {t(
              'spendingByCategoryCard.primaryCategory',
              { category: 'Housing' },
              { defaultValue: '{{category}}' },
            )}
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.textSize('xs'),
              'gap-1.5 text-outline',
            )}
          >
            <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-secondary')}></span>
            {t(
              'spendingByCategoryCard.secondaryCategory',
              { category: 'Lifestyle' },
              { defaultValue: '{{category}}' },
            )}
          </div>
        </div>
        <Link
          className={cm.cn(
            'text-primary font-bold text-sm tracking-tight hover:underline underline-offset-4',
          )}
          data-mol-id="link-details-2"
          to="/reports"
        >
          {t('common.viewDetails', {}, { defaultValue: 'View Details' })}
        </Link>
      </div>
    </article>
  )
}

export default SpendingByCategoryCard
export { SpendingByCategoryCard }
