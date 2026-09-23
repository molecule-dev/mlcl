import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Review card — compact reviewer chip (avatar + name + relative date),
 * inline 5-star rating, body text with 1.6 line-height. Used on
 * TutorProfile and TutorDashboard.
 *
 * Translated from personal-finance ActivityRow + crm ActivityFeed.
 */

export type ReviewCardProps = {
  id: string
  reviewerName: string
  reviewerAvatarSeed?: string
  rating: number
  body: string
  postedAgo: string
  subject?: string
}

export function ReviewCard({
  id,
  reviewerName,
  reviewerAvatarSeed,
  rating,
  body,
  postedAgo,
  subject,
}: ReviewCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const seed = reviewerAvatarSeed ?? id
  const stars = Math.max(0, Math.min(5, Math.round(rating)))

  return (
    <article
      className={cm.cn(
        cm.sp('p', 5),
        'bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm transition-all hover:shadow-md',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          // Stars are one rigid run; in narrow cards (e.g. 3-up testimonial
          // grids at tablet) let them wrap below the name instead of pushing
          // the card past the viewport.
          'flex-wrap',
        )}
      >
        <div
          className={cm.cn(
            'rounded-full overflow-hidden ring-2 ring-surface-container-lowest shadow-sm shrink-0',
          )}
          style={{ width: 36, height: 36 }}
        >
          <img
            src={`https://i.pravatar.cc/72?u=${encodeURIComponent(seed)}`}
            alt=""
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          />
        </div>
        <div className={cm.cn(cm.flex1, 'min-w-0')}>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'truncate')}>
            {reviewerName}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {subject
              ? t(
                  'reviewCard.headlineWithSubject',
                  { subject, ago: postedAgo },
                  { defaultValue: '{{subject}} • {{ago}}' },
                )
              : t('reviewCard.headline', { ago: postedAgo }, { defaultValue: '{{ago}}' })}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-base')}
              style={{
                color: i < stars ? 'var(--chalk-top-rated)' : 'var(--mol-color-border)',
                fontVariationSettings: i < stars ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              star
            </span>
          ))}
        </div>
      </header>
      <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-on-surface leading-[1.65]')}>
        {body}
      </p>
    </article>
  )
}

export default ReviewCard
