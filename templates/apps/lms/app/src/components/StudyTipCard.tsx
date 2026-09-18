import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function StudyTipCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-tertiary-fixed text-on-tertiary-fixed rounded-2xl shadow-sm relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <span className={cm.cn(cm.sp('mb', 2), 'material-symbols-outlined')} data-icon="lightbulb">
          lightbulb
        </span>
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            cm.sp('mb', 2),
            'font-headline',
          )}
        >
          {t('studyTipCard.title', {}, { defaultValue: 'Deep Study Tip' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed opacity-90')}>
          {t(
            'studyTipCard.breakTip',
            { minutes: 5 },
            {
              defaultValue:
                'Take a {{minutes}}-minute break after this lesson to let the key concepts settle into your long-term memory.',
            },
          )}
        </p>
      </div>
      <div className={cm.cn('absolute -right-4 -bottom-4 opacity-10')}>
        <span className={cm.cn('material-symbols-outlined text-[120px]')} data-icon="psychology">
          psychology
        </span>
      </div>
    </div>
  )
}

export default StudyTipCard
export { StudyTipCard }
