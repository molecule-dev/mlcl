import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type VendryProduct, VendryProductCard } from '../components/VendryProductCard.js'
import { type VendryVendor, VendryVendorCard } from '../components/VendryVendorCard.js'
import {
  type ApiProduct,
  type ApiVendor,
  productFromApi,
  vendorFromApi,
} from '../utils/marketplaceApi.js'

const CATEGORIES = [
  { slug: 'home', label: 'Home & Living', icon: 'chair' },
  { slug: 'apparel', label: 'Apparel', icon: 'styler' },
  { slug: 'jewelry', label: 'Jewelry', icon: 'diamond' },
  { slug: 'art', label: 'Art & Prints', icon: 'palette' },
  { slug: 'paper', label: 'Paper Goods', icon: 'menu_book' },
  { slug: 'wellness', label: 'Wellness', icon: 'spa' },
  { slug: 'kitchen', label: 'Kitchen', icon: 'restaurant' },
  { slug: 'kids', label: 'Kids', icon: 'child_care' },
] as const

const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to high' },
  { value: 'price-desc', label: 'Price: High to low' },
  { value: 'rating', label: 'Top rated' },
] as const

const SAMPLE_PRODUCTS: VendryProduct[] = [
  {
    id: 'c-1',
    name: 'Sienna Stoneware Mug — set of 2',
    price_cents: 4800,
    rating: 4.9,
    review_count: 240,
    vendor_name: 'Mira & Co. Ceramics',
    vendor_slug: 'mira-co-ceramics',
    vendor_verified: true,
  },
  {
    id: 'c-2',
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
    id: 'c-3',
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
    id: 'c-4',
    name: 'Amber Glass Pendant Light',
    price_cents: 7800,
    rating: 4.7,
    review_count: 98,
    vendor_name: 'Mira & Co. Ceramics',
    vendor_slug: 'mira-co-ceramics',
    vendor_verified: true,
  },
  {
    id: 'c-5',
    name: 'Hand-Sewn Linen Apron',
    price_cents: 5400,
    rating: 4.6,
    review_count: 73,
    vendor_name: 'Atelier Mireille',
    vendor_slug: 'atelier-mireille',
    vendor_verified: false,
  },
  {
    id: 'c-6',
    name: 'Brass Stem Vase Trio',
    price_cents: 8400,
    rating: 4.9,
    review_count: 184,
    vendor_name: 'Foundry & Fern',
    vendor_slug: 'foundry-and-fern',
    vendor_verified: true,
  },
  {
    id: 'c-7',
    name: 'Hammered Copper Watering Can',
    price_cents: 6900,
    rating: 4.5,
    review_count: 51,
    vendor_name: 'Foundry & Fern',
    vendor_slug: 'foundry-and-fern',
    vendor_verified: true,
  },
  {
    id: 'c-8',
    name: 'Indigo-Dyed Tea Towel',
    price_cents: 2800,
    original_price_cents: 3600,
    on_sale: true,
    badge: 'Sale',
    rating: 4.7,
    review_count: 92,
    vendor_name: 'Noor Textiles',
    vendor_slug: 'noor-textiles',
    vendor_verified: true,
  },
]

