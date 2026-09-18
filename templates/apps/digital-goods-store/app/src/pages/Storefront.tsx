import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import type { TroveProduct } from '../components/TroveProductCard.js'
import { TroveProductCard } from '../components/TroveProductCard.js'

interface ApiProduct {
  id: string
  slug: string
  name: string
  description?: string
  price_cents: number
  original_price_cents?: number
  pricing_model?: 'free' | 'paid' | 'pwyw'
  file_type?: string
  cover_image?: string
  total_sales?: number
  badge?: 'new' | 'sale' | 'bestseller'
  category?: string
}

const CATEGORIES = ['All', 'UI Kits', 'Icons', 'Fonts', 'eBooks', 'Templates', 'Brushes']

function unwrap(res: unknown): ApiProduct[] {
  if (Array.isArray(res)) return res as ApiProduct[]
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data
    if (Array.isArray(data)) return data as ApiProduct[]
    // useHttpClient wraps API JSON in `{ data: <json>, status, ... }`,
    // and our API returns `{ data: [...] }`, so peel the second layer.
    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
      const inner = (data as { data: unknown }).data
      if (Array.isArray(inner)) return inner as ApiProduct[]
    }
  }
  return []
}

function toCardProps(p: ApiProduct): TroveProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    coverImage: p.cover_image,
    priceCents: p.price_cents,
    originalPriceCents: p.original_price_cents,
    pricingModel: p.pricing_model,
    fileType: p.file_type,
    totalSales: p.total_sales,
    badge: p.badge,
  }
}

export function Storefront() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    setLoading(true)
    setError(null)
    http
      .get('/api/products')
      .then((res) => {
        setProducts(unwrap(res))
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : t('storefront.loadError', {}, { defaultValue: 'Failed to load products' }),
        ),
      )
      .finally(() => setLoading(false))
  }, [http, t])

  const filtered = products
    .filter((p) => activeCategory === 'All' || p.category === activeCategory)
    .filter(
      (p) =>
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(search.toLowerCase()),
    )

  return (
    <div className={cm.cn(cm.page, cm.flex({ direction: 'col' }), 'min-h-screen')}>
      <Header />
      <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), 'w-full max-w-[1200px]')}>
        <header className={cm.cn(cm.sp('mb', 10))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary-dark',
            )}
          >
            {t('storefront.eyebrow', {}, { defaultValue: 'Storefront' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 2),
              'text-on-surface',
            )}
          >
            {t('storefront.title', {}, { defaultValue: 'Discover handmade digital goods' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.sp('mt', 2),
              'text-on-surface-variant max-w-2xl',
            )}
          >
            {t(
              'storefront.subtitle',
              {},
              {
                defaultValue:
                  'UI kits, fonts, ebooks, and more — sold directly by the indie creators who made them.',
              },
            )}
          </p>
        </header>

        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mb', 8), 'flex-wrap')}
        >
          <div className={cm.cn('relative flex-1 min-w-[240px]')}>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
            >
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                'storefront.searchPlaceholder',
                { appName: APP_NAME },
                { defaultValue: 'Search {{appName}}…' },
              )}
              aria-label={t('storefront.searchAria', {}, { defaultValue: 'Search products' })}
              className={cm.cn(
                cm.sp('pl', 10),
                cm.sp('pr', 5),
                cm.sp('py', 3),
                cm.w('full'),
                cm.roundedFull,
                'bg-bg-secondary border border-border placeholder:text-on-surface-variant focus:outline-none focus:border-primary',
              )}
            />
          </div>
        </div>

        <div className={cm.cn(cm.flex({ gap: 'xs' }), cm.sp('mb', 10), 'flex-wrap')}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.roundedFull,
                'transition-colors',
                activeCategory === cat
                  ? 'bg-primary text-on-primary shadow-sm shadow-primary/30'
                  : 'bg-bg-secondary text-on-surface-variant hover:bg-primary-light hover:text-primary',
              )}
            >
              {t(
                `storefront.cat.${cat.replace(/\s+/g, '').toLowerCase()}`,
                {},
                { defaultValue: cat },
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>
        ) : filtered.length === 0 ? (
          <div className={cm.cn(cm.sp('py', 16), 'text-center')}>
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 56 }}
            >
              inventory_2
            </span>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                cm.sp('mt', 4),
                'text-on-surface',
              )}
            >
              {t('storefront.empty', {}, { defaultValue: 'Nothing matches yet' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {t(
                'storefront.emptyHint',
                {},
                { defaultValue: 'Try a different category or clear the search.' },
              )}
            </p>
          </div>
        ) : (
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
          >
            {filtered.map((p) => (
              <TroveProductCard key={p.id} product={toCardProps(p)} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default Storefront
