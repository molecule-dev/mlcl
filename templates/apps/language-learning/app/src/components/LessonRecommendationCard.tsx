import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface LessonRecommendation {
  id: string
  title: string
  language: string
  flag: string
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  durationMin: number
  lessonsRemaining: number
  progressPercent: number
  /** Material symbol name representing the lesson topic. */
  icon: string
  /** Optional accent — `primary` (default), `secondary`, `tertiary`, `info`. */
  tone?: 'primary' | 'secondary' | 'tertiary' | 'info'
}

const TONE_CHIP: Record<NonNullable<LessonRecommendation['tone']>, string> = {
  primary: 'bg-primary-container/40 text-primary',
  secondary: 'bg-secondary-container/40 text-secondary',
  tertiary: 'bg-tertiary-container/40 text-tertiary',
  info: 'bg-info-container/40 text-info',
}

const TONE_BAR: Record<NonNullable<LessonRecommendation['tone']>, string> = {
  primary: 'from-primary to-primary-light',
  secondary: 'from-secondary to-secondary-light',
  tertiary: 'from-tertiary to-tertiary-container',
  info: 'from-info to-primary',
}

/**
 * Lesson card — left-accent colored bar, language flag emoji + level chip,
 * lesson title, progress dots ladder, gradient progress bar, single
 * "Continue" CTA. Hover-lifts on its translate.
 *
 * Translated from lms's CourseCard.tsx — image swapped for an icon chip,
 * decorative gradient progress bar kept, level chip treatment retained.
 */
export function LessonRecommendationCard({ lesson }: { lesson: LessonRecommendation }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = lesson.tone ?? 'primary'
  const dots = Array.from({ length: 5 }, (_, i) => i < Math.round(lesson.progressPercent / 20))

  return (
    <Link
      to={`/lessons/${lesson.id}`}
      className={cm.cn(
        cm.sp('p', 6),
        cm.cursorPointer,
        'block bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group border border-outline-variant/20',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 5))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <div
            className={cm.cn(
              cm.w(12),
              cm.h(12),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-2xl bg-surface-container shadow-sm group-hover:scale-110 transition-transform',
              TONE_CHIP[tone],
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
              {lesson.icon}
            </span>
          </div>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              <span className={cm.cn('text-base mr-1')} aria-hidden="true">
                {lesson.flag}
              </span>
              {lesson.language}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.textPrimary,
                'mt-0.5',
              )}
            >
              {t('lessonCard.level', { level: lesson.level }, { defaultValue: 'Level {{level}}' })}
            </p>
          </div>
        </div>
        <span
          className={cm.cn(
            'material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all',
          )}
          aria-hidden="true"
        >
          arrow_forward
        </span>
      </div>

      <h3
        className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2), 'leading-snug')}
      >
        {lesson.title}
      </h3>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('mb', 4),
          cm.textSize('xs'),
          'text-on-surface-variant',
        )}
      >
        <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
            schedule
          </span>
          {t('lessonCard.duration', { min: lesson.durationMin }, { defaultValue: '{{min}} min' })}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {t(
            'lessonCard.remaining',
            { count: lesson.lessonsRemaining },
            { defaultValue: '{{count}} lessons left' },
          )}
        </span>
      </div>

      {/* Progress dots ladder */}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mb', 3))}>
        {dots.map((filled, i) => (
          <span
            key={i}
            className={cm.cn(
              'h-2 flex-1 rounded-full transition-all',
              filled ? `bg-gradient-to-r ${TONE_BAR[tone]}` : 'bg-surface-container-high',
            )}
          />
        ))}
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest',
            cm.textPrimary,
          )}
        >
          {t(
            'lessonCard.progressPercent',
            { percent: lesson.progressPercent },
            { defaultValue: '{{percent}}% complete' },
          )}
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-on-surface-variant group-hover:text-primary transition-colors',
          )}
        >
          {t('lessonCard.continue', {}, { defaultValue: 'Continue →' })}
        </span>
      </div>
    </Link>
  )
}

export default LessonRecommendationCard
