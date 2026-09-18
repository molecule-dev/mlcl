import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function GoalsPageHeader({ onAddGoal, showForm }: { onAddGoal?: () => void; showForm?: boolean }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 12))}>
      <div>
        <h2
          className={cm.cn(
            cm.textSize('4xl'),
            cm.sp('mb', 2),
            'font-headline font-extrabold text-on-surface tracking-tight',
          )}
        >
          {t('goalsPageHeader.title', {}, { defaultValue: 'Financial Goals' })}
        </h2>
        <p className={cm.cn(cm.maxW('lg'), 'text-on-surface-variant')}>
          {t(
            'goalsPageHeader.subtitle',
            {},
            {
              defaultValue:
                'Track your long-term prosperity and visualize your path to financial freedom.',
            },
          )}
        </p>
      </div>
      <button
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.fontWeight('bold'),
          'bg-gradient-to-br from-primary to-primary-container text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all',
        )}
        onClick={onAddGoal}
      >
        <span className={cm.cn('material-symbols-outlined')} data-icon="add">
          add
        </span>
        {showForm
          ? t('common.cancel', {}, { defaultValue: 'Cancel' })
          : t('goalsPageHeader.createGoal', {}, { defaultValue: 'Create Goal' })}
      </button>
    </header>
  )
}

export default GoalsPageHeader
export { GoalsPageHeader }
