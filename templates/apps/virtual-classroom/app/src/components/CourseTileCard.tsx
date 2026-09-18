import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Course catalog/library tile — image header, course code chip,
 * progress bar, gradient continue/enroll button.
 *
 * Translated from lms/CourseCard.tsx — same shape, recolored to
 * Aula's lavender + warm-orange accent palette.
 */
export interface CourseTileCardProps {
  id?: string
  title?: string
  code?: string
  instructor?: string
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  imageSeed?: string
  progressPercent?: number
  lessonsRemaining?: number
  enrolled?: boolean
}

export function CourseTileCard({
  id = 'demo-course-1',
  title,
  code,
  instructor,
  level = 'INTERMEDIATE',
  imageSeed = 'aula-course-1',
  progressPercent = 65,
  lessonsRemaining = 4,
  enrolled = true,
}: CourseTileCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const courseTitle =
    title ?? t('courseTileCard.title', {}, { defaultValue: 'Modern Macroeconomics' })
  const courseCode = code ?? t('courseTileCard.code', {}, { defaultValue: 'ECN 312' })
  const teacher =
    instructor ?? t('courseTileCard.instructor', {}, { defaultValue: 'Dr. Idris Halloway' })

  const levelLabel =
    level === 'BEGINNER'
      ? t('courseTileCard.levelBeginner', {}, { defaultValue: 'Beginner' })
      : level === 'ADVANCED'
        ? t('courseTileCard.levelAdvanced', {}, { defaultValue: 'Advanced' })
        : t('courseTileCard.levelIntermediate', {}, { defaultValue: 'Intermediate' })

  return (
    <article
      className={cm.cn(
        'group bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5',
      )}
      data-mol-id={`course-tile-${id}`}
    >
      <div className={cm.cn(cm.h(40), 'relative overflow-hidden')}>
        <img
          alt={t('courseTileCard.imageAlt', {}, { defaultValue: 'Course thumbnail' })}
          src={`https://picsum.photos/seed/${imageSeed}/1200/800`}
          className={cm.cn(
            cm.w('full'),
            cm.h('full'),
            'object-cover transition-transform duration-500 group-hover:scale-110',
          )}
        />
        <div
          className={cm.cn(
            'absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent',
          )}
        ></div>
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'start' }),
            'absolute top-3 left-3 right-3',
          )}
        >
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'rounded-full bg-surface/95 backdrop-blur-md text-[10px] uppercase tracking-widest text-primary',
            )}
          >
            {courseCode}
          </span>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'rounded-full bg-secondary/90 backdrop-blur-md text-[10px] uppercase tracking-widest text-on-secondary',
            )}
          >
            {levelLabel}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            'absolute bottom-3 left-3 right-3 text-white',
          )}
        >
          <div
            className={cm.cn(
              'h-7 w-7 rounded-full bg-surface/30 backdrop-blur-md flex items-center justify-center text-[10px] font-bold',
            )}
          >
            {teacher
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')}
          </div>
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'drop-shadow')}>
            {teacher}
          </span>
        </div>
      </div>
      <div className={cm.cn(cm.sp('p', 6), cm.stack(4))}>
        <h3
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'leading-tight group-hover:text-primary transition-colors',
          )}
        >
          {courseTitle}
        </h3>
        {enrolled ? (
          <>
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('xs'))}
            >
              <span className={cm.cn(cm.fontWeight('bold'), 'text-primary')}>
                {t(
                  'courseTileCard.progressComplete',
                  { percent: progressPercent },
                  { defaultValue: '{{percent}}% complete' },
                )}
              </span>
              <span className={cm.cn('text-on-surface-variant')}>
                {t(
                  'courseTileCard.lessonsRemaining',
                  { count: lessonsRemaining },
                  { defaultValue: '{{count}} lessons left' },
                )}
              </span>
            </div>
            <div
              className={cm.cn(
                cm.w('full'),
                'h-1.5 rounded-full bg-surface-container-high overflow-hidden',
              )}
            >
              <div
                className={cm.cn(
                  cm.h('full'),
                  'bg-gradient-to-r from-primary via-primary-dark to-secondary',
                )}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </>
        ) : (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-snug')}>
            {t(
              'courseTileCard.preview',
              {},
              { defaultValue: 'Preview the syllabus, browse lectures, and request enrollment.' },
            )}
          </p>
        )}
        <Link
          to={`/courses/${id}`}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.w('full'),
            'py-2.5 rounded-xl bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors',
          )}
          data-mol-id={`course-tile-cta-${id}`}
        >
          {enrolled
            ? t('courseTileCard.continue', {}, { defaultValue: 'Continue course' })
            : t('courseTileCard.enroll', {}, { defaultValue: 'View course' })}
          <span className={cm.cn('material-symbols-outlined text-[16px]')}>arrow_forward</span>
        </Link>
      </div>
    </article>
  )
}

export default CourseTileCard
