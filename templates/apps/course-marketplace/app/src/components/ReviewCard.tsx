/**
 * Review card — avatar + name + date + numeric rating + star row + body.
 * Editorial divider beneath each row so a vertical stack of reviews
 * reads as one continuous list.
 *
 * Translated from blog/personal-finance editorial activity-row treatment
 * into Lectura's purple/gold rating palette per DESIGN.md.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type ReviewCardProps = {
  authorName: string
  authorRole?: string
  rating: number
  postedAt: string
  body: string
  avatarSeed?: string
}

function StarRow({ rating }: { rating: number }) {
  const cm = getClassMap()
  const stars: string[] = []
  for (let i = 0; i < 5; i++) {
    if (i < Math.floor(rating)) stars.push('star')
    else if (i === Math.floor(rating) && rating - Math.floor(rating) >= 0.5) stars.push('star_half')
    else stars.push('star_outline')
  }
  return (
    <div
      className={cm.cn('flex items-center text-[var(--market-star)]')}
      aria-label={`${rating} of 5 stars`}
    >
      {stars.map((name, i) => (
        <span key={i} className={cm.cn('material-symbols-outlined filled-icon text-[14px]')}>
          {name}
        </span>
      ))}
    </div>
  )
}

export function ReviewCard(props: ReviewCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const seed = props.avatarSeed ?? props.authorName.toLowerCase().replace(/\s+/g, '-')
  return (
    <article
      className={cm.cn(
        cm.sp('py', 6),
        'border-b border-outline-variant/20 last:border-0 flex gap-4',
      )}
      data-mol-id="review-card"
    >
      <img
        src={`https://i.pravatar.cc/80?u=${seed}`}
        alt={props.authorName}
        className={cm.cn('w-10 h-10 rounded-full object-cover flex-shrink-0')}
      />
      <div className={cm.cn('flex-1 min-w-0')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 1))}>
          <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}>
            {props.authorName}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {props.postedAt}
          </span>
        </div>
        {props.authorRole && (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 2),
              'text-on-surface-variant uppercase tracking-widest font-medium',
            )}
          >
            {props.authorRole}
          </p>
        )}
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 2))}>
          <StarRow rating={props.rating} />
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {props.rating.toFixed(1)}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('reviewCard.outOf5', {}, { defaultValue: '/ 5' })}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}>{props.body}</p>
      </div>
    </article>
  )
}

export default ReviewCard
