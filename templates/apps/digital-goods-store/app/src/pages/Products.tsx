import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ApiProduct {
  id: string
  slug: string
  name: string
  price_cents: number
  pricing_model?: 'free' | 'paid' | 'pwyw'
  file_type?: string
  cover_image?: string
  total_sales?: number
  badge?: 'new' | 'sale' | 'bestseller'
  updated_at?: string
}

function unwrap(res: unknown): ApiProduct[] {
  if (Array.isArray(res)) return res as ApiProduct[]
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data
    if (Array.isArray(data)) return data as ApiProduct[]
    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
      const inner = (data as { data: unknown }).data
      if (Array.isArray(inner)) return inner as ApiProduct[]
    }
  }
  return []
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

export function Products() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    // Seller-scoped: this is the creator's own catalog ("Your products"),
    // so we must pass mine=true. The unscoped /api/products is the public
    // storefront (active listings from every creator) — wrong list, and it
    // hides this seller's own drafts/archived items.
    http
      .get('/api/products?mine=true')
      .then((res) => setProducts(unwrap(res)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [http])

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.stack(6))}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary-dark',
            )}
          >
            {t('products.eyebrow', {}, { defaultValue: 'Catalog' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-on-surface',
            )}
          >
            {t('products.title', {}, { defaultValue: 'Your products' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'products.subtitle',
              { count: products.length },
              { defaultValue: '{{count}} active listings' },
            )}
          </p>
        </div>
        <Link
          to="/products/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'inline-flex items-center gap-2 bg-primary text-on-primary rounded-xl shadow-md shadow-primary/30 hover:bg-primary-hover transition-colors',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            add
          </span>
          {t('products.addCta', {}, { defaultValue: 'Add product' })}
        </Link>
      </header>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : products.length === 0 ? (
        <div
          className={cm.cn(cm.sp('p', 12), 'rounded-2xl bg-surface-container-lowest text-center')}
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: 56 }}
          >
            inventory_2
          </span>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mt', 4),
              'text-on-surface',
            )}
          >
            {t('products.emptyTitle', {}, { defaultValue: 'No products yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'products.empty',
              {},
              { defaultValue: 'Start with your first upload — it goes live instantly.' },
            )}
          </p>
          <Link
            to="/products/new"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 6),
              cm.fontWeight('bold'),
              'inline-flex items-center gap-2 bg-primary text-on-primary rounded-xl hover:bg-primary-hover transition-colors',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              add
            </span>
            {t('products.addCta', {}, { defaultValue: 'Add product' })}
          </Link>
        </div>
      ) : (
        <section
          className={cm.cn('rounded-2xl bg-surface-container-lowest shadow-sm overflow-hidden')}
        >
          {/* Six columns don't fit a phone — scroll horizontally instead of
              silently clipping (the section is overflow-hidden). */}
          <div className={cm.cn('overflow-x-auto')}>
            <table className={cm.cn(cm.w('full'), 'border-collapse min-w-[560px]')}>
              <thead className={cm.cn('bg-bg-secondary')}>
                <tr>
                  {[
                    { key: 'product', label: t('nav.product', {}, { defaultValue: 'Product' }) },
                    { key: 'price', label: t('form.price', {}, { defaultValue: 'Price' }) },
                    { key: 'format', label: t('form.format', {}, { defaultValue: 'Format' }) },
                    { key: 'sales', label: t('products.col.sales', {}, { defaultValue: 'Sales' }) },
                    {
                      key: 'updated',
                      label: t('products.col.updated', {}, { defaultValue: 'Updated' }),
                    },
                    { key: 'actions', label: '' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        cm.fontWeight('bold'),
                        'text-left text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cm.cn('divide-y divide-border')}>
                {products.map((p) => (
                  <tr key={p.id} className={cm.cn('hover:bg-bg-secondary transition-colors')}>
                    <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                        {p.cover_image ? (
                          <img
                            src={p.cover_image}
                            alt=""
                            className={cm.cn('rounded-lg object-cover')}
                            style={{ width: 56, height: 36 }}
                          />
                        ) : (
                          <div
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              'rounded-lg bg-primary-light text-primary',
                            )}
                            style={{ width: 56, height: 36 }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                              inventory_2
                            </span>
                          </div>
                        )}
                        <div>
                          <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                            {p.name}
                          </p>
                          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            {p.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 4),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {p.pricing_model === 'free' || p.price_cents === 0
                        ? t('nav.free', {}, { defaultValue: 'Free' })
                        : formatPrice(p.price_cents)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 4),
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'text-on-surface-variant',
                      )}
                      style={{ fontFamily: 'var(--font-family-mono)' }}
                    >
                      {p.file_type ?? '—'}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 4),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {p.total_sales ?? 0}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 4),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {p.updated_at
                        ? new Date(p.updated_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), 'text-right')}>
                      <Link
                        to={`/products/${p.id}/edit`}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.fontWeight('semibold'),
                          cm.textSize('sm'),
                          'text-primary-dark hover:text-primary-hover',
                        )}
                      >
                        {t('common.edit', {}, { defaultValue: 'Edit' })}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

export default Products
