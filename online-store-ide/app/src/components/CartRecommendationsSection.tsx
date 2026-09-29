import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface RecommendationProduct {
  id: string
  name: string
  price: number | string
  thumbnails?: string[]
}

function toCurrency(price: number | string | null | undefined): string {
  const cents = typeof price === 'string' ? Number.parseFloat(price) : (price ?? 0)
  if (!Number.isFinite(cents)) return '0.00'
  return (cents / 100).toFixed(2)
}

function CartRecommendationsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [products, setProducts] = useState<RecommendationProduct[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await http.get('/api/storefront/bestsellers?limit=4')
        const body = (res as { data?: unknown })?.data ?? res
        const list = Array.isArray(body)
          ? (body as RecommendationProduct[])
          : ((body as { data?: RecommendationProduct[] })?.data ?? [])
        if (!cancelled) setProducts(list.slice(0, 4))
      } catch (_error) {
        // Best-effort recommendations — network or parse failure silently falls back to empty list
        if (!cancelled) setProducts([])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  if (products.length === 0) return null

  return (
    <section className={cm.cn('mt-24')}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 8))}>
        <h2 className={cm.cn(cm.textSize('2xl'), 'font-extrabold text-foreground')}>
          {t('cartRecommendations.heading', {}, { defaultValue: 'You May Also Like' })}
        </h2>
        <Link
          className={cm.cn(
            cm.textPrimary,
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'hover:underline',
          )}
          to="/search"
        >
          {t('cartRecommendations.viewAll', {}, { defaultValue: 'View All Recommendations' })}
        </Link>
      </div>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-4')}>
        {products.map((p) => (
          <Link
            key={p.id}
            to={`/product/${p.id}`}
            className={cm.cn(
              'block bg-surface rounded-lg shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow',
            )}
          >
            <div className={cm.cn('aspect-square bg-surface-secondary overflow-hidden')}>
              {p.thumbnails && p.thumbnails[0] ? (
                <img
                  alt={p.name}
                  src={p.thumbnails[0]}
                  className={cm.cn('w-full h-full object-cover')}
                />
              ) : null}
            </div>
            <div className={cm.cn(cm.sp('p', 4), cm.stack(1))}>
              <h4
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'text-foreground line-clamp-2',
                )}
              >
                {p.name}
              </h4>
              <p className={cm.cn(cm.textPrimary, cm.fontWeight('bold'), cm.textSize('base'))}>
                ${toCurrency(p.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default CartRecommendationsSection
export { CartRecommendationsSection }
