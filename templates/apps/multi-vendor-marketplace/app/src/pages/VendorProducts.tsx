import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface VendorProductRow {
  id: string
  name: string
  sku: string
  price_cents: number
  inventory: number
  status: 'active' | 'draft' | 'archived'
  variant_count: number
  image_url?: string
}

interface ApiProduct {
  id: string
  name?: string
  sku?: string | null
  price?: number
  inventory?: number
  inventory_count?: number
  status?: string
  variant_count?: number
  image_url?: string | null
}

const FALLBACK_PRODUCTS: VendorProductRow[] = [
  {
    id: 'p-1',
    name: 'Sienna Stoneware Mug — set of 2',
    sku: 'MUG-SIE-002',
    price_cents: 4800,
    inventory: 24,
    status: 'active',
    variant_count: 3,
  },
  {
    id: 'p-2',
    name: 'Olive Pour-Over Set',
    sku: 'PRV-OLV-001',
    price_cents: 8900,
    inventory: 12,
    status: 'active',
    variant_count: 1,
  },
  {
    id: 'p-3',
    name: 'Hand-Thrown Salt Cellar',
    sku: 'SLT-CEL-014',
    price_cents: 3600,
    inventory: 4,
    status: 'active',
    variant_count: 2,
  },
  {
    id: 'p-4',
    name: 'Speckled Espresso Cup',
    sku: 'ESP-CUP-006',
    price_cents: 2200,
    inventory: 0,
    status: 'draft',
    variant_count: 4,
  },
  {
    id: 'p-5',
    name: 'Bone Linen Bread Bag',
    sku: 'BAG-LIN-001',
    price_cents: 2400,
    inventory: 18,
    status: 'archived',
    variant_count: 1,
  },
  {
    id: 'p-6',
    name: 'Indigo Pinch Bowls — set of 4',
    sku: 'BWL-IND-004',
    price_cents: 6400,
    inventory: 9,
    status: 'active',
    variant_count: 1,
  },
]

const STATUS_TONES = {
  active: 'bg-success/15 text-success',
  draft: 'bg-warning/15 text-warning',
  archived: 'bg-surface-container-high text-on-surface-variant',
} as const

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function VendorProducts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [products, setProducts] = useState<VendorProductRow[]>(FALLBACK_PRODUCTS)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data?: ApiProduct[] } | ApiProduct[]>('/api/vendors/me/products')
      .then((res) => {
        const raw = (res as { data?: unknown }).data ?? res
        const list = Array.isArray(raw)
          ? (raw as ApiProduct[])
          : ((raw as { data?: ApiProduct[] }).data ?? [])
        if (cancelled) return
        if (list.length === 0) return
        setProducts(
          list.map((p) => ({
            id: String(p.id),
            name: p.name ?? t('status.untitled', {}, { defaultValue: 'Untitled' }),
            sku: p.sku ?? '—',
            price_cents: Math.round(Number(p.price ?? 0) * 100),
            inventory: Number(p.inventory ?? p.inventory_count ?? 0),
            status:
              (p.status as string) === 'active' ||
              (p.status as string) === 'draft' ||
              (p.status as string) === 'archived'
                ? (p.status as VendorProductRow['status'])
                : 'active',
            variant_count: Number(p.variant_count ?? 1),
            image_url: p.image_url ?? undefined,
          })),
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1280px] space-y-8')}>
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', wrap: 'wrap', gap: 'md' }))}
      >
        <div className={cm.cn(cm.stack(2))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-sky-700 dark:text-info',
            )}
          >
            {t('vendorProducts.eyebrow', {}, { defaultValue: 'Vendor admin' })}
          </p>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-4xl tracking-tight font-extrabold text-on-surface',
            )}
          >
            {t('vendorProducts.title', {}, { defaultValue: 'Your products' })}
          </h1>
          <p className={'text-on-surface-variant text-lg'}>
            {t(
              'vendorProducts.subtitle',
              {},
              { defaultValue: 'Manage every listing, variant, and stock count in one table.' },
            )}
          </p>
        </div>
        <Link
          to="/vendor/products/new"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.roundedFull,
            'bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/20',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden>
            add
          </span>
          {t('vendorProducts.newCta', {}, { defaultValue: 'New product' })}
        </Link>
      </div>

      <div className={cm.cn(cm.grid({ cols: 2, gap: 'sm' }), 'md:grid-cols-4')}>
        {[
          {
            label: t('vendorProducts.kpi.total', {}, { defaultValue: 'Total products' }),
            value: products.length,
          },
          {
            label: t('status.active', {}, { defaultValue: 'Active' }),
            value: products.filter((p) => p.status === 'active').length,
          },
          {
            label: t('vendorProducts.kpi.draft', {}, { defaultValue: 'Drafts' }),
            value: products.filter((p) => p.status === 'draft').length,
          },
          {
            label: t('vendorProducts.kpi.lowStock', {}, { defaultValue: 'Low stock' }),
            value: products.filter((p) => p.inventory <= 5).length,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={cm.cn(cm.sp('p', 4), 'rounded-2xl border border-outline-variant bg-surface')}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant font-semibold',
              )}
            >
              {kpi.label}
            </p>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-2xl text-on-surface tabular-nums font-extrabold',
              )}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className={'overflow-hidden rounded-3xl border border-outline-variant bg-surface'}>
        <table className={cm.cn(cm.w('full'), cm.textSize('sm'))}>
          <thead className="bg-surface-container-low">
            <tr>
              {[
                { key: 'product', label: 'Product' },
                { key: 'sku', label: 'SKU' },
                { key: 'price', label: 'Price' },
                { key: 'inventory', label: 'Inventory' },
                { key: 'variants', label: 'Variants' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: '' },
              ].map((col) => (
                <th
                  key={col.key}
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'text-left uppercase tracking-widest text-on-surface-variant text-[10px]',
                  )}
                >
                  {col.label
                    ? t(`vendorProducts.col.${col.key}`, {}, { defaultValue: col.label })
                    : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {products.map((product) => (
              <tr key={product.id} className={'hover:bg-surface-container-low transition-colors'}>
                <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <img
                      src={`https://picsum.photos/seed/vendry-vp-${product.id}/64/80`}
                      alt=""
                      className={'h-12 w-10 rounded-lg object-cover bg-surface-container-low'}
                    />
                    <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                      {product.name}
                    </span>
                  </div>
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'font-mono text-on-surface-variant',
                  )}
                >
                  {product.sku}
                </td>
                <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'tabular-nums font-semibold')}>
                  {formatCents(product.price_cents)}
                </td>
                <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      'tabular-nums',
                      product.inventory === 0
                        ? 'text-error'
                        : product.inventory <= 5
                          ? 'text-warning'
                          : 'text-on-surface',
                    )}
                  >
                    {product.inventory}
                  </span>
                </td>
                <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                  {product.variant_count}
                </td>
                <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      'uppercase tracking-widest',
                      STATUS_TONES[product.status],
                    )}
                  >
                    {t(`status.${product.status}`, {}, { defaultValue: product.status })}
                  </span>
                </td>
                <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  <Link
                    to={`/vendor/products/${product.id}/edit`}
                    className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
                  >
                    {t('common.edit', {}, { defaultValue: 'Edit' })}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default VendorProducts
