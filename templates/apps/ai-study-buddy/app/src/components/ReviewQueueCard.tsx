import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface ReviewQueueItem {
  id: string
  title: string
  /** Material symbol icon name (e.g. "language", "science"). */
  icon: string
  /** "Due in 2 hrs" / "Due today" / "Due tomorrow". */
  dueLabel: string
  /** Card count waiting to be reviewed. */
  cardCount: number
  /** Whether this item is the most-urgent / featured one. */
  featured?: boolean
  to?: string
}

/**
 * Snap-card used in the dashboard "Review Queue" horizontal scroller. The
 * featured variant uses the gradient primary CTA; non-featured items use a
 * tonal surface variant with a soft-button CTA.
 */
export function ReviewQueueCard({ item }: { item: ReviewQueueItem }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const featured = !!item.featured

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 5),
        'min-w-[280px] snap-start rounded-[1.5rem] transition-colors',
        featured
          ? 'bg-surface-container-low hover:bg-surface-container-high'
          : 'border border-outline-variant/20 bg-surface-container-lowest hover:shadow-ambient',
      )}
      data-mol-id={`review-queue-card-${item.id}`}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
        <span
          className={cm.cn(
            cm.sp('p', 2),
            'rounded-lg material-symbols-outlined',
            featured
              ? 'bg-secondary-fixed-dim/20 text-secondary'
              : 'bg-surface-container-high text-on-surface-variant',
          )}
          aria-hidden="true"
        >
          {item.icon}
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-bold uppercase tracking-wider',
            featured ? 'text-secondary' : 'text-on-surface-variant',
          )}
        >
          {item.dueLabel}
        </span>
      </div>
      <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
        {item.title}
      </h4>
      <p className={cm.cn(cm.textSize('sm'), 'serif-text mt-1 mb-6 text-on-surface-variant')}>
        {t(
          'reviewQueueCard.cardsWaiting',
          { count: item.cardCount },
          { defaultValue: '{{count}} cards waiting' },
        )}
      </p>
      <Link
        to={item.to ?? `/study/${item.id}`}
        className={cm.cn(
          cm.sp('py', 3),
          cm.textCenter,
          cm.fontWeight('semibold'),
          'block w-full rounded-xl transition-opacity',
          featured
            ? 'gradient-primary text-on-primary hover:opacity-90'
            : 'bg-surface-container-high text-primary hover:bg-surface-container-highest',
        )}
      >
        {t('reviewQueueCard.startReview', {}, { defaultValue: 'Start Review' })}
      </Link>
    </div>
  )
}
