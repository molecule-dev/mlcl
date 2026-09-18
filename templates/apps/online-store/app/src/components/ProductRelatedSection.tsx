import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface RelatedProductCard {
  id: string | number
  name: string
  category?: string
  price?: number
  rating?: number | null
  image?: string
  images?: string[]
  thumbnails?: string[]
}

function ProductRelatedSection({
  relatedProducts = [],
}: {
  relatedProducts?: RelatedProductCard[]
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [favorited, setFavorited] = useState<Set<string | number>>(new Set())
  return (
    <section className={cm.cn('mb-24')}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 8))}>
        <h2 className={cm.cn(cm.textSize('2xl'), 'font-extrabold text-foreground')}>
          {t('productRelatedSection.title', {}, { defaultValue: 'You May Also Like' })}
        </h2>
        <Link
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textPrimary,
            cm.textSize('sm'),
            'hover:underline',
          )}
          data-mol-id="see-all-related"
          to="/search"
        >
          {t('productRelatedSection.seeAll', {}, { defaultValue: 'See All Recommendations' })}
        </Link>
      </div>
      {relatedProducts.length === 0 ? (
        <p
          className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}
          data-mol-id="related-empty"
        >
          {t(
            'productRelatedSection.empty',
            {},
            { defaultValue: 'No related products to show right now.' },
          )}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}>
          {relatedProducts.map((p) => {
            const imgSrc =
              p.image ??
              p.thumbnails?.[0] ??
              p.images?.[0] ??
              `https://picsum.photos/seed/related-${p.id}/400/400`
            const priceCents = Number(p.price ?? 0)
            return (
              <Link key={p.id} to={`/product/${p.id}`} className={cm.cn('contents')}>
                <div className={cm.cn(cm.cursorPointer, 'group')}>
                  <div
                    className={cm.cn(
                      cm.sp('mb', 4),
                      'aspect-square rounded-lg bg-surface-secondary overflow-hidden relative shadow-sm hover:shadow-md transition-shadow',
                    )}
                  >
                    <img
                      className={cm.cn(
                        cm.sp('p', 6),
                        'w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500',
                      )}
                      src={imgSrc}
                      alt={p.name}
                    />
                    <button
                      type="button"
                      aria-label={t(
                        'productRelatedSection.favorite',
                        {},
                        { defaultValue: 'Favorite' },
                      )}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.roundedFull,
                        cm.w(8),
                        cm.h(8),
                        'absolute top-4 right-4 bg-surface/80 backdrop-blur text-foreground-secondary opacity-0 group-hover:opacity-100 transition-opacity',
                      )}
                      onClick={(e) => {
                        e.preventDefault()
                        setFavorited((prev) => {
                          const next = new Set(prev)
                          if (next.has(p.id)) next.delete(p.id)
                          else next.add(p.id)
                          return next
                        })
                      }}
                    >
                      <span
                        className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                        style={{
                          fontVariationSettings: favorited.has(p.id) ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        favorite
                      </span>
                    </button>
                  </div>
                  <h3 className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 1), 'text-foreground')}>
                    {p.name}
                  </h3>
                  {p.category && (
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mb', 2),
                        'text-foreground-secondary',
                      )}
                    >
                      {p.category}
                    </p>
                  )}
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <span
                      className={cm.cn(
                        cm.textSize('lg'),
                        'font-black text-foreground tabular-nums',
                      )}
                    >
                      {t(
                        'productRelatedSection.price',
                        { price: (priceCents / 100).toFixed(2) },
                        { defaultValue: '${{price}}' },
                      )}
                    </span>
                    {p.rating != null && (
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 1 }),
                          'text-warning scale-75',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined')}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        <span
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            cm.textSize('sm'),
                            'text-foreground',
                          )}
                        >
                          {p.rating}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ProductRelatedSection
export { ProductRelatedSection }
