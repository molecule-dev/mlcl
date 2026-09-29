import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ProductRatingBar({ rating, reviewCount }: { rating?: number; reviewCount?: number }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (rating == null) return null
  const displayRating = rating
  const displayCount = reviewCount ?? 0
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.sp('mb', 6))}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }), 'text-warning')}>
        {Array.from({ length: 5 }).map((_, i) => {
          const v = displayRating - i
          return v >= 1 ? (
            <span
              key={i}
              className={cm.cn('material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
          ) : v >= 0.5 ? (
            <span
              key={i}
              className={cm.cn('material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 0.5" }}
            >
              star_half
            </span>
          ) : (
            <span
              key={i}
              className={cm.cn('material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              star
            </span>
          )
        })}
        <span className={cm.cn(cm.fontWeight('bold'), cm.sp('ml', 1), cm.textPrimary)}>
          {displayRating.toFixed(1)}
        </span>
      </div>
      <span className={cm.cn(cm.textMuted)}>|</span>
      <a
        className={cm.cn(
          cm.fontWeight('medium'),
          cm.textSubtle,
          'hover:text-success transition-colors underline underline-offset-4',
        )}
        data-mol-id="review-scroll"
        href="#reviews"
      >
        {t(
          'common.countReviews',
          { count: displayCount.toLocaleString() },
          { defaultValue: '{{count}} reviews' },
        )}
      </a>
    </div>
  )
}

export default ProductRatingBar
export { ProductRatingBar }
