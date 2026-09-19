import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BookCover } from './BookCover.js'

/**
 * A written review — cover, star rating, review text, and the
 * finished-on date. Used by the Reviews feed and BookDetail.
 */

interface ReviewCardProps {
  bookId: string
  title: string
  author: string
  coverStyle: string | null
  rating: number | null
  review: string | null
  finishedAt: string | null
  compact?: boolean
}

export function Stars({ rating }: { rating: number | null }) {
  const cm = getClassMap()
  const rounded = rating ?? 0
  return (
    <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cm.cn('material-symbols-outlined text-base')}
          style={{
            color: n <= rounded ? 'var(--color-achievement)' : 'var(--color-outline-variant)',
            fontVariationSettings: n <= rounded ? "'FILL' 1" : undefined,
          }}
        >
          star
        </span>
      ))}
    </span>
  )
}

export function ReviewCard({
  bookId,
  title,
  author,
  coverStyle,
  rating,
  review,
  finishedAt,
  compact = false,
}: ReviewCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'md' }),
        cm.sp('p', compact ? 4 : 6),
        'bg-surface-container-lowest rounded-2xl shadow-sm hover:-translate-y-0.5 transition-transform',
      )}
    >
      <Link to={`/books/${bookId}`} className={cm.cn(cm.shrink0)} aria-label={title}>
        <BookCover
          title={title}
          author={author}
          coverStyle={coverStyle}
          size={compact ? 'sm' : 'md'}
        />
      </Link>
      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <Link to={`/books/${bookId}`}>
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'text-on-surface hover:text-primary transition-colors',
            )}
          >
            {title}
          </h3>
        </Link>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{author}</p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 2))}>
          <Stars rating={rating} />
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}>
            {rating != null ? rating.toFixed(0) : ''}
          </span>
          {finishedAt ? (
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'reviewCard.finishedOn',
                { date: new Date(finishedAt).toLocaleDateString() },
                { defaultValue: 'finished {{date}}' },
              )}
            </span>
          ) : null}
        </div>
        {review ? (
          <blockquote
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 3),
              'text-on-surface-variant border-l-2 border-primary-container pl-3',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            “{review}”
          </blockquote>
        ) : null}
      </div>
    </article>
  )
}
