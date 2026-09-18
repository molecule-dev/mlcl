import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Lesson {
  id: string
  title: string
  completed: boolean
  duration: string
  type: string
}
interface ModuleProgressCardProps {
  courseId: string
  module?: { id: string; title: string; description: string; order: number; lessons: Lesson[] }
  activeLessonIdx: number
  onSelectLesson?: (lessonId: string) => void
}

function ModuleProgressCard({
  courseId,
  module,
  activeLessonIdx,
  onSelectLesson,
}: ModuleProgressCardProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const lessons = module?.lessons ?? []
  const nextLessonIdx = activeLessonIdx + 1 < lessons.length ? activeLessonIdx + 1 : activeLessonIdx
  const nextLessonId = lessons[nextLessonIdx]?.id ?? ''
  return (
    <div
      className={cm.cn(
        'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          cm.sp('p', 6),
          'border-b border-outline-variant/10 bg-surface-container-low',
        )}
      >
        <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'font-headline')}>
          {t(
            'moduleProgressCard.heading',
            {
              title:
                module?.title ??
                t(
                  'moduleProgressCard.fallbackTitle',
                  { order: 3 },
                  { defaultValue: 'Module {{order}}' },
                ),
            },
            { defaultValue: '{{title}} Progress' },
          )}
        </h3>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-foreground-secondary')}>
          {module?.description ??
            t(
              'moduleProgressCard.fallbackDescription',
              {},
              { defaultValue: 'Foundations of Neural Nets' },
            )}
        </p>
      </div>
      <div className={cm.sp('p', 6)}>
        <div className={cm.stack(1)}>
          {lessons.map((lesson, idx) => {
            const isActive = idx === activeLessonIdx
            const isLocked = !lesson.completed && idx > activeLessonIdx
            const rowContent = (
              <>
                <div
                  className={
                    isActive
                      ? cm.cn(
                          cm.w(6),
                          cm.h(6),
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.roundedFull,
                          'bg-primary text-on-primary',
                        )
                      : lesson.completed
                        ? cm.cn(
                            cm.w(6),
                            cm.h(6),
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.roundedFull,
                            'bg-success-light text-success',
                          )
                        : cm.cn(
                            cm.w(6),
                            cm.h(6),
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.roundedFull,
                            'bg-surface-secondary text-foreground-tertiary',
                          )
                  }
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[16px]')}
                    style={
                      lesson.completed && !isActive
                        ? { fontVariationSettings: "'FILL' 1" }
                        : undefined
                    }
                  >
                    {isActive ? 'play_arrow' : lesson.completed ? 'check' : 'lock'}
                  </span>
                </div>
                <span
                  className={
                    isActive
                      ? cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-primary')
                      : cm.cn(cm.textSize('sm'), 'text-foreground-secondary')
                  }
                >
                  {t(
                    'moduleProgressCard.lessonLabel',
                    { moduleOrder: module?.order ?? 3, lessonOrder: idx + 1, title: lesson.title },
                    { defaultValue: '{{moduleOrder}}.{{lessonOrder}} {{title}}' },
                  )}
                </span>
              </>
            )
            const rowClass = isActive
              ? cm.cn(
                  cm.flex({ align: 'center', gap: 3 }),
                  cm.sp('p', 3),
                  'rounded-xl bg-primary/5 border border-primary/10 group',
                )
              : cm.cn(
                  cm.flex({ align: 'center', gap: 3 }),
                  cm.sp('p', 3),
                  'rounded-xl hover:bg-surface-secondary transition-colors cursor-pointer group',
                )
            return isLocked ? (
              <div
                key={lesson.id}
                aria-disabled="true"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 3 }),
                  cm.sp('p', 3),
                  'rounded-xl opacity-50 cursor-not-allowed',
                )}
              >
                {rowContent}
              </div>
            ) : (
              <Link
                key={lesson.id}
                to={`/course/${courseId}/lesson/${lesson.id}`}
                onClick={() => onSelectLesson?.(lesson.id)}
                className={rowClass}
              >
                {rowContent}
              </Link>
            )
          })}
        </div>
        <div
          className={cm.cn(cm.sp('mt', 8), cm.sp('pt', 6), 'border-t border-outline-variant/10')}
        >
          <Link
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 4),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', justify: 'center', gap: 2 }),
              'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all group',
            )}
            data-mol-id="btn-next-lesson"
            to={`/course/${courseId}/lesson/${nextLessonId}`}
          >
            {t('moduleProgressCard.nextLesson', {}, { defaultValue: 'Next Lesson' })}
            <span
              className={cm.cn(
                'material-symbols-outlined group-hover:translate-x-1 transition-transform',
              )}
            >
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ModuleProgressCard
export { ModuleProgressCard }
