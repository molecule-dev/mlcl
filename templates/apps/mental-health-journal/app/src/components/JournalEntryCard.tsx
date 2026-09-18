import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { MoodLevel } from './MoodHeroCard.js'

/**
 * Editorial journal entry card — rounded card with mood-coloured leading
 * stripe, 10px tracking-widest date eyebrow, serif-style body preview
 * clamped to 2 lines, soft tinted tag pills.
 *
 * Translated from blog/ArticleListItem.tsx (eyebrow + clamp + tag pattern)
 * and habit-tracker/HabitChecklistRow.tsx (lift on hover). Mood spec
 * from DESIGN.md — Journal Entry Card section.
 */

const MOOD_COLORS: Record<
  MoodLevel,
  { dot: string; border: string; pill: string; pillText: string }
> = {
  radiant: {
    dot: 'var(--color-mood-radiant-dot)',
    border: 'var(--color-mood-radiant-dot)',
    pill: 'var(--color-mood-radiant-pill)',
    pillText: 'var(--color-mood-radiant-text)',
  },
  good: {
    dot: 'var(--color-mood-good-dot)',
    border: 'var(--color-mood-good-dot)',
    pill: 'var(--color-mood-good-pill)',
    pillText: 'var(--color-mood-good-text)',
  },
  neutral: {
    dot: 'var(--color-mood-neutral-dot)',
    border: 'var(--color-mood-neutral-dot)',
    pill: 'var(--color-mood-neutral-pill)',
    pillText: 'var(--color-mood-neutral-text)',
  },
  low: {
    dot: 'var(--color-mood-low-dot)',
    border: 'var(--color-mood-low-dot)',
    pill: 'var(--color-mood-low-pill)',
    pillText: 'var(--color-mood-low-text)',
  },
  struggling: {
    dot: 'var(--color-mood-struggling-dot)',
    border: 'var(--color-mood-struggling-dot)',
    pill: 'var(--color-mood-struggling-pill)',
    pillText: 'var(--color-mood-struggling-text)',
  },
}

interface JournalEntryCardProps {
  id: string
  date: string
  title: string
  preview: string
  mood: MoodLevel
  tags: string[]
  encrypted?: boolean
  wordCount?: number
}

export function JournalEntryCard({
  id,
  date,
  title,
  preview,
  mood,
  tags,
  encrypted = true,
  wordCount,
}: JournalEntryCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const palette = MOOD_COLORS[mood]
  const formattedDate = (() => {
    try {
      return new Date(date).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    } catch (_error) {
      // date string is not parseable; fall back to the raw value
      return date
    }
  })()

  return (
    <Link
      to={`/journal/${id}`}
      className={cm.cn(
        cm.sp('p', 5),
        'block bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border-l-4 group',
      )}
      style={{ borderLeftColor: palette.border }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn('rounded-full')}
            aria-hidden="true"
            style={{ width: 10, height: 10, backgroundColor: palette.dot }}
          />
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {formattedDate}
          </span>
        </div>
        {encrypted ? (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-on-surface-variant',
            )}
            title={t('common.endToEndEncrypted', {}, { defaultValue: 'End-to-end encrypted' })}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              lock
            </span>
            {t('journalEntryCard.encryptedLabel', {}, { defaultValue: 'Encrypted' })}
          </span>
        ) : null}
      </div>
      <h3
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
          'text-on-surface group-hover:text-primary transition-colors',
        )}
      >
        {title}
      </h3>
      <p
        className={cm.cn(
          cm.textSize('base'),
          cm.sp('mb', 4),
          'text-on-surface-variant line-clamp-2 leading-relaxed',
        )}
        style={{ fontFamily: '"Lora", Georgia, serif' }}
      >
        {preview}
      </p>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }), 'flex-wrap')}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {tags.map((tag) => (
            <span
              key={tag}
              className={cm.cn(
                cm.sp('px', 3),
                cm.fontWeight('medium'),
                'text-[11px] py-0.5 rounded-full',
              )}
              style={{ backgroundColor: palette.pill, color: palette.pillText }}
            >
              #{tag}
            </span>
          ))}
        </div>
        {typeof wordCount === 'number' ? (
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('common.countWords', { count: wordCount }, { defaultValue: '{{count}} words' })}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
