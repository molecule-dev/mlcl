import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { InventoryKpiCard } from '../components/InventoryKpiCard.js'
import { StockBadge } from '../components/StockBadge.js'

interface ApiStockLevel {
  product_id: string
  warehouse_id: string
  quantity: number
}

interface ApiWarehouseDetail {
  id: string
  name: string
  code: string
  city?: string | null
  country?: string | null
  capacity?: number | null
  contact_name?: string | null
  contact_email?: string | null
  status?: string
  stock_levels: ApiStockLevel[]
  total_items: number
  unique_products: number
}

interface ApiProduct {
  id: string
  name: string
  sku: string
  low_stock_threshold?: number
}

export function WarehouseDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()

  const [warehouse, setWarehouse] = useState<ApiWarehouseDetail | null>(null)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [whResp, prodResp] = await Promise.all([
          http.get<ApiWarehouseDetail>(`/warehouses/${id}`),
          http.get<ApiProduct[]>('/products?limit=500'),
        ])
        if (cancelled) return
        setWarehouse(whResp.data)
        setProducts(Array.isArray(prodResp.data) ? prodResp.data : [])
      } catch (err) {
        if (cancelled) return
        const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        setError(apiErr ?? (err instanceof Error ? err.message : 'Failed to load warehouse'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, http])

  const productById = useMemo(() => {
    const map: Record<string, ApiProduct> = {}
    for (const p of products) map[String(p.id)] = p
    return map
  }, [products])

  const stockRows = useMemo(() => {
    if (!warehouse) return []
    return warehouse.stock_levels
      .map((level) => {
        const product = productById[String(level.product_id)]
        return {
          product_id: String(level.product_id),
          quantity: Number(level.quantity ?? 0),
          name: product?.name ?? 'Unknown product',
          sku: product?.sku ?? '—',
          threshold: Number(product?.low_stock_threshold ?? 10),
        }
      })
      .sort((a, b) => b.quantity - a.quantity)
  }, [warehouse, productById])

  const utilization = useMemo(() => {
    if (!warehouse?.capacity || warehouse.capacity <= 0) return null
    return Math.min(1, Number(warehouse.total_items) / Number(warehouse.capacity))
  }, [warehouse])

  if (!id) {
    return null
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant text-sm')}
        data-testid="warehouse-detail-loading"
      >
        {t('warehouseDetail.loading', {}, { defaultValue: 'Loading warehouse…' })}
      </div>
    )
  }

  if (error || !warehouse) {
    return (
      <div className={cm.stack(4)}>
        <Link
          to="/warehouses"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'text-xs font-bold uppercase tracking-wider text-primary hover:underline',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[16px]')} data-icon="arrow_back">
            arrow_back
          </span>
          {t('warehouseDetail.back', {}, { defaultValue: 'All warehouses' })}
        </Link>
        <p
          role="alert"
          data-testid="warehouse-detail-error"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-lg border border-error/40 bg-error/10 text-sm text-error',
          )}
        >
          {error ?? t('warehouseDetail.notFound', {}, { defaultValue: 'Warehouse not found.' })}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.stack(8)} data-testid="warehouse-detail">
      <Link
        to="/warehouses"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'text-xs font-bold uppercase tracking-wider text-primary hover:underline',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[16px]')} data-icon="arrow_back">
          arrow_back
        </span>
        {t('warehouseDetail.back', {}, { defaultValue: 'All warehouses' })}
      </Link>

      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {warehouse.code}
          </p>
          <h1
            data-testid="warehouse-detail-name"
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}
          >
            {warehouse.name}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {[warehouse.city, warehouse.country].filter(Boolean).join(' · ') ||
              t(
                'warehouseDetail.subtitle',
                {},
                { defaultValue: 'Capacity, stock, and SKUs at this site.' },
              )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
          <Link
            to="/transfers"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg border border-outline-variant text-on-surface hover:bg-background-secondary',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="sync_alt">
              sync_alt
            </span>
            {t('warehouseDetail.transfer', {}, { defaultValue: 'Move stock' })}
          </Link>
          <Link
            to="/inventory"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow shadow-primary/30 hover:opacity-95',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px]')}
              data-icon="inventory_2"
            >
              inventory_2
            </span>
            {t('warehouseDetail.inventory', {}, { defaultValue: 'Edit SKUs' })}
          </Link>
        </div>
      </header>

      <section className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4')}>
        <InventoryKpiCard
          label={t('warehouseDetail.kpis.utilization', {}, { defaultValue: 'Utilization' })}
          value={
            utilization != null
              ? `${Math.round(utilization * 100)}%`
              : t('warehouseDetail.kpis.noCapacity', {}, { defaultValue: '—' })
          }
          tone={utilization != null && utilization >= 0.85 ? 'warning' : 'primary'}
          icon="space_dashboard"
          hint={
            warehouse.capacity
              ? t(
                  'warehouseDetail.kpis.utilizationHint',
                  {
                    used: Number(warehouse.total_items).toLocaleString(),
                    cap: Number(warehouse.capacity).toLocaleString(),
                  },
                  { defaultValue: '{{used}} / {{cap}} units' },
                )
              : t('warehouseDetail.kpis.noCapHint', {}, { defaultValue: 'No capacity set' })
          }
          dataTestId="warehouse-utilization-kpi"
        />
        <InventoryKpiCard
          label={t('warehouseDetail.kpis.skus', {}, { defaultValue: 'Active SKUs' })}
          value={String(warehouse.unique_products)}
          tone="info"
          icon="qr_code_2"
          dataTestId="warehouse-skus-kpi"
        />
        <InventoryKpiCard
          label={t('warehouseDetail.kpis.units', {}, { defaultValue: 'Total units' })}
          value={Number(warehouse.total_items).toLocaleString()}
          tone="success"
          icon="inventory_2"
          dataTestId="warehouse-units-kpi"
        />
        <InventoryKpiCard
          label={t('nav.status', {}, { defaultValue: 'Status' })}
          value={String(warehouse.status ?? 'active')}
          tone={warehouse.status === 'inactive' ? 'warning' : 'success'}
          icon="check_circle"
          dataTestId="warehouse-status-kpi"
        />
      </section>

      <section
        className={cm.cn(
          cm.stack(4),
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <div className={cm.stack(1)}>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('warehouseDetail.skus.eyebrow', {}, { defaultValue: 'Stocked here' })}
            </p>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('warehouseDetail.skus.title', {}, { defaultValue: 'SKUs at this site' })}
            </h2>
          </div>
          <Link
            to="/inventory"
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:underline',
            )}
          >
            {t('warehouseDetail.skus.viewAll', {}, { defaultValue: 'View ledger' })}
          </Link>
        </header>
        {stockRows.length === 0 ? (
          <p
            data-testid="warehouse-detail-empty-stock"
            className={cm.cn('text-sm text-on-surface-variant')}
          >
            {t(
              'warehouseDetail.skus.empty',
              {},
              { defaultValue: 'No stock levels recorded for this warehouse yet.' },
            )}
          </p>
        ) : (
          <div
            className={cm.cn('divide-y divide-outline-variant/40')}
            data-testid="warehouse-stock-list"
          >
            {stockRows.map((row) => (
              <div
                key={row.product_id}
                data-testid="warehouse-stock-row"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  'py-3 hover:bg-background-secondary transition-colors',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span
                    className={cm.cn('font-mono text-sm font-semibold')}
                    style={{ color: 'var(--color-sku)' }}
                  >
                    {row.sku}
                  </span>
                  <Link
                    to={`/products/${row.product_id}`}
                    className={cm.cn('font-semibold text-sm text-on-surface hover:text-primary')}
                  >
                    {row.name}
                  </Link>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                  <span
                    className={cm.cn('font-mono font-bold tabular-nums text-sm text-on-surface')}
                  >
                    {row.quantity.toLocaleString()}
                  </span>
                  <StockBadge quantity={row.quantity} threshold={row.threshold} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default WarehouseDetail
