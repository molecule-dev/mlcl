import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Today's checklist row — large rounded toggle, emoji + name + category pill,
 * streak counter on the right with flame color when active. Hover lift.
 *
 * Translated from personal-finance/ActivityRow.tsx (left-icon + title + meta
 * + right-amount layout) with toggle interaction inspired by KpiCard hover.
 */

export type HabitCategory = 'health' | 'mind' | 'creativity' | 'social' | 'learning'

interface HabitChecklistRowProps {
  id: string
  name: string
  emoji: string
  category: HabitCategory
  cadence: 'daily' | 'weekly'
  currentStreak: number
  completedToday: boolean
  onToggle: () => void
}

const CATEGORY_PALETTE: Record<HabitCategory, { bg: string; fg: string; label: string }> = {
  health: { bg: 'bg-success-container', fg: 'text-on-success-container', label: 'Health' },
  mind: { bg: 'bg-primary-container', fg: 'text-on-primary-container', label: 'Mind' },
  creativity: {
    bg: 'bg-tertiary-container',
    fg: 'text-on-tertiary-container',
    label: 'Creativity',
  },
  social: { bg: 'bg-secondary-container', fg: 'text-on-secondary-container', label: 'Social' },
  learning: { bg: 'bg-warning-container', fg: 'text-on-warning-container', label: 'Learning' },
}

export function HabitChecklistRow({
  id,
  name,
  emoji,
  category,
  cadence,
  currentStreak,
  completedToday,
  onToggle,
}: HabitChecklistRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const palette = CATEGORY_PALETTE[category]

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('p', 4),
        'bg-surface-container-lowest hover:bg-surface-container-low rounded-2xl transition-all group shadow-sm',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={completedToday}
        data-testid={`habit-toggle-${id}`}
        aria-label={t(
          'habitChecklistRow.toggleAria',
          { name },
          { defaultValue: 'Toggle {{name}}' },
        )}
        className={cm.cn(
          cm.h(10),
          cm.w(10),
          cm.shrink0,
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          'transition-all',
          completedToday
            ? 'bg-gradient-to-br from-primary to-secondary text-on-primary shadow-md scale-105'
            : 'border-2 border-outline-variant bg-surface hover:border-primary',
        )}
      >
        {completedToday ? (
          <span
            className={cm.cn('material-symbols-outlined text-base font-bold')}
            aria-hidden="true"
          >
            check
          </span>
        ) : null}
      </button>

      <Link to={`/habits/${id}`} className={cm.cn(cm.flex1, 'min-w-0')}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span aria-hidden="true" className={cm.cn(cm.textSize('xl'))}>
            {emoji}
          </span>
          <span
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('bold'),
              'truncate text-on-surface',
            )}
          >
            {name}
          </span>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.fontWeight('bold'),
              palette.bg,
              palette.fg,
              'text-[10px] py-0.5 rounded-full uppercase tracking-widest',
            )}
          >
            {t(`category.${category}`, {}, { defaultValue: palette.label })}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 1),
            cm.fontWeight('medium'),
            'text-on-surface-variant',
          )}
        >
          {t('habitChecklistRow.cadence', { cadence }, { defaultValue: '{{cadence}}' })}
        </p>
      </Link>

      <div className={cm.cn(cm.shrink0, cm.textCenter, cm.sp('px', 3))}>
        <p
          className={cm.cn('text-2xl font-extrabold tracking-tight')}
          style={
            currentStreak > 0
              ? { color: 'var(--color-flame)' }
              : { color: 'var(--color-foreground-tertiary)' }
          }
        >
          {currentStreak}
        </p>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('habitChecklistRow.dayCount', {}, { defaultValue: 'days' })}
        </p>
      </div>
    </div>
  )
}
