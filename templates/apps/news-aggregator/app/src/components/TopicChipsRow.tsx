import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Topic {
  slug: string
  label: string
  /** Optional Material Symbols glyph name. */
  icon?: string
  /** Optional accent tint for the topic chip. */
  tint?: 'tech' | 'business' | 'science' | 'sports' | 'entertainment' | 'world' | 'culture'
  /** Story count rendered as a small badge inside the chip. */
  storyCount?: number
}

interface TopicChipsRowProps {
  topics: ReadonlyArray<Topic>
  /** Slug of the currently-active topic (renders the active treatment). */
  activeSlug?: string | null
  /** Optional eyebrow heading rendered above the row. */
  heading?: string
}

const TINT_BG: Record<NonNullable<Topic['tint']>, string> = {
  tech: 'bg-blue-500/15 text-blue-800 dark:text-blue-600 hover:bg-blue-500/25',
  business: 'bg-emerald-500/15 text-emerald-800 dark:text-success hover:bg-emerald-500/25',
  science: 'bg-violet-500/15 text-violet-700 hover:bg-violet-500/25',
  sports: 'bg-amber-500/15 text-amber-800 dark:text-warning hover:bg-amber-500/25',
  entertainment: 'bg-pink-500/15 text-pink-800 dark:text-pink-600 hover:bg-pink-500/25',
  world: 'bg-primary/15 text-primary-dark dark:text-primary hover:bg-primary/25',
  culture: 'bg-secondary/15 text-orange-800 dark:text-secondary hover:bg-secondary/25',
}

/**
 * Horizontal-scrolling pill row of news topics. Active pill renders with the
 * brand gradient; idle pills carry a tint-coded background per topic family.
 *
 * Translated from blog's TopicsRow.tsx editorial chip pattern + DESIGN.md
 * §"Category Pill" sizing rules.
 */
export function TopicChipsRow({ topics, activeSlug, heading }: TopicChipsRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (topics.length === 0) return null

  return (
    <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
      {heading && (
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {heading}
        </h2>
      )}
      <nav
        aria-label={t('topicChipsRow.ariaLabel', {}, { defaultValue: 'Browse topics' })}
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), '-mx-1')}
      >
        {topics.map((topic) => {
          const isActive = activeSlug === topic.slug
          const tintClasses = topic.tint
            ? TINT_BG[topic.tint]
            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
          return (
            <Link
              key={topic.slug}
              to={`/topics/${topic.slug}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'transition-all',
                isActive
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20'
                  : tintClasses,
              )}
            >
              {topic.icon && (
                <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                  {topic.icon}
                </span>
              )}
              <span>{topic.label}</span>
              {topic.storyCount !== undefined && (
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.roundedFull,
                    'text-[10px] font-bold tabular-nums text-on-surface',
                    isActive ? 'bg-surface/25' : 'bg-on-surface/10',
                  )}
                >
                  {topic.storyCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </section>
  )
}

export default TopicChipsRow
