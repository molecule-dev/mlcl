import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiCategory {
  name: string
  count: number
}

const CATEGORY_GLYPH: Record<string, string> = {
  Electronics: 'devices',
  Headphones: 'headphones',
  Laptops: 'laptop_mac',
  Phones: 'smartphone',
  Cameras: 'photo_camera',
  Home: 'chair',
  Kitchen: 'cooking',
  Fitness: 'fitness_center',
  Apparel: 'checkroom',
  Beauty: 'spa',
  Books: 'menu_book',
  Toys: 'toys',
  Outdoor: 'hiking',
  Gaming: 'sports_esports',
}

const FEATURED = [
  {
    key: 'back-to-school',
    eyebrow: 'Limited drop',
    title: 'Back-to-school tech',
    body: 'Laptops, headphones, and tablets discounted for the season — verified across every major retailer.',
    glyph: 'school',
  },
  {
    key: 'home-refresh',
    eyebrow: 'Now trending',
    title: 'Spring home refresh',
    body: 'Vacuums, espresso machines, and air purifiers — the categories with the steepest live drops this week.',
    glyph: 'home',
  },
  {
    key: 'fitness',
    eyebrow: 'Watchlist surge',
    title: 'New-year fitness',
    body: 'Wearables, bikes, and rowers — track price history before the gym promo hype evaporates.',
    glyph: 'directions_run',
  },
] as const

export function Categories() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErrorMsg(null)
    void (async () => {
      try {
        const res = await http.get('/api/products/meta/categories')
        if (cancelled) return
        setCategories(unwrapList<ApiCategory>(res))
      } catch (_error) {
        if (!cancelled)
          setErrorMsg(
            t('categories.loadFailed', {}, { defaultValue: 'Could not load categories.' }),
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, retryKey])

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-10')}
      data-test="categories-page"
    >
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
          {t('categories.eyebrow', { appName: APP_NAME }, { defaultValue: 'Browse {{appName}}' })}
        </p>
        <h1
          className={cm.cn(
            'mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('categories.heading', {}, { defaultValue: 'Categories' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('base'),
            cm.sp('mt', 2),
            'text-on-surface-variant max-w-3xl',
          )}
        >
          {t(
            'categories.subheading',
            {},
            {
              defaultValue:
                'Drill into a category to see live drops, top brands, and the products with the biggest price-history swings.',
            },
          )}
        </p>
      </header>

      <section>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-secondary')}>
          {t('categories.featuredEyebrow', {}, { defaultValue: 'Featured collections' })}
        </p>
        <h2 className={cm.cn('mt-1 mb-5 text-2xl font-extrabold tracking-tight text-on-surface')}>
          {t('categories.featuredHeading', {}, { defaultValue: 'Curated by season' })}
        </h2>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 lg:grid-cols-3')}>
          {FEATURED.map((f) => (
            <article
              key={f.key}
              className={cm.cn(
                cm.sp('p', 6),
                'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-container/50 to-secondary-container/40 border border-outline-variant/30 transition-transform hover:-translate-y-0.5',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'relative h-12 w-12 rounded-xl bg-primary/20 text-primary',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-2xl')}>{f.glyph}</span>
              </span>
              <p
                className={cm.cn(
                  'relative mt-4 text-[10px] font-black uppercase tracking-widest text-primary',
                )}
              >
                {t(`categories.featured.${f.key}.eyebrow`, {}, { defaultValue: f.eyebrow })}
              </p>
              <h3
                className={cm.cn(
                  cm.sp('mt', 1),
                  cm.textSize('xl'),
                  cm.fontWeight('extrabold'),
                  'tracking-tight text-on-surface relative',
                )}
              >
                {t(`categories.featured.${f.key}.title`, {}, { defaultValue: f.title })}
              </h3>
              <p
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.textSize('sm'),
                  'relative text-on-surface-variant leading-relaxed',
                )}
              >
                {t(`categories.featured.${f.key}.body`, {}, { defaultValue: f.body })}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-tertiary')}>
          {t('categories.allEyebrow', {}, { defaultValue: 'All categories' })}
        </p>
        <h2 className={cm.cn('mt-1 mb-5 text-2xl font-extrabold tracking-tight text-on-surface')}>
          {t('categories.allHeading', {}, { defaultValue: 'Every aisle, indexed' })}
        </h2>
        {errorMsg ? (
          <LoadErrorBanner
            data-test="error-banner"
            message={errorMsg}
            onRetry={() => setRetryKey((k) => k + 1)}
            retryMolId="error-retry"
          />
        ) : categories.length === 0 ? (
          <div
            data-test="categories-empty"
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant',
            )}
          >
            {loading
              ? t('categories.loading', {}, { defaultValue: 'Loading aisles…' })
              : t(
                  'categories.empty',
                  {},
                  { defaultValue: 'Catalog is being seeded — check back shortly.' },
                )}
          </div>
        ) : (
          <div
            data-test="categories-grid"
            className={cm.cn(
              cm.grid({ gap: 'md' }),
              'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
            )}
          >
            {categories.map((c) => {
              const glyph = CATEGORY_GLYPH[c.name] ?? 'shopping_bag'
              return (
                <Link
                  key={c.name}
                  to={`/search?category=${encodeURIComponent(c.name)}`}
                  data-test={`categories-tile-${c.name.toLowerCase()}`}
                  className={cm.cn(
                    cm.sp('p', 4),
                    'group relative block overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-10 w-10 rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-2xl')}>{glyph}</span>
                  </span>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 3),
                      cm.textSize('sm'),
                      cm.fontWeight('extrabold'),
                      'text-on-surface tracking-tight',
                    )}
                  >
                    {c.name}
                  </p>
                  <p
                    className={cm.cn(
                      cm.flex({ align: 'baseline', justify: 'between' }),
                      cm.sp('mt', 1),
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                    )}
                  >
                    <span className={cm.cn('tabular-nums')}>
                      {t(
                        'categories.aisleCount',
                        { count: c.count },
                        { defaultValue: '{{count}} products' },
                      )}
                    </span>
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
