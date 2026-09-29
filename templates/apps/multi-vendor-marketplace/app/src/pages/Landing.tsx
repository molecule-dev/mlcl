import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { ThemeToggle } from '../components/ThemeToggle.js'
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

/** Hero collage tiles — staggered, slightly rotated product shots per the Stitch design. */
const HERO_TILES = [
  {
    seed: 'vendry-hero-pottery',
    chip: FEATURED_VENDORS[0].name,
    className:
      'absolute top-0 right-10 w-[240px] h-[320px] rotate-2 z-20 hover:rotate-0 transition-transform duration-500',
  },
  {
    seed: 'vendry-hero-leather',
    chip: FEATURED_VENDORS[1].name,
    className:
      'absolute top-[120px] left-0 w-[220px] h-[280px] -rotate-3 z-10 hover:rotate-0 transition-transform duration-500',
  },
  {
    seed: 'vendry-hero-linen',
    chip: FEATURED_VENDORS[2].name,
    className:
      'absolute bottom-[40px] right-[100px] w-[260px] h-[260px] rotate-3 z-30 hover:rotate-0 transition-transform duration-500',
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
      {/* Top nav (public landing) — cream chrome per the Stitch design */}
      <header
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 4),
          'sticky top-0 z-30 border-b border-outline-variant bg-[var(--color-cream)]/90 backdrop-blur-md shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.maxW('full'),
            cm.mxAuto,
            'max-w-7xl',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
            <Link to="/" data-mol-id="landing-logo" className="shrink-0" aria-label={APP_NAME}>
              <BrandWordmark as="span" size="lg" />
            </Link>
            <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
              <Link
                to="/catalog"
                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
              >
                {t('landing.nav.shop', {}, { defaultValue: 'Shop' })}
              </Link>
              <Link
                to="/vendor/apply"
                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
              >
                {t(
                  'landing.nav.sell',
                  { appName: APP_NAME },
                  { defaultValue: 'Sell on {{appName}}' },
                )}
              </Link>
            </nav>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <ThemeToggle />
            {isAuthenticated ? (
              <Link
                to="/catalog"
                data-mol-id="landing-keep-shopping"
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.fontWeight('semibold'),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  'min-h-[40px] bg-primary text-on-primary shadow-sm transition-colors hover:bg-primary-dark active:scale-95',
                )}
              >
                {t('landing.nav.keepShopping', {}, { defaultValue: 'Keep shopping' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'min-h-[40px] text-on-surface-variant transition-colors hover:text-primary',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-join"
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.fontWeight('medium'),
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    'min-h-[40px] bg-primary text-on-primary shadow-sm transition-colors hover:bg-primary-dark active:scale-95',
                  )}
                >
                  {t('landing.nav.signUp', {}, { defaultValue: 'Join' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero — warm cream wash, split copy/collage per the Stitch design */}
      <section className="overflow-hidden bg-gradient-to-b from-[var(--color-cream-warm)] to-[var(--color-surface)] pt-16 pb-20 md:pt-20 md:pb-24">
        <div
          className={cm.cn(
            cm.mxAuto,
            cm.maxW('full'),
            'mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2',
          )}
        >
          <div className="max-w-2xl">
            <div
              className={cm.cn(
                cm.sp('mb', 8),
                'inline-flex items-center gap-3 rounded-full border border-outline-variant bg-surface px-4 py-1.5 shadow-sm',
              )}
            >
              <div className="flex -space-x-2">
                {HERO_TILES.map((tile) => (
                  <img
                    key={tile.seed}
                    src={`https://picsum.photos/seed/${tile.seed}-maker/48/48`}
                    alt=""
                    className="h-6 w-6 rounded-full border-2 border-surface object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {t('landing.hero.badge', {}, { defaultValue: 'Handmade, small-batch, local' })}
              </span>
            </div>
            <h1 className="[font-family:var(--font-headline)] mb-6 text-5xl leading-[1.1] font-extrabold tracking-tight text-on-surface md:text-6xl lg:text-7xl">
              {t('vendryMarketHero.title', {}, { defaultValue: 'Every maker, one marketplace.' })}
            </h1>
            <p className="mb-10 max-w-lg text-lg leading-relaxed text-on-surface-variant md:text-xl">
              {t(
                'vendryMarketHero.description',
                {},
                {
                  defaultValue:
                    'Discover thousands of independent vendors, hand-curated collections, and storefronts run by the people who pour heart into them. Shop bold, support real makers.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ gap: 'md', wrap: 'wrap' }),
                cm.sp('mb', 10),
                'flex-col items-start sm:flex-row sm:items-center',
              )}
            >
              <Link
                to="/catalog"
                data-mol-id="landing-hero-shop"
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-8 py-3.5 text-base font-medium text-on-primary shadow-md transition-all hover:bg-primary-dark hover:shadow-lg active:scale-[0.98] sm:w-auto"
              >
                {t('vendryMarketHero.primaryCta', {}, { defaultValue: 'Shop the marketplace' })}
              </Link>
              <Link
                to="/vendor/apply"
                data-mol-id="landing-hero-open-shop"
                className="inline-flex w-full items-center justify-center rounded-full border-2 border-[var(--color-teal)] bg-transparent px-8 py-3 text-base font-medium text-[var(--color-teal)] transition-colors hover:bg-[color-mix(in_oklab,var(--color-teal)_8%,transparent)] active:scale-[0.98] sm:w-auto"
              >
                {t(
                  'vendryMarketHero.secondaryCta',
                  { appName: APP_NAME },
                  { defaultValue: 'Sell on {{appName}}' },
                )}
              </Link>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--color-teal)_12%,transparent)] px-4 py-2 text-sm font-semibold text-[var(--color-teal-dark)] dark:text-[var(--color-teal)]">
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden
              >
                verified
              </span>
              {t('landing.hero.trustBadge', {}, { defaultValue: 'Trusted by 4,200 makers' })}
            </div>
          </div>

          {/* Staggered collage — rotated product shots with vendor chips */}
          <div className="relative hidden h-[600px] md:block" aria-hidden>
            {HERO_TILES.map((tile) => (
              <div
                key={tile.seed}
                className={`${tile.className} overflow-hidden rounded-2xl shadow-xl`}
              >
                <img
                  src={`https://picsum.photos/seed/${tile.seed}/520/640`}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-semibold text-[var(--color-violet-accent)] backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-violet-accent)]" />
                  {tile.chip}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main
        className={cm.cn(
          cm.maxW('full'),
          cm.mxAuto,
          cm.sp('px', 8),
          cm.sp('py', 10),
          'max-w-[1400px]',
        )}
      >
        {/* Featured Vendors */}
        <section className={cm.cn(cm.sp('mt', 4))}>
          <div
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
                  'uppercase tracking-widest text-[var(--color-teal-dark)] dark:text-[var(--color-teal)]',
                )}
              >
                {t('landing.featured.eyebrow', {}, { defaultValue: 'Spotlight shops' })}
              </p>
              <h2 className="[font-family:var(--font-headline)] text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
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
                'inline-flex items-center gap-1 text-primary hover:underline',
              )}
            >
              {t('landing.featured.cta', {}, { defaultValue: 'Browse all vendors' })}
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden>
                arrow_forward
              </span>
            </Link>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}>
            {vendors.slice(0, 3).map((vendor) => (
              <VendryVendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        </section>

        {/* Trending Products */}
        <section className={cm.cn(cm.sp('mt', 20))}>
          <div
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
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t('landing.trending.eyebrow', {}, { defaultValue: 'Trending now' })}
              </p>
              <h2 className="[font-family:var(--font-headline)] text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
                {t('landing.trending.title', {}, { defaultValue: 'What shoppers are loving' })}
              </h2>
            </div>
            <Link
              to="/catalog"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'inline-flex items-center gap-1 text-primary hover:underline',
              )}
            >
              {t('landing.trending.cta', {}, { defaultValue: 'Shop the catalog' })}
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden>
                arrow_forward
              </span>
            </Link>
          </div>
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
            'relative overflow-hidden rounded-3xl border border-outline-variant bg-[var(--color-cream-warm)] md:flex-row md:items-center md:justify-between',
          )}
        >
          <div className={cm.cn(cm.maxW('xl'), 'relative z-10')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-[var(--color-teal-dark)] dark:text-[var(--color-teal)]',
              )}
            >
              {t('landing.sellPitch.eyebrow', {}, { defaultValue: 'For makers' })}
            </p>
            <h3 className="[font-family:var(--font-headline)] mt-2 text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
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
            data-mol-id="landing-sell-cta"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 8),
              cm.sp('py', 4),
              'relative z-10 inline-flex items-center gap-2 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary-dark',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden>
              add_business
            </span>
            {t('landing.sellPitch.cta', {}, { defaultValue: 'Apply to sell' })}
          </Link>
          <div
            className={
              'absolute -right-24 top-0 h-72 w-72 rounded-full bg-[var(--color-teal)]/10 blur-3xl'
            }
            aria-hidden
          />
        </section>
      </main>

      {/* Footer — cream, 4-column grid per the Stitch design */}
      <footer className="mt-12 border-t border-outline-variant bg-[var(--color-cream-warm)]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-8 py-12 md:grid-cols-4">
          <div>
            <div className="mb-4 block">
              <BrandWordmark as="span" size="md" footer />
            </div>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 6), 'text-on-surface-variant')}>
              {t(
                'landing.footer.tagline',
                {},
                { defaultValue: 'Every maker, one marketplace. Built for creators.' },
              )}
            </p>
          </div>
          <div>
            <h4 className="[font-family:var(--font-headline)] mb-4 font-bold text-on-surface">
              {t('landing.footer.shopHeading', {}, { defaultValue: 'Shop' })}
            </h4>
            <ul className={cm.cn(cm.textSize('sm'), 'space-y-3')}>
              <li>
                <Link
                  to="/catalog"
                  className="text-on-surface-variant transition-colors hover:text-[var(--color-teal)]"
                >
                  {t('landing.nav.shop', {}, { defaultValue: 'Shop' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/catalog"
                  className="text-on-surface-variant transition-colors hover:text-[var(--color-teal)]"
                >
                  {t('landing.featured.cta', {}, { defaultValue: 'Browse all vendors' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/catalog"
                  className="text-on-surface-variant transition-colors hover:text-[var(--color-teal)]"
                >
                  {t('landing.trending.cta', {}, { defaultValue: 'Shop the catalog' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="[font-family:var(--font-headline)] mb-4 font-bold text-on-surface">
              {t('landing.footer.sellHeading', {}, { defaultValue: 'Sell' })}
            </h4>
            <ul className={cm.cn(cm.textSize('sm'), 'space-y-3')}>
              <li>
                <Link to="/vendor/apply" className="font-semibold text-primary">
                  {t(
                    'landing.nav.sell',
                    { appName: APP_NAME },
                    { defaultValue: 'Sell on {{appName}}' },
                  )}
                </Link>
              </li>
              <li>
                <Link
                  to="/vendor/apply"
                  className="text-on-surface-variant transition-colors hover:text-[var(--color-teal)]"
                >
                  {t('landing.footer.becomeVendor', {}, { defaultValue: 'Become a vendor' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="[font-family:var(--font-headline)] mb-4 font-bold text-on-surface">
              {t('landing.footer.legalHeading', {}, { defaultValue: 'Legal' })}
            </h4>
            <ul className={cm.cn(cm.textSize('sm'), 'space-y-3')}>
              <li>
                <Link
                  to="/about"
                  className="text-on-surface-variant transition-colors hover:text-[var(--color-teal)]"
                >
                  {t('nav.about', {}, { defaultValue: 'About' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-on-surface-variant transition-colors hover:text-[var(--color-teal)]"
                >
                  {t('nav.privacy', {}, { defaultValue: 'Privacy Policy' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-on-surface-variant transition-colors hover:text-[var(--color-teal)]"
                >
                  {t('nav.terms', {}, { defaultValue: 'Terms of Service' })}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-7xl border-t border-outline-variant px-8 py-6">
          <p className={cm.cn(cm.textSize('sm'), 'text-center text-on-surface-variant')}>
            {t(
              'landing.footer.copyright',
              { year: new Date().getFullYear(), name: APP_NAME },
              { defaultValue: '© {{year}} {{name}} — every maker, one marketplace.' },
            )}
            {' — Built with '}
            <a
              href="https://molecule.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              Molecule.dev
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
