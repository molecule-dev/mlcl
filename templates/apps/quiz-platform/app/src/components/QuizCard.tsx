/**
 * Featured quiz card — gradient thumbnail strip, category chip, title,
 * meta row (questions / plays / duration), primary CTA. Used in Discover,
 * MyQuizzes, and the Landing page sample grid.
 *
 * Translated from lms/CourseCard.tsx (image strip + title + progress + CTA).
 * The treatment swaps the photo thumbnail for a brand gradient panel with
 * a glyph plus a difficulty pill, keeping the polished card silhouette.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type QuizCardProps = {
  id: string
  title: string
  category: string
  questions: number
  plays: number
  durationMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  iconGlyph?: string
  hue?: 'primary' | 'tertiary' | 'amber' | 'emerald' | 'sky' | 'rose'
  authorName?: string
  authorAvatarSeed?: string
  ctaTo?: string
}

const HUE_TO_GRADIENT: Record<NonNullable<QuizCardProps['hue']>, string> = {
  primary: 'from-primary via-primary to-tertiary',
  tertiary: 'from-tertiary via-primary to-tertiary-container',
  amber: 'from-amber-500 via-orange-500 to-rose-500',
  emerald: 'from-emerald-500 via-teal-500 to-primary',
  sky: 'from-sky-500 via-blue-500 to-primary',
  rose: 'from-rose-500 via-pink-500 to-primary',
}

const DIFFICULTY_TO_LABEL: Record<QuizCardProps['difficulty'], string> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
}

const DIFFICULTY_TO_RING: Record<QuizCardProps['difficulty'], string> = {
  easy: 'bg-emerald-500',
  medium: 'bg-amber-500',
  hard: 'bg-rose-500',
}

export function QuizCard({
  id,
  title,
  category,
  questions,
  plays,
  durationMinutes,
  difficulty,
  iconGlyph = 'quiz',
  hue = 'primary',
  authorName,
  authorAvatarSeed,
  ctaTo,
}: QuizCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const target = ctaTo ?? `/quiz/${id}`

  return (
    <article
      className={cm.cn(
        'group bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/10 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl',
      )}
    >
      <div
        className={cm.cn(
          cm.h(36),
          'relative overflow-hidden bg-gradient-to-br',
          HUE_TO_GRADIENT[hue],
        )}
      >
        <span
          className={cm.cn(
            'material-symbols-outlined absolute -right-6 -bottom-8 text-white/20 text-[160px] rotate-[-12deg] select-none',
          )}
          aria-hidden="true"
        >
          {iconGlyph}
        </span>
        <span
          className={cm.cn(
            'absolute -left-12 -top-12 w-40 h-40 rounded-full bg-surface/20 blur-3xl',
          )}
          aria-hidden="true"
        />
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            'absolute top-3 left-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-surface/25 backdrop-blur-md text-white',
          )}
        >
          <span className={cm.cn('w-1.5 h-1.5 rounded-full', DIFFICULTY_TO_RING[difficulty])} />
          {t(
            `quizCard.difficulty.${difficulty}`,
            {},
            { defaultValue: DIFFICULTY_TO_LABEL[difficulty] },
          )}
        </span>
        <span
          className={cm.cn(
            'absolute top-3 right-3 px-3 py-1 text-[10px] font-bold rounded-full bg-foreground/30 text-white backdrop-blur-md',
          )}
        >
          {t('quizCard.questionCount', { count: questions }, { defaultValue: '{{count}} Qs' })}
        </span>
      </div>
      <div className={cm.sp('p', 6)}>
        <span
          className={cm.cn(
            'inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-primary-container/40 text-primary',
            cm.sp('mb', 3),
          )}
        >
          {category}
        </span>
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            cm.sp('mb', 4),
            'leading-snug tracking-tight',
          )}
        >
          {title}
        </h3>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('mb', 5),
            'text-xs text-on-surface-variant',
          )}
        >
          <span className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
            <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
              groups
            </span>
            {t(
              'quizCard.plays',
              { count: plays.toLocaleString() },
              { defaultValue: '{{count}} plays' },
            )}
          </span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
            <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
              timer
            </span>
            {t(
              'common.minutesMin',
              { minutes: durationMinutes },
              { defaultValue: '{{minutes}} min' },
            )}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 3, wrap: 'wrap' }),
            'gap-y-2',
          )}
        >
          {authorName ? (
            <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0 max-w-full')}>
              <img
                src={`https://picsum.photos/seed/${authorAvatarSeed ?? id}/64/64`}
                alt=""
                className={cm.cn(
                  'w-7 h-7 rounded-full object-cover ring-2 ring-surface-container-lowest shrink-0',
                )}
              />
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-semibold text-on-surface-variant truncate',
                )}
              >
                {authorName}
              </span>
            </span>
          ) : (
            <span />
          )}
          <Link
            to={target}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              'shrink-0 ml-auto whitespace-nowrap px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-bold text-xs shadow-md shadow-primary/20 transition-transform group-hover:translate-x-0.5',
            )}
            data-mol-id={`btn-quiz-${id}`}
          >
            {t('common.play', {}, { defaultValue: 'Play' })}
            <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </article>
  )
}

export default QuizCard
