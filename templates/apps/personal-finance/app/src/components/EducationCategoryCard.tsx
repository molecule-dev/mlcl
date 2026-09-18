import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function EducationCategoryCard({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group relative overflow-hidden',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div className={cm.cn(cm.sp('p', 3), 'rounded-xl bg-warning-light text-warning')}>
          <span
            className={cm.cn('material-symbols-outlined')}
            data-icon="school"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            school
          </span>
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
              'hover:bg-surface-container rounded-lg text-foreground-tertiary hover:text-primary transition-colors',
            )}
            onClick={onEdit}
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
              'hover:bg-surface-container rounded-lg text-foreground-tertiary hover:text-tertiary transition-colors',
            )}
            onClick={onDelete}
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
          'font-headline text-on-surface-variant group-hover:text-primary transition-colors',
        )}
      >
        {t('educationCategoryCard.title', {}, { defaultValue: 'Education' })}
      </h3>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'baseline' }),
          cm.sp('mt', 1),
          cm.sp('mb', 4),
        )}
      >
        <span
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-foreground-tertiary')}
        >
          {t(
            'educationCategoryCard.transactions',
            { count: 1 },
            { defaultValue: '{{count}} transactions' },
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
            'educationCategoryCard.total',
            { amount: '$5,000.00' },
            { defaultValue: '{{amount}}' },
          )}
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
        <div className={cm.cn(cm.w('full'), cm.h('full'), cm.roundedFull, 'bg-tertiary')}></div>
      </div>
    </div>
  )
}

export default EducationCategoryCard
export { EducationCategoryCard }
