import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Restaurant {
  id: string
  name: string
  cuisine: string
  category: string
  description?: string
  rating: number
  review_count: number
  estimated_delivery_min: string
  delivery_fee_cents: number
  thumbnail_url?: string | null
  open?: boolean
  tags?: string[]
}

interface FeaturedRestaurantsGridProps {
  restaurants: Restaurant[]
  /** Limit cards rendered; default unlimited. */
  limit?: number
}

const CUISINE_GRADIENT: Record<string, string> = {
  Japanese: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb923c 100%)',
  Italian: 'linear-gradient(135deg, #16a34a 0%, #dc2626 50%, #f59e0b 100%)',
  Indian: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 50%, #7c2d12 100%)',
  Chinese: 'linear-gradient(135deg, #dc2626 0%, #f97316 50%, #fbbf24 100%)',
  Mexican: 'linear-gradient(135deg, #16a34a 0%, #fbbf24 50%, #dc2626 100%)',
  Thai: 'linear-gradient(135deg, #16a34a 0%, #fbbf24 50%, #f97316 100%)',
  American: 'linear-gradient(135deg, #b91c1c 0%, #f97316 50%, #fbbf24 100%)',
  default: 'linear-gradient(135deg, #e8552d 0%, #f97316 50%, #f59e0b 100%)',
}

function fmtFee(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Photo-rich restaurant grid card: hero thumbnail with cuisine fallback
 * gradient + bold name + chef-y description + rating + ETA + delivery fee
 * pill. Translated from online-store's StorefrontTrendingSection /
 * property-listing's PropertyImageGallery + ListingCard pattern.
 */
export function FeaturedRestaurantsGrid({ restaurants, limit }: FeaturedRestaurantsGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = typeof limit === 'number' ? restaurants.slice(0, limit) : restaurants

  if (visible.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t(
          'featuredRestaurantsGrid.empty',
          {},
          { defaultValue: 'No restaurants available right now.' },
        )}
      </p>
    )
  }

  return (
    <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
      {visible.map((r) => {
        const gradient = CUISINE_GRADIENT[r.cuisine] ?? CUISINE_GRADIENT.default
        const open = r.open !== false
        return (
          <Link
            key={r.id}
            to={`/restaurant/${r.id}`}
            className={
              'group block rounded-2xl overflow-hidden bg-surface-container-lowest hover:shadow-2xl hover:shadow-on-surface/5 transition-all'
            }
          >
            <div
              className={'aspect-[16/9] relative overflow-hidden flex items-center justify-center'}
              style={{ background: gradient }}
              aria-hidden="true"
            >
              {r.thumbnail_url ? (
                <img
                  src={r.thumbnail_url}
                  alt=""
                  loading="lazy"
                  className={
                    'w-full h-full object-cover group-hover:scale-105 transition-transform'
                  }
                />
              ) : (
                <span
                  className={
                    'material-symbols-outlined text-[80px] text-white/40 group-hover:scale-110 transition-transform'
                  }
                >
                  restaurant
                </span>
              )}
              {!open && (
                <div
                  className={'absolute inset-0 bg-foreground/50 flex items-center justify-center'}
                >
                  <span
                    className={
                      'px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-surface text-on-surface'
                    }
                  >
                    {t('featuredRestaurantsGrid.closed', {}, { defaultValue: 'Closed' })}
                  </span>
                </div>
              )}
              <span
                className={
                  'absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface/90 text-on-surface shadow-md'
                }
              >
                <span
                  className="material-symbols-outlined text-[14px] text-warning"
                  aria-hidden="true"
                >
                  star
                </span>
                <span className="tabular-nums">{r.rating.toFixed(1)}</span>
                <span className="text-on-surface-variant tabular-nums">({r.review_count})</span>
              </span>
              <span
                className={
                  'absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-foreground/40 backdrop-blur-md text-white'
                }
              >
                <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
                  schedule
                </span>
                {t(
                  'featuredRestaurantsGrid.eta',
                  { range: r.estimated_delivery_min },
                  { defaultValue: '{{range}} min' },
                )}
              </span>
            </div>

            <div className={'p-4'}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {r.cuisine}
              </p>
              <h3
                className={
                  'text-base font-extrabold tracking-tight text-on-surface line-clamp-1 mt-0.5 group-hover:text-primary transition-colors'
                }
              >
                {r.name}
              </h3>
              {r.description && (
                <p className={'text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed'}>
                  {r.description}
                </p>
              )}
              <div className={'flex items-center gap-2 mt-2 flex-wrap'}>
                <span
                  className={cm.cn(
                    'text-[11px] font-bold px-2 py-0.5 rounded-full',
                    r.delivery_fee_cents === 0
                      ? 'bg-success-container text-on-success-container'
                      : 'bg-surface-container text-on-surface-variant',
                  )}
                >
                  {r.delivery_fee_cents === 0
                    ? t(
                        'featuredRestaurantsGrid.freeDelivery',
                        {},
                        { defaultValue: 'Free delivery' },
                      )
                    : t(
                        'featuredRestaurantsGrid.deliveryFee',
                        { fee: fmtFee(r.delivery_fee_cents) },
                        { defaultValue: '{{fee}} delivery' },
                      )}
                </span>
                {(r.tags ?? []).slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10px] text-on-surface-variant">
                    · {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
