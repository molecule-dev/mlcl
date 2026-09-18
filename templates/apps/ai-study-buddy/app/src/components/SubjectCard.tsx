import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface Subject {
  id: string
  title: string
  subtitle: string
  /** Material symbol icon name (e.g. "biotech", "functions"). */
  icon: string
  /** 0-100. */
  masteryPct: number
  difficulty: 'easy' | 'medium' | 'hard'
  /** Total cards / topics in this subject. */
  cardCount?: number
  /** Mastery level for the difficulty pill color (defaults to difficulty). */
  to?: string
}

const DIFFICULTY_TONES: Record<Subject['difficulty'], { bg: string; fg: string; label: string }> = {
  easy: { bg: 'bg-success-light/70', fg: 'text-success', label: 'Easy' },
  medium: { bg: 'bg-info-container/40', fg: 'text-info', label: 'Medium' },
  hard: { bg: 'bg-error-container', fg: 'text-on-error-container', label: 'Hard' },
}

/**
 * Subject / topic card with icon chip, title, subtitle, difficulty pill and
 * mastery progress bar with gradient fill. Designed for the
 * "Recommended Study" grid on the dashboard and the Courses page.
 */
export function SubjectCard({ subject }: { subject: Subject }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = DIFFICULTY_TONES[subject.difficulty]
  const pct = Math.max(0, Math.min(100, subject.masteryPct))

  const inner = (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ direction: 'col', justify: 'between' }),
        'group relative h-full overflow-hidden rounded-[1.5rem] border border-outline-variant/20 bg-surface-container-lowest transition-shadow hover:shadow-ambient',
      )}
      data-mol-id={`subject-card-${subject.id}`}
    >
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 6))}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-2xl bg-surface-container-low shadow-sm',
          )}
        >
          <span className={'material-symbols-outlined text-primary text-2xl'} aria-hidden="true">
            {subject.icon}
          </span>
        </div>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.roundedFull,
            'uppercase tracking-wider',
            tone.bg,
            tone.fg,
          )}
        >
          {t(`subjectCard.difficulty.${subject.difficulty}`, {}, { defaultValue: tone.label })}
        </span>
      </div>

      <div className={cm.sp('mb', 4)}>
        <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
          {subject.title}
        </h4>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            'serif-text mt-1 text-on-surface-variant line-clamp-2',
          )}
        >
          {subject.subtitle}
        </p>
      </div>

      <div>
        <div
          className={cm.cn(
            cm.flex({ justify: 'between' }),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'font-medium',
          )}
        >
          <span className="text-on-surface-variant">
            {t('subjectCard.mastery', {}, { defaultValue: 'Mastery' })}
          </span>
          <span className="font-bold text-primary tabular-nums">{pct}%</span>
        </div>
        <div className={'h-2 w-full overflow-hidden rounded-full bg-surface-container-highest'}>
          <div
            className={
              'h-full rounded-full bg-gradient-to-r from-primary to-inverse-primary transition-all duration-700 ease-out'
            }
            style={{ width: `${pct}%` }}
          />
        </div>
        {subject.cardCount != null ? (
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant/70')}>
            {t(
              'subjectCard.cardCount',
              { count: subject.cardCount },
              { defaultValue: '{{count}} cards' },
            )}
          </p>
        ) : null}
      </div>
    </article>
  )

  return subject.to ? <Link to={subject.to}>{inner}</Link> : inner
}
