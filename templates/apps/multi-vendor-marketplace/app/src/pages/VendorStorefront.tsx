import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type VendryProduct, VendryProductCard } from '../components/VendryProductCard.js'
import type { VendryVendor } from '../components/VendryVendorCard.js'

const FOLLOW_STORAGE_KEY = 'mvm:followed-vendors'

function getFollowedVendors(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(FOLLOW_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch (_error) {
    // localStorage unavailable or corrupt — return empty list as fallback
    return []
  }
}

function setFollowedVendors(slugs: string[]): void {
  try {
    globalThis.localStorage?.setItem(FOLLOW_STORAGE_KEY, JSON.stringify(slugs))
  } catch (_error) {
    // localStorage unavailable — follow state is ephemeral, safe to skip persist
  }
}

const VENDOR_FIXTURE: VendryVendor = {
  id: 'mira-co-ceramics',
  slug: 'mira-co-ceramics',
  name: 'Mira & Co. Ceramics',
  tagline: 'Hand-thrown stoneware from a Lisbon studio',
  rating: 4.9,
  product_count: 87,
  total_sales: 1240,
  verified: true,
  featured: true,
  location: 'Lisbon, PT',
}

const VENDOR_PRODUCTS: VendryProduct[] = [
  {
    id: 'vp-1',
    name: 'Sienna Stoneware Mug — set of 2',
    price_cents: 4800,
    rating: 4.9,
    review_count: 240,
    vendor_name: VENDOR_FIXTURE.name,
    vendor_slug: VENDOR_FIXTURE.slug,
    vendor_verified: true,
  },
  {
    id: 'vp-2',
    name: 'Olive Pour-Over Set',
    price_cents: 8900,
    rating: 4.8,
    review_count: 124,
    vendor_name: VENDOR_FIXTURE.name,
    vendor_slug: VENDOR_FIXTURE.slug,
    vendor_verified: true,
  },
  {
    id: 'vp-3',
    name: 'Hand-Thrown Salt Cellar',
    price_cents: 3600,
    rating: 4.9,
    review_count: 88,
    vendor_name: VENDOR_FIXTURE.name,
    vendor_slug: VENDOR_FIXTURE.slug,
    vendor_verified: true,
  },
  {
    id: 'vp-4',
    name: 'Speckled Espresso Cup',
    price_cents: 2200,
    rating: 4.6,
    review_count: 37,
    vendor_name: VENDOR_FIXTURE.name,
    vendor_slug: VENDOR_FIXTURE.slug,
    vendor_verified: true,
  },
  {
    id: 'vp-5',
    name: 'Bone Linen Bread Bag',
    price_cents: 2400,
    rating: 4.7,
    review_count: 51,
    vendor_name: VENDOR_FIXTURE.name,
    vendor_slug: VENDOR_FIXTURE.slug,
    vendor_verified: true,
  },
  {
    id: 'vp-6',
    name: 'Indigo Pinch Bowls — set of 4',
    price_cents: 6400,
    original_price_cents: 8200,
    on_sale: true,
    badge: 'Sale',
    rating: 4.9,
    review_count: 142,
    vendor_name: VENDOR_FIXTURE.name,
    vendor_slug: VENDOR_FIXTURE.slug,
    vendor_verified: true,
  },
  {
    id: 'vp-7',
    name: 'Stoneware Vase, Tall',
    price_cents: 7200,
    rating: 4.5,
    review_count: 27,
    vendor_name: VENDOR_FIXTURE.name,
    vendor_slug: VENDOR_FIXTURE.slug,
    vendor_verified: true,
  },
  {
    id: 'vp-8',
    name: 'Carafe + 4 Tumblers',
    price_cents: 9800,
    rating: 4.8,
    review_count: 64,
    vendor_name: VENDOR_FIXTURE.name,
    vendor_slug: VENDOR_FIXTURE.slug,
    vendor_verified: true,
  },
]

export function VendorStorefront() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const http = useHttpClient()
  const [vendor, setVendor] = useState<VendryVendor>(VENDOR_FIXTURE)
  const [products, setProducts] = useState<VendryProduct[]>(VENDOR_PRODUCTS)
  const [following, setFollowing] = useState<boolean>(false)

  useEffect(() => {
    setFollowing(slug ? getFollowedVendors().includes(slug) : false)
  }, [slug])

  function toggleFollow() {
    if (!slug) return
    const current = getFollowedVendors()
    const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]
    setFollowedVendors(next)
    setFollowing(next.includes(slug))
  }

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    http
      .get<
        | { vendor?: Record<string, unknown>; products?: Record<string, unknown>[] }
        | { data?: { vendor?: Record<string, unknown>; products?: Record<string, unknown>[] } }
      >(`/api/storefront/vendors/by-slug/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (cancelled) return
        const raw = (res as { data?: unknown })?.data ?? res
        const body = (
          raw &&
          typeof raw === 'object' &&
          'data' in (raw as Record<string, unknown>) &&
          (raw as { vendor?: unknown }).vendor === undefined
            ? (
                raw as {
                  data?: { vendor?: Record<string, unknown>; products?: Record<string, unknown>[] }
                }
              ).data
            : (raw as { vendor?: Record<string, unknown>; products?: Record<string, unknown>[] })
        ) as { vendor?: Record<string, unknown>; products?: Record<string, unknown>[] } | undefined
        if (!body?.vendor) return
        const v = body.vendor as Record<string, unknown>
        setVendor({
          ...VENDOR_FIXTURE,
          id: String(v.id ?? VENDOR_FIXTURE.id),
          slug: String(v.slug ?? slug),
          name: String(v.name ?? VENDOR_FIXTURE.name),
          tagline: String(v.description ?? VENDOR_FIXTURE.tagline),
          rating: Number(v.rating ?? VENDOR_FIXTURE.rating),
          product_count: Number(v.product_count ?? VENDOR_FIXTURE.product_count),
          total_sales: Number(v.total_sales ?? VENDOR_FIXTURE.total_sales),
          verified: Boolean(v.featured ?? VENDOR_FIXTURE.verified),
          featured: Boolean(v.featured ?? VENDOR_FIXTURE.featured),
          avatar_url: typeof v.logo === 'string' ? v.logo : VENDOR_FIXTURE.avatar_url,
          banner_url: typeof v.banner_url === 'string' ? v.banner_url : VENDOR_FIXTURE.banner_url,
        })
        if (Array.isArray(body.products) && body.products.length > 0) {
          const mapped = body.products.map((p) => ({
            id: String(p.id ?? ''),
            name: String(p.name ?? 'Item'),
            price_cents: Math.round(Number(p.price ?? 0) * 100),
            image_url: Array.isArray(p.images) && p.images[0] ? String(p.images[0]) : undefined,
            rating: p.rating != null ? Number(p.rating) : undefined,
            review_count: typeof p.review_count === 'number' ? p.review_count : 0,
            vendor_id: typeof v.id === 'string' ? v.id : undefined,
            vendor_name: String(v.name ?? VENDOR_FIXTURE.name),
            vendor_slug: String(v.slug ?? slug),
            vendor_verified: Boolean(v.featured),
          }))
          setProducts(mapped)
        }
      })
      .catch(() => {
        /* keep fallback */
      })
    return () => {
      cancelled = true
    }
  }, [http, slug])

  const seed = vendor.slug
  const banner = `https://picsum.photos/seed/vendry-vendor-${seed}-banner/1600/600`
  const avatar = `https://picsum.photos/seed/vendry-vendor-${seed}-avatar/240/240`

  return (
    <div className={cm.cn(cm.maxW('full'), cm.mxAuto, 'max-w-[1400px]')}>
      {/* Hero banner */}
      <section className={'relative h-72 md:h-96 overflow-hidden rounded-b-3xl'}>
        <img src={banner} alt="" className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')} />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
          aria-hidden
        />
        <div
          className={cm.cn(cm.flex({ align: 'end' }), cm.sp('p', 8), 'absolute inset-0 text-white')}
        >
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              'uppercase tracking-widest bg-surface/20 backdrop-blur-md',
            )}
          >
            {t('vendorStorefront.eyebrow', {}, { defaultValue: 'Vendor storefront' })}
          </p>
        </div>
      </section>

      {/* Vendor header */}
      <section
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('px', 8),
          cm.sp('mt', 0),
          'relative -mt-16 z-10',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'end', gap: 'md' }))}>
          <img
            src={avatar}
            alt=""
            className={'h-32 w-32 rounded-3xl object-cover ring-4 ring-surface bg-surface'}
          />
          <div className={cm.cn(cm.stack(2), cm.sp('pb', 2))}>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-4xl tracking-tight font-extrabold text-on-surface',
                )}
              >
                {vendor.name}
              </h1>
              {vendor.verified && (
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}
                  aria-label={t(
                    'vendorStorefront.verifiedAria',
                    {},
                    { defaultValue: 'Verified vendor' },
                  )}
                >
                  verified
                </span>
              )}
            </div>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>{vendor.tagline}</p>
            <p
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden>
                location_on
              </span>
              {vendor.location}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <button
            type="button"
            onClick={toggleFollow}
            data-testid="vendor-storefront-follow"
            aria-pressed={following}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.roundedFull,
              following
                ? 'bg-success text-on-surface hover:opacity-90 transition-opacity'
                : 'bg-info text-on-surface hover:opacity-90 transition-opacity',
            )}
          >
            <span className="material-symbols-outlined align-middle me-1" aria-hidden>
              favorite
            </span>
            {following
              ? t('common.following', {}, { defaultValue: 'Following' })
              : t('vendorStorefront.followCta', {}, { defaultValue: 'Follow shop' })}
          </button>
          <a
            href={`mailto:hello@${vendor.slug}.test?subject=${encodeURIComponent(`Hello from a ${APP_NAME} shopper`)}`}
            data-testid="vendor-storefront-message"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.roundedFull,
              'border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className="material-symbols-outlined align-middle me-1" aria-hidden>
              forum
            </span>
            {t('vendorStorefront.messageCta', {}, { defaultValue: 'Message vendor' })}
          </a>
        </div>
      </section>

      {/* Stats row */}
      <section
        className={cm.cn(
          cm.grid({ cols: 2, gap: 'sm' }),
          cm.sp('px', 8),
          cm.sp('py', 6),
          'md:grid-cols-4',
        )}
      >
        {[
          { label: t('form.rating', {}, { defaultValue: 'Rating' }), value: `${vendor.rating}★` },
          {
            label: t('vendorStorefront.statProducts', {}, { defaultValue: 'Products' }),
            value: `${vendor.product_count}`,
          },
          {
            label: t('vendorStorefront.statSales', {}, { defaultValue: 'Sales' }),
            value: `${vendor.total_sales?.toLocaleString()}`,
          },
          {
            label: t('vendorStorefront.statReplies', {}, { defaultValue: 'Avg reply' }),
            value: '< 4h',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl bg-surface-container-low border border-outline-variant',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant font-semibold',
              )}
            >
              {stat.label}
            </p>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-2xl text-on-surface tabular-nums font-extrabold',
              )}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      {/* About */}
      <section className={cm.cn(cm.sp('px', 8), cm.stack(2))}>
        <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
          {t('vendorStorefront.aboutTitle', {}, { defaultValue: 'About the maker' })}
        </h2>
        <p
          className={cm.cn(
            cm.maxW('2xl'),
            cm.textSize('base'),
            'text-on-surface-variant leading-relaxed',
          )}
        >
          {t(
            'vendorStorefront.aboutBody',
            {},
            {
              defaultValue:
                'Mira works alone in a tiny ceramics studio above a bakery in Lisbon. Every piece is wheel-thrown, glazed, and signed by hand. Small batches, no two alike, all fired in the same kiln since 2018.',
            },
          )}
        </p>
      </section>

      {/* Products */}
      <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(4))}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }))}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-2xl tracking-tight font-extrabold text-on-surface',
            )}
          >
            {t('vendorStorefront.productsTitle', {}, { defaultValue: 'In the shop' })}
          </h2>
          <Link
            to="/catalog"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-orange-700 dark:text-primary hover:underline',
            )}
          >
            {t('vendorStorefront.viewCatalog', {}, { defaultValue: 'Back to catalog →' })}
          </Link>
        </div>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), 'md:grid-cols-3 lg:grid-cols-4')}>
          {products.map((product) => (
            <VendryProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default VendorStorefront
