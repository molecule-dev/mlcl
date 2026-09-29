import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface ProductReviewDisplay {
  id: string
  title: string
  body?: string
  comment?: string
  text?: string
  rating: number
  author?: string
  customer_name?: string
  reviewer?: string
  verified?: boolean
  verified_purchase?: boolean
}

function ProductReviewsPanel({
  reviews = [],
  aggregate = { averageRating: 0, totalReviews: 0 },
}: {
  reviews?: ProductReviewDisplay[]
  aggregate?: { averageRating: number; totalReviews: number }
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('p', 8), 'bg-surface-secondary rounded-xl h-fit')} id="reviews">
      <h3
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          'text-foreground',
        )}
      >
        {t('productReviewsPanel.heading', {}, { defaultValue: 'Customer Reviews' })}
      </h3>
      {aggregate.totalReviews > 0 && (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.sp('mb', 8))}>
          <span className={cm.cn(cm.textSize('5xl'), 'font-black text-foreground')}>
            {aggregate.averageRating.toFixed(1)}
          </span>
          <div>
            <div className={cm.cn(cm.flex(), cm.sp('mb', 1), 'text-warning')}>
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            </div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-foreground-secondary',
              )}
            >
              {t(
                'productReviewsPanel.basedOnReviews',
                { count: aggregate.totalReviews.toLocaleString() },
                { defaultValue: 'Based on {{count}} reviews' },
              )}
            </p>
          </div>
        </div>
      )}
      {aggregate.totalReviews > 0 && (
        <div className={cm.cn(cm.stack(3), cm.sp('mb', 8))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 4 }),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
            )}
          >
            <span className={cm.w(2)}>5</span>
            <div className={cm.cn(cm.flex1, cm.h(2), cm.roundedFull, 'bg-border overflow-hidden')}>
              <div className={cm.cn(cm.h('full'), 'bg-green-600 w-[85%]')}></div>
            </div>
            <span className={cm.cn(cm.w(10), cm.textRight)}>
              {t(
                'productReviewsPanel.ratingPercent',
                { value: 85 },
                { defaultValue: '{{value}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 4 }),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-foreground-tertiary',
            )}
          >
            <span className={cm.w(2)}>4</span>
            <div className={cm.cn(cm.flex1, cm.h(2), cm.roundedFull, 'bg-border overflow-hidden')}>
              <div className={cm.cn(cm.h('full'), 'bg-green-600 w-[10%]')}></div>
            </div>
            <span className={cm.cn(cm.w(10), cm.textRight)}>
              {t(
                'productReviewsPanel.ratingPercent',
                { value: 10 },
                { defaultValue: '{{value}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 4 }),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-foreground-tertiary',
            )}
          >
            <span className={cm.w(2)}>3</span>
            <div className={cm.cn(cm.flex1, cm.h(2), cm.roundedFull, 'bg-border overflow-hidden')}>
              <div className={cm.cn(cm.h('full'), 'bg-green-600 w-[3%]')}></div>
            </div>
            <span className={cm.cn(cm.w(10), cm.textRight)}>
              {t('productReviewsPanel.ratingPercent', { value: 3 }, { defaultValue: '{{value}}%' })}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 4 }),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-foreground-tertiary',
            )}
          >
            <span className={cm.w(2)}>2</span>
            <div className={cm.cn(cm.flex1, cm.h(2), cm.roundedFull, 'bg-border overflow-hidden')}>
              <div className={cm.cn(cm.h('full'), 'bg-green-600 w-[1%]')}></div>
            </div>
            <span className={cm.cn(cm.w(10), cm.textRight)}>
              {t('productReviewsPanel.ratingPercent', { value: 1 }, { defaultValue: '{{value}}%' })}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 4 }),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-foreground-tertiary',
            )}
          >
            <span className={cm.w(2)}>1</span>
            <div className={cm.cn(cm.flex1, cm.h(2), cm.roundedFull, 'bg-border overflow-hidden')}>
              <div className={cm.cn(cm.h('full'), 'bg-green-600 w-[1%]')}></div>
            </div>
            <span className={cm.cn(cm.w(10), cm.textRight)}>
              {t('productReviewsPanel.ratingPercent', { value: 1 }, { defaultValue: '{{value}}%' })}
            </span>
          </div>
        </div>
      )}
      {reviews.length === 0 && (
        <p
          className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}
          data-mol-id="reviews-empty"
        >
          {t('product.noReviews', {}, { defaultValue: 'No reviews yet. Be the first to review!' })}
        </p>
      )}
      <div className={cm.stack(6)}>
        {reviews.slice(0, 3).map((review) => (
          <div key={review.id} className={cm.cn(cm.sp('pt', 6), 'border-t border-border')}>
            <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 2))}>
              <h4 className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>{review.title}</h4>
              {(review.verified || review.verified_purchase) && (
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.sp('px', 2),
                    'text-[10px] text-success bg-success-light py-0.5 rounded',
                  )}
                >
                  {t('common.verifiedPurchase', {}, { defaultValue: 'Verified Purchase' })}
                </span>
              )}
            </div>
            <div className={cm.cn(cm.flex(), cm.sp('mb', 2), 'text-warning scale-75 origin-left')}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={cm.cn('material-symbols-outlined')}
                  style={{
                    fontVariationSettings: i < (review.rating ?? 5) ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  star
                </span>
              ))}
            </div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-foreground-secondary leading-relaxed italic',
              )}
            >
              {t(
                'productReviewsPanel.reviewBody',
                { text: review.body ?? review.comment ?? review.text },
                { defaultValue: '"{{text}}"' },
              )}
            </p>
            <p className={cm.cn(cm.sp('mt', 2), 'text-[10px] text-foreground-tertiary')}>
              {t(
                'productReviewsPanel.attribution',
                {
                  author:
                    review.author ??
                    review.customer_name ??
                    review.reviewer ??
                    t('common.anonymous', {}, { defaultValue: 'Anonymous' }),
                },
                { defaultValue: '— {{author}}' },
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
export default ProductReviewsPanel
export { ProductReviewsPanel }
