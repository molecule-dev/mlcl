import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from '../components/ThemeToggle.js'
import { VendryMarketHero } from '../components/VendryMarketHero.js'
import { type VendryProduct, VendryProductCard } from '../components/VendryProductCard.js'
import { type VendryVendor, VendryVendorCard } from '../components/VendryVendorCard.js'
import {
  type ApiProduct,
  type ApiVendor,
  productFromApi,
  vendorFromApi,
} from '../utils/marketplaceApi.js'

const FEATURED_VENDORS: VendryVendor[] = [
  {
    id: 'mira-co',
    slug: 'mira-co-ceramics',
    name: 'Mira & Co. Ceramics',
    tagline: 'Hand-thrown stoneware from Lisbon',
    rating: 4.9,
    product_count: 87,
    total_sales: 1240,
    verified: true,
    featured: true,
    location: 'Lisbon, PT',
  },
  {
    id: 'oak-saint',
    slug: 'oak-and-saint',
    name: 'Oak & Saint',
    tagline: 'Slow-grown wooden home goods',
    rating: 4.8,
    product_count: 42,
    total_sales: 880,
    verified: true,
    featured: false,
    location: 'Asheville, NC',
  },
  {
    id: 'noor-textiles',
    slug: 'noor-textiles',
    name: 'Noor Textiles',
    tagline: 'Block-printed linen + organic cotton',
    rating: 5,
    product_count: 124,
    total_sales: 3450,
    verified: true,
    featured: true,
    location: 'Jaipur, IN',
  },
]

const TRENDING_PRODUCTS: VendryProduct[] = [
  {
    id: 'p-stoneware-mug',
    name: 'Sienna Stoneware Mug — set of 2',
    price_cents: 4800,
    rating: 4.9,
    review_count: 240,
    vendor_name: 'Mira & Co. Ceramics',
    vendor_slug: 'mira-co-ceramics',
    vendor_verified: true,
  },
  {
    id: 'p-walnut-board',
    name: 'Walnut Heirloom Cutting Board',
    price_cents: 9200,
    original_price_cents: 11200,
    rating: 4.8,
    review_count: 162,
    on_sale: true,
    badge: 'Sale',
    vendor_name: 'Oak & Saint',
    vendor_slug: 'oak-and-saint',
    vendor_verified: true,
  },
  {
    id: 'p-block-print-throw',
    name: 'Block-Print Cotton Throw',
    price_cents: 14000,
    rating: 5,
    review_count: 612,
    vendor_name: 'Noor Textiles',
    vendor_slug: 'noor-textiles',
    vendor_verified: true,
    badge: 'Trending',
  },
  {
    id: 'p-amber-pendant',
    name: 'Amber Glass Pendant',
    price_cents: 7800,
    rating: 4.7,
    review_count: 98,
    vendor_name: 'Mira & Co. Ceramics',
    vendor_slug: 'mira-co-ceramics',
    vendor_verified: true,
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()

  const [vendors, setVendors] = useState<VendryVendor[]>(FEATURED_VENDORS)
  const [products, setProducts] = useState<VendryProduct[]>(TRENDING_PRODUCTS)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http
        .get('/api/storefront/featured-vendors?limit=6')
        .then((res) => {
          const body = (res as { data?: { data?: ApiVendor[] } | ApiVendor[] }).data
          const arr = Array.isArray(body) ? body : (body?.data ?? [])
          return arr.map(vendorFromApi)
        })
        .catch(() => [] as VendryVendor[]),
      http
        .get('/api/storefront/trending?limit=8')
        .then((res) => {
          const body = (res as { data?: { data?: ApiProduct[] } | ApiProduct[] }).data
          const arr = Array.isArray(body) ? body : (body?.data ?? [])
          return arr.map(productFromApi)
        })
        .catch(() => [] as VendryProduct[]),
    ]).then(([nextVendors, nextProducts]) => {
      if (cancelled) return
      if (nextVendors.length) setVendors(nextVendors)
      if (nextProducts.length) setProducts(nextProducts)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface')}>
      {/* Top nav (public landing) */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 4),
          'sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant',
        )}
      >
        <Link
          to="/"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.fontWeight('bold'))}
        >
          <span
            className={
              'flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary'
            }
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden
            >
              storefront
            </span>
          </span>
          <span className={cm.cn(cm.textSize('lg'), 'tracking-tight font-extrabold')}>
            {APP_NAME}
          </span>
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), cm.textSize('sm'))}>
          <ThemeToggle />
          <Link
            to="/catalog"
            className={
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors'
            }
          >
            {t('landing.nav.shop', {}, { defaultValue: 'Shop' })}
          </Link>
          <Link
            to="/vendor/apply"
            className={
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors'
            }
          >
            {t('landing.nav.sell', { appName: APP_NAME }, { defaultValue: 'Sell on {{appName}}' })}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/catalog"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                'bg-primary text-on-primary hover:bg-primary-dark transition-colors',
              )}
            >
              {t('landing.nav.keepShopping', {}, { defaultValue: 'Keep shopping' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  'bg-primary text-on-primary hover:bg-primary-dark transition-colors',
                )}
              >
                {t('landing.nav.signUp', {}, { defaultValue: 'Join' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main
        className={cm.cn(
          cm.maxW('full'),
          cm.mxAuto,
          cm.sp('px', 8),
          cm.sp('py', 10),
          'max-w-[1400px]',
        )}
      >
        {/* Hero */}
        <VendryMarketHero />

        {/* Featured Vendors */}
        <section className={cm.cn(cm.sp('mt', 16))}>
          <header
            className={cm.cn(
              cm.flex({ justify: 'between', align: 'end', wrap: 'wrap', gap: 'md' }),
              cm.sp('mb', 6),
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-sky-700 dark:text-info',
                )}
              >
                {t('landing.featured.eyebrow', {}, { defaultValue: 'Spotlight shops' })}
              </p>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-4xl tracking-tight font-extrabold text-on-surface',
                )}
              >
                {t(
                  'landing.featured.title',
                  {},
                  { defaultValue: 'Vendors making waves this month' },
                )}
              </h2>
            </div>
            <Link
              to="/catalog"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'text-orange-700 dark:text-primary hover:underline inline-flex items-center gap-1',
              )}
            >
              {t('landing.featured.cta', {}, { defaultValue: 'Browse all vendors' })}
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden>
                arrow_forward
              </span>
            </Link>
          </header>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}>
            {vendors.slice(0, 3).map((vendor) => (
              <VendryVendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        </section>

        {/* Trending Products */}
        <section className={cm.cn(cm.sp('mt', 20))}>
          <header
            className={cm.cn(
              cm.flex({ justify: 'between', align: 'end', wrap: 'wrap', gap: 'md' }),
              cm.sp('mb', 6),
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-orange-700 dark:text-primary',
                )}
              >
                {t('landing.trending.eyebrow', {}, { defaultValue: 'Trending now' })}
              </p>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-4xl tracking-tight font-extrabold text-on-surface',
                )}
              >
                {t('landing.trending.title', {}, { defaultValue: 'What shoppers are loving' })}
              </h2>
            </div>
            <Link
              to="/catalog"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'text-orange-700 dark:text-primary hover:underline inline-flex items-center gap-1',
              )}
            >
              {t('landing.trending.cta', {}, { defaultValue: 'Shop the catalog' })}
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden>
                arrow_forward
              </span>
            </Link>
          </header>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), 'md:grid-cols-3 lg:grid-cols-4')}>
            {products.slice(0, 4).map((product) => (
              <VendryProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* Vendor pitch */}
        <section
          className={cm.cn(
            cm.sp('mt', 20),
            cm.sp('p', 10),
            cm.flex({ direction: 'col', gap: 'md', align: 'start' }),
            'rounded-3xl border border-outline-variant bg-surface-container-low overflow-hidden relative md:flex-row md:items-center md:justify-between',
          )}
        >
          <div className={cm.cn(cm.maxW('xl'), 'relative z-10')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-sky-700 dark:text-info',
              )}
            >
              {t('landing.sellPitch.eyebrow', {}, { defaultValue: 'For makers' })}
            </p>
            <h3
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'text-3xl md:text-4xl tracking-tight font-extrabold text-on-surface',
              )}
            >
              {t(
                'landing.sellPitch.title',
                {},
                { defaultValue: 'Open a shop. Keep what makes it yours.' },
              )}
            </h3>
            <p
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('lg'),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'landing.sellPitch.description',
                {},
                {
                  defaultValue:
                    'A flat 8% commission, payouts every Friday, your storefront, your story. We handle the marketplace; you stay in your craft.',
                },
              )}
            </p>
          </div>
          <Link
            to="/vendor/apply"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 8),
              cm.sp('py', 4),
              'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 relative z-10',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden>
              add_business
            </span>
            {t('landing.sellPitch.cta', {}, { defaultValue: 'Apply to sell' })}
          </Link>
          <div
            className={'absolute -right-24 top-0 w-72 h-72 rounded-full bg-info/10 blur-3xl'}
            aria-hidden
          />
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center', wrap: 'wrap', gap: 'md' }),
          cm.sp('px', 8),
          cm.sp('py', 8),
          cm.sp('mt', 12),
          'border-t border-outline-variant',
        )}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'landing.footer.copyright',
            { year: new Date().getFullYear(), name: APP_NAME },
            { defaultValue: '© {{year}} {{name}} — every maker, one marketplace.' },
          )}
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), cm.textSize('sm'))}>
          <Link
            to="/login"
            className={'text-on-surface-variant hover:text-primary transition-colors'}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link
            to="/vendor/apply"
            className={'text-on-surface-variant hover:text-primary transition-colors'}
          >
            {t('landing.footer.becomeVendor', {}, { defaultValue: 'Become a vendor' })}
          </Link>
          <Link
            to="/about"
            className={'text-on-surface-variant hover:text-primary transition-colors'}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default Landing
