import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { InventoryKpiCard } from '../components/InventoryKpiCard.js'
import { type MovementEntry, type MovementKind, MovementRow } from '../components/MovementRow.js'
import { StockBadge } from '../components/StockBadge.js'

interface ApiStockLevel {
  id: string
  product_id: string
  warehouse_id: string
  quantity: number
}

interface ApiProduct {
  id: string
  name: string
  sku: string
  barcode?: string | null
  category?: string | null
  unit?: string | null
  description?: string | null
  cost_price?: number | null
  sell_price?: number | null
  low_stock_threshold?: number | null
  status?: string
  stock_levels?: ApiStockLevel[]
}

interface ApiWarehouse {
  id: string
  name: string
  code?: string | null
  city?: string | null
}

interface ApiMovement {
  id: string
  product_id?: string | null
  warehouse_id?: string | null
  quantity_change: number
  reason: string
  reference?: string | null
  created_at?: string | null
}

function reasonToKind(reason: string, qty: number): MovementKind {
  if (reason === 'transfer') return 'transfer'
  if (reason === 'adjustment') return 'adjustment'
  if (qty >= 0) return 'inbound'
  return 'outbound'
}

export function ProductDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [warehouses, setWarehouses] = useState<Map<string, ApiWarehouse>>(new Map())
  const [movements, setMovements] = useState<ApiMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [prodResp, whResp, movResp] = await Promise.all([
        http.get<ApiProduct>(`/products/${id}`),
        http.get<ApiWarehouse[]>('/warehouses'),
        http.get<ApiMovement[]>(`/stock/movements?product_id=${encodeURIComponent(id)}&limit=20`),
      ])
      setProduct((prodResp.data ?? null) as ApiProduct | null)
      const whMap = new Map<string, ApiWarehouse>()
      for (const w of Array.isArray(whResp.data) ? whResp.data : []) whMap.set(String(w.id), w)
      setWarehouses(whMap)
      setMovements(Array.isArray(movResp.data) ? movResp.data : [])
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string }; status?: number } })
        ?.response
      if (apiError?.status === 404) {
        setError(t('productDetail.notFound', {}, { defaultValue: 'Product not found' }))
      } else {
        setError(
          apiError?.data?.error ?? (err instanceof Error ? err.message : 'Failed to load product'),
        )
      }
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void load()
  }, [load])

  const totalOnHand = useMemo(() => {
    return (product?.stock_levels ?? []).reduce((sum, s) => sum + Number(s.quantity), 0)
  }, [product])

  const threshold = product?.low_stock_threshold ?? 10

  const movementEntries: MovementEntry[] = useMemo(() => {
    return movements.map((m) => {
      const wh = m.warehouse_id ? warehouses.get(String(m.warehouse_id)) : undefined
      return {
        id: String(m.id),
        kind: reasonToKind(m.reason, Number(m.quantity_change)),
        productName: product?.name ?? '',
        sku: product?.sku ?? '',
        quantity: Number(m.quantity_change),
        warehouse: wh?.name,
        reason: m.reference ?? m.reason,
        occurredAt: m.created_at ?? new Date().toISOString(),
      }
    })
  }, [movements, warehouses, product])

  const handlePrintLabels = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  if (loading && !product) {
    return (
      <div
        className={cm.cn(
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-8',
        )}
      >
        <p className={cm.cn('text-sm text-on-surface-variant')}>
          {t('productDetail.loading', {}, { defaultValue: 'Loading product…' })}
        </p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className={cm.stack(4)}>
        <Link
          to="/inventory"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'text-xs font-bold uppercase tracking-wider text-primary hover:underline',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[16px]')} data-icon="arrow_back">
            arrow_back
          </span>
          {t('productDetail.back', {}, { defaultValue: 'Back to inventory' })}
        </Link>
        <div
          role="alert"
          className={cm.cn(
            'rounded-lg bg-error-container text-on-error-container px-4 py-3 text-sm',
          )}
        >
          {error ?? t('productDetail.notFound', {}, { defaultValue: 'Product not found' })}
        </div>
      </div>
    )
  }

  return (
    <div className={cm.stack(8)}>
      <Link
        to="/inventory"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'text-xs font-bold uppercase tracking-wider text-primary hover:underline',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[16px]')} data-icon="arrow_back">
          arrow_back
        </span>
        {t('productDetail.back', {}, { defaultValue: 'Back to inventory' })}
      </Link>

      <header className={cm.cn('grid lg:grid-cols-[2fr_1fr] gap-6')}>
        <div className={cm.stack(3)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('productDetail.eyebrow', {}, { defaultValue: 'Product profile' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {product.name}
          </h1>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
            <span
              className={cm.cn('font-mono text-sm font-semibold tracking-wide')}
              style={{ color: 'var(--color-sku)' }}
            >
              {product.sku}
            </span>
            {product.category && (
              <>
                <span className={cm.cn('text-on-surface-variant')}>·</span>
                <span className={cm.cn('text-sm text-on-surface-variant')}>{product.category}</span>
              </>
            )}
            <StockBadge quantity={totalOnHand} threshold={threshold * 2} />
          </div>
          {product.description && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
              {product.description}
            </p>
          )}
          <div
            className={cm.cn(cm.flex({ gap: 'md' }), 'flex-wrap text-xs text-on-surface-variant')}
          >
            <span>
              {t('productDetail.cost', {}, { defaultValue: 'Cost' })}: $
              {Number(product.cost_price ?? 0).toFixed(2)}
            </span>
            <span>
              {t('productDetail.sell', {}, { defaultValue: 'Sell' })}: $
              {Number(product.sell_price ?? 0).toFixed(2)}
            </span>
            <span>
              {t('productDetail.unit', {}, { defaultValue: 'Unit' })}: {product.unit ?? 'each'}
            </span>
            <span>
              {t('productDetail.threshold', {}, { defaultValue: 'Threshold' })}: {threshold}
            </span>
          </div>
        </div>
        <article
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('p', 6),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest text-center',
          )}
        >
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant',
            )}
          >
            {t('productDetail.barcode', {}, { defaultValue: 'Barcode' })} ·{' '}
            {product.barcode ?? product.sku}
          </p>
          <svg
            viewBox="0 0 200 60"
            className={cm.cn('h-16 w-full')}
            aria-hidden="true"
            style={{ color: 'var(--color-sidebar)' }}
          >
            {[
              3, 8, 11, 18, 24, 30, 35, 40, 47, 53, 60, 65, 72, 80, 88, 95, 102, 109, 117, 124, 130,
              138, 145, 153, 160, 167, 174, 182, 189, 195,
            ].map((x, i) => (
              <rect
                key={x}
                x={x}
                y="0"
                width={i % 4 === 0 ? 3 : i % 3 === 0 ? 2 : 1}
                height="60"
                fill="currentColor"
              />
            ))}
          </svg>
          <button
            type="button"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              'rounded-md text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary/10',
            )}
            onClick={handlePrintLabels}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} data-icon="print">
              print
            </span>
            {t('productDetail.print', {}, { defaultValue: 'Print labels' })}
          </button>
        </article>
      </header>

      <section className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4')}>
        <InventoryKpiCard
          label={t('productDetail.kpis.onHand', {}, { defaultValue: 'On hand' })}
          value={totalOnHand.toLocaleString()}
          tone="primary"
          icon="inventory_2"
        />
        <InventoryKpiCard
          label={t('productDetail.kpis.locations', {}, { defaultValue: 'Locations' })}
          value={String((product.stock_levels ?? []).length)}
          tone="info"
          icon="warehouse"
        />
        <InventoryKpiCard
          label={t('productDetail.kpis.threshold', {}, { defaultValue: 'Reorder at' })}
          value={String(threshold)}
          tone={totalOnHand <= threshold ? 'error' : 'success'}
          icon="vertical_align_bottom"
        />
        <InventoryKpiCard
          label={t('productDetail.kpis.recent', {}, { defaultValue: 'Recent moves' })}
          value={String(movements.length)}
          tone="success"
          icon="history"
        />
      </section>

      <div className={cm.cn('grid lg:grid-cols-2 gap-6')}>
        <section
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          )}
        >
          <header>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('productDetail.locations.eyebrow', {}, { defaultValue: 'Where it lives' })}
            </p>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('productDetail.locations.title', {}, { defaultValue: 'Stock by warehouse' })}
            </h2>
          </header>
          <div className={cm.cn('divide-y divide-outline-variant/40')}>
            {(product.stock_levels ?? []).length === 0 && (
              <p className={cm.cn('text-sm text-on-surface-variant py-3')}>
                {t(
                  'productDetail.locations.empty',
                  {},
                  {
                    defaultValue:
                      'No stock recorded yet — this product has zero on-hand at every warehouse.',
                  },
                )}
              </p>
            )}
            {(product.stock_levels ?? []).map((loc) => {
              const wh = warehouses.get(String(loc.warehouse_id))
              return (
                <div
                  key={loc.id}
                  className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'py-3')}
                >
                  <div className={cm.stack(1)}>
                    <p className={cm.cn('text-sm font-semibold text-on-surface')}>
                      {wh?.name ?? '—'}
                    </p>
                    <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                      {wh?.code ?? loc.warehouse_id}
                    </p>
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                    <span className={cm.cn('font-mono font-bold tabular-nums text-on-surface')}>
                      {loc.quantity}
                    </span>
                    <StockBadge quantity={Number(loc.quantity)} threshold={threshold} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section
          className={cm.cn(
            cm.stack(2),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
          )}
        >
          <header className={cm.cn(cm.sp('px', 6), cm.sp('pt', 6))}>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('productDetail.history.eyebrow', {}, { defaultValue: 'Movement history' })}
            </p>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
            </h2>
          </header>
          <div className={cm.cn('divide-y divide-outline-variant/40')}>
            {movementEntries.length === 0 && (
              <p className={cm.cn('text-sm text-on-surface-variant px-6 py-4')}>
                {t(
                  'productDetail.history.empty',
                  {},
                  { defaultValue: 'No recorded movements yet.' },
                )}
              </p>
            )}
            {movementEntries.map((entry) => (
              <MovementRow key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProductDetail
