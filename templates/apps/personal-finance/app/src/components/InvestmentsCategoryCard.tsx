import { type MouseEvent, useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function InvestmentsCategoryCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const navigate = useNavigate()
  const [deleted, setDeleted] = useState(false)

  if (deleted) return null

  const handleDelete = async (e: MouseEvent) => {
    e.stopPropagation()
    setDeleted(true)
  }

  const handleCardClick = () => {
    navigate('/categories')
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate('/categories')
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('investmentsCategoryCard.title', {}, { defaultValue: 'Investments' })}
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl group hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        // Ignore keys bubbling from the inner edit/delete buttons.
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div className={cm.cn(cm.sp('p', 3), 'rounded-xl bg-secondary/10 text-secondary')}>
          <span className={cm.cn('material-symbols-outlined')}>trending_up</span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ gap: 'xs' }),
            'opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        >
          <button
            className={cm.cn(
              cm.sp('p', 2),
              cm.textMuted,
              'hover:bg-surface-container rounded-lg hover:text-primary transition-colors',
            )}
            onClick={handleEdit}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              data-icon="edit"
            >
              edit
            </span>
          </button>
          <button
            className={cm.cn(
              cm.sp('p', 2),
              cm.textMuted,
              'hover:bg-surface-container rounded-lg hover:text-tertiary transition-colors',
            )}
            onClick={handleDelete}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              data-icon="delete"
            >
              delete
            </span>
          </button>
        </div>
      </div>
      <h3
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('lg'),
          'font-headline text-on-surface-variant group-hover:text-secondary transition-colors',
        )}
      >
        {t('investmentsCategoryCard.title', {}, { defaultValue: 'Investments' })}
      </h3>
      <div className={cm.flex({ justify: 'between', align: 'baseline' })}>
        <span className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}>
          {t(
            'investmentsCategoryCard.transactions',
            { count: 15 },
            { defaultValue: '{{count}} Transactions' },
          )}
        </span>
        <span
          className={cm.cn(
            cm.textSize('3xl'),
            cm.sp('mt', 1),
            'font-headline font-extrabold tracking-tight',
          )}
        >
          {t(
            'investmentsCategoryCard.netAmount',
            { amount: '+$1,240.50' },
            { defaultValue: '{{amount}}' },
          )}
        </span>
      </div>
    </div>
  )
}

export default InvestmentsCategoryCard
export { InvestmentsCategoryCard }
