import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'

interface NavProps {
  courseId?: string
  courseName?: string
  lessonOrder?: number
  totalLessons?: number
  prevLessonId?: string
  nextLessonId?: string
  onPrevious?: () => void
  onNext?: () => void
}

function LessonTopNavBar({
  courseId,
  courseName,
  lessonOrder,
  totalLessons,
  prevLessonId,
  nextLessonId,
  onPrevious,
  onNext,
}: NavProps) {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const progressPct =
    lessonOrder && totalLessons ? Math.round((lessonOrder / totalLessons) * 100) : 37.5
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.w('full'),
        cm.h(16),
        'sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 6 })}>
        <button
          onClick={() => navigate(courseId ? `/course/${courseId}` : '/dashboard')}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            'text-foreground-secondary hover:text-primary transition-all group',
          )}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}>arrow_back</span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'Inter')}>
            {t('common.back', {}, { defaultValue: 'Back' })}
          </span>
        </button>
        <div className={cm.cn(cm.h(8), 'w-px', 'bg-border')}></div>
        <nav className={cm.flex({ align: 'center', gap: 2 })}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-foreground-secondary',
            )}
          >
            {courseName ?? t('nav.course', {}, { defaultValue: 'Course' })}
          </span>
          <span className={cm.cn('text-foreground-tertiary')}>/</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-violet-600 dark:text-violet-400',
            )}
          >
            {t('lessonTopNavBar.lessons', {}, { defaultValue: 'Lessons' })}
          </span>
        </nav>
      </div>
      <div className={cm.flex({ align: 'center', gap: 8 })}>
        <div className={cm.flex({ direction: 'col', align: 'end', gap: 1 })}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-wider text-foreground-tertiary',
            )}
          >
            {lessonOrder && totalLessons
              ? t(
                  'lessonTopNavBar.lessonProgress',
                  { order: lessonOrder, total: totalLessons },
                  { defaultValue: 'Lesson {{order}} of {{total}}' },
                )
              : t(
                  'lessonTopNavBar.lessonProgress',
                  { order: 3, total: 8 },
                  { defaultValue: 'Lesson {{order}} of {{total}}' },
                )}
          </span>
          <div
            className={cm.cn(
              cm.w(32),
              cm.roundedFull,
              cm.h(1.5),
              'bg-surface-container-highest overflow-hidden',
            )}
          >
            <div
              className={cm.cn(cm.h('full'), 'bg-primary')}
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
        </div>
        <div className={cm.flex({ align: 'center', gap: 2 })}>
          <button
            onClick={() =>
              onPrevious
                ? onPrevious()
                : prevLessonId && courseId && navigate(`/course/${courseId}/lesson/${prevLessonId}`)
            }
            disabled={!prevLessonId}
            aria-label={t(
              'lessonTopNavBar.previousLesson',
              {},
              { defaultValue: 'Previous lesson' },
            )}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'hover:bg-surface-secondary transition-colors text-foreground-secondary disabled:opacity-30',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>chevron_left</span>
          </button>
          <button
            onClick={() =>
              onNext
                ? onNext()
                : nextLessonId && courseId && navigate(`/course/${courseId}/lesson/${nextLessonId}`)
            }
            disabled={!nextLessonId}
            aria-label={t('lessonTopNavBar.nextLesson', {}, { defaultValue: 'Next lesson' })}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'hover:bg-surface-secondary transition-colors text-foreground-secondary disabled:opacity-30',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>chevron_right</span>
          </button>
        </div>
        <UserMenu />
      </div>
    </header>
  )
}

export default LessonTopNavBar
export { LessonTopNavBar }
