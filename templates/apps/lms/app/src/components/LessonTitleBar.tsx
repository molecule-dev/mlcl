import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface LessonTitleBarProps {
  lesson?: { id: string; title: string; completed: boolean }
  moduleOrder: number
  lessonIdx: number
}

function LessonTitleBar({ lesson, moduleOrder, lessonIdx }: LessonTitleBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const status = lesson?.completed
    ? t('common.completed', {}, { defaultValue: 'Completed' })
    : t('lessonTitleBar.inProgress', {}, { defaultValue: 'In Progress' })
  return (
    <div className={cm.flex({ align: 'center', justify: 'between' })}>
      <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t(
          'lessonTitleBar.heading',
          {
            moduleOrder,
            lessonNumber: lessonIdx + 1,
            title:
              lesson?.title ??
              t(
                'lessonTitleBar.fallbackTitle',
                {},
                { defaultValue: 'Neural Network Fundamentals' },
              ),
          },
          { defaultValue: '{{moduleOrder}}.{{lessonNumber}} — {{title}}' },
        )}
      </h2>
      <span
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 1),
          cm.roundedFull,
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'bg-primary-fixed text-on-primary-fixed tracking-wide uppercase',
        )}
      >
        {status}
      </span>
    </div>
  )
}

export default LessonTitleBar
export { LessonTitleBar }
