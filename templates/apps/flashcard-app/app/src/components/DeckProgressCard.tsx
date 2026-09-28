/**
 * Deck row — colored category dot, name + description, three pill counts
 * (due / new / cards), segmented progress bar (mastered/learning/new), CTA.
 *
 * Translated from lms's CourseCard.tsx + personal-finance's ActivityRow patterns.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface DeckProgressCardProps {
  id: string
  name: string
  description: string
  category: string
  cardCount: number
  dueCount: number
  newCount: number
  retentionRate: number
}

const CATEGORY_HEX: Record<string, string> = {
  language: 'var(--color-category-language)',
  science: 'var(--color-category-science)',
  humanities: 'var(--color-category-humanities)',
  professional: 'var(--color-category-professional)',
  personal: 'var(--color-category-personal)',
}

export function DeckProgressCard({
  id,
  name,
  description,
  category,
  cardCount,
  dueCount,
  newCount,
  retentionRate,
}: DeckProgressCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const masteredCount = Math.max(0, cardCount - dueCount - newCount)
  const masteredPct = cardCount > 0 ? Math.round((masteredCount / cardCount) * 100) : 0
  const duePct = cardCount > 0 ? Math.round((dueCount / cardCount) * 100) : 0
  const newPct = cardCount > 0 ? Math.round((newCount / cardCount) * 100) : 0
  const accent = CATEGORY_HEX[category] ?? CATEGORY_HEX.language!
  const hasDue = dueCount > 0

  return (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        cm.accentCard({ tone: 'custom' }),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm hover:shadow-md transition-shadow',
      )}
      style={{ ['--mol-accent' as string]: accent }}
      data-mol-id={`deck-${id}`}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
          cm.sp('mb', 4),
        )}
      >
        <div className={cm.cn('min-w-0 flex-1')}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 2))}>
            <span
              aria-hidden="true"
              className={cm.cn('h-2 w-2 rounded-full shrink-0')}
              style={{ backgroundColor: accent }}
            />
            <span className={cm.accentCardLabel({ tone: 'custom' })}>
              {t(`deckProgressCard.category.${category}`, {}, { defaultValue: category })}
            </span>
          </div>
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-lg leading-tight font-extrabold truncate',
            )}
          >
            {name}
          </h3>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'text-on-surface-variant line-clamp-1',
            )}
          >
            {description}
          </p>
        </div>
        <Link
          to={hasDue ? `/study/${id}` : `/decks/${id}`}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            'rounded-xl text-xs whitespace-nowrap shrink-0 transition-colors',
            hasDue
              ? 'bg-primary text-on-primary hover:bg-primary-fixed-dim'
              : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
          )}
          data-mol-id={`deck-cta-${id}`}
        >
          {hasDue
            ? t(
                'deckProgressCard.studyCta',
                { count: dueCount },
                { defaultValue: 'Study {{count}}' },
              )
            : t('common.open', {}, { defaultValue: 'Open' })}
        </Link>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3), 'flex-wrap')}>
        <Pill
          labelKey="deckProgressCard.due"
          labelDefault="Due"
          value={dueCount}
          tone={dueCount > 0 ? 'warning' : 'muted'}
        />
        <Pill labelKey="deckProgressCard.new" labelDefault="New" value={newCount} tone="info" />
        <Pill
          labelKey="deckProgressCard.retention"
          labelDefault="Retention"
          value={`${Math.round(retentionRate * 100)}%`}
          tone="success"
        />
        <span className={cm.cn('ml-auto text-xs text-on-surface-variant')}>
          {t(
            'deckProgressCard.cardCount',
            { count: cardCount },
            { defaultValue: '{{count}} cards' },
          )}
        </span>
      </div>

      <div
        className={cm.cn(
          'relative flex h-2 w-full overflow-hidden rounded-full bg-surface-container-highest',
        )}
      >
        {masteredPct > 0 && (
          <div
            className={cm.cn('h-full bg-success transition-all duration-500')}
            style={{ width: `${masteredPct}%` }}
            title={t(
              'deckProgressCard.masteredTooltip',
              { count: masteredCount },
              { defaultValue: '{{count}} mastered' },
            )}
          />
        )}
        {duePct > 0 && (
          <div
            className={cm.cn('h-full bg-warning transition-all duration-500')}
            style={{ width: `${duePct}%` }}
          />
        )}
        {newPct > 0 && (
          <div
            className={cm.cn('h-full bg-info transition-all duration-500')}
            style={{ width: `${newPct}%` }}
          />
        )}
      </div>
    </article>
  )
}

function Pill({
  labelKey,
  labelDefault,
  value,
  tone,
}: {
  labelKey: string
  labelDefault: string
  value: string | number
  tone: 'warning' | 'info' | 'success' | 'muted'
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const toneClass: Record<typeof tone, string> = {
    warning: 'bg-warning-container/50 text-on-warning-container',
    info: 'bg-info-container/50 text-on-info-container',
    success: 'bg-success-container/50 text-on-success-container',
    muted: 'bg-surface-container text-on-surface-variant',
  }
  return (
    <span
      className={cm.cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide',
        toneClass[tone],
      )}
    >
      <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">
        {t(labelKey, {}, { defaultValue: labelDefault })}
      </span>
      <span>{value}</span>
    </span>
  )
}
