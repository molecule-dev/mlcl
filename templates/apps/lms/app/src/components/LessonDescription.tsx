import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface LessonDescriptionProps {
  lesson?: { title?: string; description?: string }
}

function LessonDescription({ lesson }: LessonDescriptionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const description = lesson?.description?.trim() ?? ''
  return (
    <div className={cm.stack(4)}>
      <h3
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.sp('pl', 4),
          'border-l-4 border-primary',
        )}
      >
        {t('lessonDescription.heading', {}, { defaultValue: 'Lesson Description' })}
      </h3>
      {description ? (
        <p className={cm.cn('text-foreground-secondary leading-relaxed body-lg')}>{description}</p>
      ) : (
        <p
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          data-mol-id="lesson-description-empty"
        >
          {t(
            'lessonDescription.empty',
            {},
            { defaultValue: 'No description available for this lesson.' },
          )}
        </p>
      )}
    </div>
  )
}

export default LessonDescription
export { LessonDescription }