const SAMPLE_VENDORS: VendryVendor[] = [
  {
    id: 'v-1',
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
    id: 'v-2',
    slug: 'oak-and-saint',
    name: 'Oak & Saint',
    tagline: 'Slow-grown wooden home goods',
    rating: 4.8,
    product_count: 42,
    total_sales: 880,
    verified: true,
    location: 'Asheville, NC',
  },
  {
    id: 'v-3',
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

export function Catalog() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeCategory = searchParams.get('category') ?? 'all'
  const activeSort = searchParams.get('sort') ?? 'trending'
  const queryString = searchParams.get('q') ?? ''

  const [products, setProducts] = useState<VendryProduct[]>(SAMPLE_PRODUCTS)
  const [vendors, setVendors] = useState<VendryVendor[]>(SAMPLE_VENDORS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http
        .get(
          `/api/products?limit=48${activeCategory !== 'all' ? `&category=${activeCategory}` : ''}`,
        )
        .then((res) => {
          const body = (res as { data?: { data?: ApiProduct[] } | ApiProduct[] }).data
          const arr = Array.isArray(body) ? body : (body?.data ?? [])
          return arr.map(productFromApi)
        })
        .catch(() => SAMPLE_PRODUCTS),
      http
        .get('/api/storefront/featured-vendors?limit=6')
        .then((res) => {
          const body = (res as { data?: { data?: ApiVendor[] } | ApiVendor[] }).data
          const arr = Array.isArray(body) ? body : (body?.data ?? [])
          return arr.map(vendorFromApi)
        })
        .catch(() => SAMPLE_VENDORS),
    ]).then(([list, featured]) => {
      if (cancelled) return
      if (list.length) {
        const sorted = [...list]
        if (activeSort === 'price-asc')
          sorted.sort((a, b) => (a.price_cents ?? 0) - (b.price_cents ?? 0))
        else if (activeSort === 'price-desc')
          sorted.sort((a, b) => (b.price_cents ?? 0) - (a.price_cents ?? 0))
        else if (activeSort === 'rating') sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        if (queryString) {
          const q = queryString.toLowerCase()
          setProducts(sorted.filter((p) => p.name.toLowerCase().includes(q)))
        } else {
          setProducts(sorted)
        }
      } else {
        setProducts([])
      }
      if (featured.length) setVendors(featured)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http, activeCategory, activeSort, queryString])

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value && value !== 'all' && value !== 'trending') next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1400px]')}>
      <div className={cm.cn(cm.stack(4), cm.sp('mb', 8))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-orange-700 dark:text-primary',
          )}
        >
          {t('catalog.eyebrow', {}, { defaultValue: 'Marketplace catalog' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl md:text-5xl tracking-tight font-extrabold text-on-surface',
          )}
        >
          {t(
            'catalog.title',
            { appName: APP_NAME },
            { defaultValue: 'Browse every shop on {{appName}}' },
          )}
        </h1>
        <p className={cm.cn(cm.maxW('2xl'), 'text-on-surface-variant text-lg leading-relaxed')}>
          {t(
            'catalog.subtitle',
            {},
            {
              defaultValue:
                'Filter by category, vendor, or price. Every product carries the maker who made it.',
            },
          )}
        </p>
        {/* Search bar */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.maxW('xl'),
            'rounded-full border border-outline-variant bg-surface focus-within:border-primary transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>
            search
          </span>
          <input
            type="search"
            value={queryString}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder={t(
              'catalog.searchPlaceholder',
              {},
              { defaultValue: 'Search products, vendors, or tags…' },
            )}
            className={cm.cn(
              cm.w('full'),
              'bg-transparent border-none focus:outline-none text-on-surface placeholder:text-on-surface-variant',
            )}
            aria-label={t('catalog.searchAria', {}, { defaultValue: 'Search the catalog' })}
          />
        </div>
      </div>

      {/* Category nav */}
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('mb', 6),
          'overflow-x-auto pb-2',
        )}
        aria-label={t('catalog.categoriesAria', {}, { defaultValue: 'Categories' })}
      >
        <button
          type="button"
          onClick={() => updateParam('category', null)}
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.roundedFull,
            activeCategory === 'all'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
          )}
        >
          {t('status.all', {}, { defaultValue: 'All' })}
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => updateParam('category', cat.slug)}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              'min-h-[40px] whitespace-nowrap',
              activeCategory === cat.slug
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden>
              {cat.icon}
            </span>
            {t(`catalog.category.${cat.slug}`, {}, { defaultValue: cat.label })}
          </button>
        ))}
      </nav>

      {/* Sort + result count */}
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'catalog.resultCount',
            { count: products.length },
            { defaultValue: '{{count}} products' },
          )}
        </p>
        <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}>
          <span className="text-on-surface-variant">
            {t('catalog.sortBy', {}, { defaultValue: 'Sort by' })}
          </span>
          <select
            value={activeSort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-full bg-surface-container-low border border-outline-variant text-on-surface',
            )}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(`catalog.sort.${opt.value}`, {}, { defaultValue: opt.label })}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Featured vendor strip */}
      {vendors.length > 0 && (
        <section className={cm.cn(cm.sp('mb', 10))}>
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 4))}>
            <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
              {t('catalog.featuredVendors', {}, { defaultValue: 'Featured shops' })}
            </h2>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2 lg:grid-cols-3')}>
            {vendors.slice(0, 3).map((vendor) => (
              <VendryVendorCard key={vendor.id} vendor={vendor} compact />
            ))}
          </div>
        </section>
      )}

      {/* Products grid */}
      <section>
        <h2 className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4), 'text-xl text-on-surface')}>
          {t('catalog.allProducts', {}, { defaultValue: 'Every shop, every product' })}
        </h2>
        {loading && products.length === 0 ? (
          <p className="text-on-surface-variant">
            {t('catalog.loading', {}, { defaultValue: 'Loading products…' })}
          </p>
        ) : products.length === 0 ? (
          <p className="text-on-surface-variant">
            {t('catalog.empty', {}, { defaultValue: 'No products match your filters yet.' })}
          </p>
        ) : (
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), 'md:grid-cols-3 lg:grid-cols-4')}>
            {products.map((product) => (
              <VendryProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Catalog
