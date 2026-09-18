import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LessonCompleteButton({
  completed = false,
  loading = false,
  onComplete,
}: {
  completed?: boolean
  loading?: boolean
  onComplete?: () => void
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.sp('pt', 8), cm.flex({ justify: 'center' }))}>
      <button
        onClick={onComplete}
        disabled={loading || completed}
        className={cm.cn(
          cm.sp('px', 12),
          cm.sp('py', 4),
          cm.fontWeight('bold'),
          cm.textSize('lg'),
          'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed',
        )}
      >
        {t('lessonCompleteButton.markComplete', {}, { defaultValue: 'Mark as Complete' })}
      </button>
    </div>
  )
}

export default LessonCompleteButton
export { LessonCompleteButton }
