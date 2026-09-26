import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface VendryVendor {
  id: string
  slug: string
  name: string
  /** Short tagline / category. */
  tagline?: string
  /** Avatar / shop logo. */
  avatar_url?: string
  /** Hero / banner image. */
  banner_url?: string
  rating?: number
  product_count?: number
  total_sales?: number
  verified?: boolean
  featured?: boolean
  location?: string
}

interface VendryVendorCardProps {
  vendor: VendryVendor
  /** Optional callback when the follow toggle fires. */
  onFollow?: (vendor: VendryVendor) => void
  /** Compact variant: hides banner and stretches less. */
  compact?: boolean
}

/**
 * Vendor attribution card — banner + circular avatar overlap, verified
 * checkmark, stats row (products | rating | sales), violet vendor accent
 * border-left.
 *
 * Bespoke to the marketplace cluster — no direct sibling, but the
 * structural treatment borrows from property-listing AgentProfileHero
 * and online-store CategoryCard.
 */
export function VendryVendorCard({ vendor, onFollow, compact = false }: VendryVendorCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const seed = vendor.id || vendor.slug || vendor.name
  const banner =
    vendor.banner_url ?? `https://picsum.photos/seed/vendry-vendor-${seed}-banner/600/240`
  const avatar =
    vendor.avatar_url ?? `https://picsum.photos/seed/vendry-vendor-${seed}-avatar/120/120`
  const productCount = vendor.product_count ?? 0
  const totalSales = vendor.total_sales ?? 0

  return (
    <article
      className={cm.cn(
        'group relative overflow-hidden rounded-2xl border border-info/20 bg-surface transition-all hover:shadow-lg hover:-translate-y-0.5',
      )}
      style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--color-info)' }}
    >
      {!compact && (
        <div className="relative aspect-[5/2] overflow-hidden bg-info/10">
          <img
            src={banner}
            alt=""
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
            loading="lazy"
          />
          {/* Fade the banner's bottom edge into the card surface: the name +
              FEATURED row straddles this edge (-mt-10), so its dark text needs
              a light field here, not a tinted one (WAVE-3 contrast fix). */}
          <div
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface via-surface/80 to-transparent"
            aria-hidden
          />
        </div>
      )}
      <div className={cm.cn(cm.sp('p', 5), cm.stack(3), compact ? '' : '-mt-10 relative')}>
        <div className={cm.cn(cm.flex({ align: 'start', gap: 'md' }))}>
          <div className="relative shrink-0">
            <img
              src={avatar}
              alt={vendor.name}
              className={cm.cn('h-14 w-14 rounded-2xl object-cover ring-4 ring-surface bg-surface')}
              loading="lazy"
            />
            {vendor.verified && (
              <span
                className={
                  'material-symbols-outlined absolute -bottom-1 -right-1 text-secondary bg-surface rounded-full'
                }
                style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                aria-label={t('vendryVendorCard.verified', {}, { defaultValue: 'Verified vendor' })}
              >
                verified
              </span>
            )}
          </div>
          <div className={'min-w-0 flex-1'}>
            <Link
              to={`/vendors/${vendor.slug}`}
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-lg text-on-surface hover:text-info transition-colors block truncate',
              )}
            >
              {vendor.name}
            </Link>
            {vendor.tagline && (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant truncate')}>
                {vendor.tagline}
              </p>
            )}
            {vendor.location && (
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  cm.sp('mt', 1),
                  'text-on-surface-variant',
                )}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '14px' }}
                  aria-hidden
                >
                  location_on
                </span>
                {vendor.location}
              </p>
            )}
          </div>
          {vendor.featured && (
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.sp('px', 2),
                cm.sp('py', 1),
                cm.roundedFull,
                'uppercase tracking-widest bg-primary/10 text-orange-700 dark:text-primary',
              )}
            >
              {t('vendryVendorCard.featuredBadge', {}, { defaultValue: 'Featured' })}
            </span>
          )}
        </div>
        <dl
          className={cm.cn(
            cm.grid({ cols: 3, gap: 'sm' }),
            cm.sp('pt', 2),
            'border-t border-outline-variant',
          )}
        >
          <div>
            <dt
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant font-semibold',
              )}
            >
              {t('vendryVendorCard.productsLabel', {}, { defaultValue: 'Products' })}
            </dt>
            <dd className={cm.cn(cm.fontWeight('bold'), 'text-on-surface tabular-nums')}>
              {productCount.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant font-semibold',
              )}
            >
              {t('form.rating', {}, { defaultValue: 'Rating' })}
            </dt>
            <dd
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                'text-on-surface tabular-nums',
              )}
            >
              <span
                className="material-symbols-outlined text-warning"
                style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
                aria-hidden
              >
                star
              </span>
              {(vendor.rating ?? 0).toFixed(1)}
            </dd>
          </div>
          <div>
            <dt
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant font-semibold',
              )}
            >
              {t('vendryVendorCard.salesLabel', {}, { defaultValue: 'Sales' })}
            </dt>
            <dd className={cm.cn(cm.fontWeight('bold'), 'text-on-surface tabular-nums')}>
              {totalSales >= 1000
                ? `${Math.floor(totalSales / 1000)}k`
                : totalSales.toLocaleString()}
            </dd>
          </div>
        </dl>
        {onFollow && (
          <button
            type="button"
            onClick={() => onFollow(vendor)}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('py', 2),
              cm.sp('px', 4),
              cm.roundedFull,
              cm.textSize('sm'),
              'border border-info text-sky-700 dark:text-info hover:bg-info hover:text-on-surface transition-colors',
            )}
          >
            {t('vendryVendorCard.followCta', {}, { defaultValue: 'Follow shop' })}
          </button>
        )}
      </div>
    </article>
  )
}

export default VendryVendorCard
