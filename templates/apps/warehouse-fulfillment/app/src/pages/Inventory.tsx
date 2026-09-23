import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FulfillmentKpiCard } from '../components/FulfillmentKpiCard.js'

interface InventoryRow {
  id: string
  sku: string
  productName: string
  bin: string
  onHand: number
  reorderPoint: number
}

interface ApiInventoryRow {
  id: string
  name?: string
  sku?: string
  bin?: string | null
  onHand?: number | string | null
  reorderPoint?: number | string | null
}

interface ApiInventoryStats {
  total?: number
  units?: number
  lowStock?: number
  outOfStock?: number
}

function statusOf(row: InventoryRow): { label: string; bg: string; color: string } {
  if (row.onHand === 0)
    return {
      label: 'Out of stock',
      bg: 'var(--color-stock-out-bg)',
      color: 'var(--color-stock-out)',
    }
  if (row.onHand <= row.reorderPoint)
    return { label: 'Low stock', bg: 'var(--color-stock-low-bg)', color: 'var(--color-stock-low)' }
  return { label: 'In stock', bg: 'var(--color-stock-in-bg)', color: 'var(--color-stock-in)' }
}

export function Inventory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [stats, setStats] = useState<{ skus: number; units: number; low: number; out: number }>({
    skus: 0,
    units: 0,
    low: 0,
    out: 0,
  })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [itemsRes, statsRespRes] = await Promise.all([
          http.get<ApiInventoryRow[]>('/inventory'),
          http.get<ApiInventoryStats>('/inventory/stats'),
        ])
        if (cancelled) return
        const items = itemsRes.data
        const statsRes = statsRespRes.data
        const mapped: InventoryRow[] = (Array.isArray(items) ? items : []).map((row) => ({
          id: String(row.id),
          sku: String(row.sku ?? ''),
          productName: String(row.name ?? ''),
          bin: String(row.bin ?? '—'),
          onHand: Number(row.onHand ?? 0),
          reorderPoint: Number(row.reorderPoint ?? 10),
        }))
        setRows(mapped)
        setStats({
          skus: Number(statsRes?.total ?? mapped.length),
          units: Number(statsRes?.units ?? mapped.reduce((s, r) => s + r.onHand, 0)),
          low: Number(statsRes?.lowStock ?? 0),
          out: Number(statsRes?.outOfStock ?? 0),
        })
        setErrored(false)
      } catch (error) {
        logError('inventory.load', error)
        if (!cancelled) {
          setErrored(true)
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const needle = search.trim().toLowerCase()
    return rows.filter(
      (r) =>
        r.sku.toLowerCase().includes(needle) ||
        r.productName.toLowerCase().includes(needle) ||
        r.bin.toLowerCase().includes(needle),
    )
  }, [search, rows])

  return (
    <div className={cm.stack(8)} data-testid="inventory-page">
      <header className={cm.stack(1)}>
        <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
          {t('inventory.eyebrow', {}, { defaultValue: 'On-hand inventory' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('inventory.title', {}, { defaultValue: 'Inventory ledger' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'inventory.subtitle',
            { skus: stats.skus, units: stats.units },
            { defaultValue: '{{skus}} SKUs · {{units}} units across active bins' },
          )}
        </p>
      </header>

      <section className={cm.cn('grid grid-cols-2 sm:grid-cols-4 gap-4')}>
        <FulfillmentKpiCard
          label={t('inventory.kpis.skus', {}, { defaultValue: 'Active SKUs' })}
          value={String(stats.skus)}
          tone="primary"
          icon="qr_code_2"
          hint={t('inventory.kpis.skusHint', {}, { defaultValue: 'Tracked across bins' })}
        />
        <FulfillmentKpiCard
          label={t('inventory.kpis.low', {}, { defaultValue: 'Low stock' })}
          value={String(stats.low)}
          tone="warning"
          icon="warning"
          hint={t('inventory.kpis.lowHint', {}, { defaultValue: 'Below reorder point' })}
        />
        <FulfillmentKpiCard
          label={t('inventory.kpis.out', {}, { defaultValue: 'Out of stock' })}
          value={String(stats.out)}
          tone="error"
          icon="block"
          hint={t('inventory.kpis.outHint', {}, { defaultValue: 'Need reorder today' })}
        />
        <FulfillmentKpiCard
          label={t('inventory.kpis.units', {}, { defaultValue: 'Units on hand' })}
          value={stats.units.toLocaleString()}
          tone="success"
          icon="inventory_2"
          hint={t('inventory.kpis.unitsHint', {}, { defaultValue: 'Across all bins' })}
        />
      </section>

      <article
        className={cm.cn(
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
        )}
        data-testid="inventory-table"
      >
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 6),
            cm.sp('py', 4),
            'border-b border-outline-variant/50',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.h(10),
              'flex-1 max-w-md rounded-lg border border-outline-variant bg-background-secondary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px] text-on-surface-variant')}
              data-icon="search"
            >
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                'inventory.searchPlaceholder',
                {},
                { defaultValue: 'Search SKU, product, bin…' },
              )}
              data-testid="inventory-search"
              className={cm.cn(
                'w-full bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-on-surface-variant',
              )}
            />
          </div>
        </header>
        <div className={cm.cn('overflow-x-auto')}>
          <table className={cm.cn('w-full min-w-[560px] text-sm')}>
            <thead>
              <tr
                className={cm.cn('text-left text-[10px] uppercase tracking-[0.2em] text-white')}
                style={{ backgroundColor: 'var(--color-sidebar)' }}
              >
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold')}>
                  {t('inventory.cols.sku', {}, { defaultValue: 'SKU' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold')}>
                  {t('nav.product', {}, { defaultValue: 'Product' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold')}>
                  {t('inventory.cols.bin', {}, { defaultValue: 'Bin' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold text-right')}>
                  {t('inventory.cols.onHand', {}, { defaultValue: 'On hand' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold text-right')}>
                  {t('inventory.cols.reorder', {}, { defaultValue: 'Reorder pt' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold')}>
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/50')}>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className={cm.cn(cm.sp('p', 6), cm.textMuted, cm.textSize('sm'), 'text-center')}
                  >
                    {t('inventory.loading', {}, { defaultValue: 'Loading inventory…' })}
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((row) => {
                  const status = statusOf(row)
                  return (
                    <tr
                      key={row.id}
                      className={cm.cn('hover:bg-background-secondary transition-colors')}
                      data-testid="inventory-row"
                    >
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'font-mono text-xs font-bold',
                        )}
                        style={{ color: 'var(--color-sku)' }}
                      >
                        <Link to={`/inventory/${row.id}`} className={cm.cn('hover:underline')}>
                          {row.sku}
                        </Link>
                      </td>
                      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface')}>
                        {row.productName}
                      </td>
                      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-mono text-xs')}>
                        <span
                          className={cm.cn('inline-flex rounded px-2 py-0.5 font-bold')}
                          style={{
                            backgroundColor: 'var(--color-background-secondary)',
                            color: 'var(--color-text)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          {row.bin}
                        </span>
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'font-mono text-right tabular-nums font-bold text-on-surface',
                        )}
                        data-testid="inventory-onhand"
                      >
                        {row.onHand}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'font-mono text-right tabular-nums text-on-surface-variant',
                        )}
                      >
                        {row.reorderPoint}
                      </td>
                      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                        <span
                          className={cm.cn(
                            'inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                          )}
                          style={{ backgroundColor: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className={cm.cn(cm.sp('p', 6), cm.textMuted, cm.textSize('sm'), 'text-center')}
                    data-testid="inventory-empty"
                  >
                    {t('inventory.empty', {}, { defaultValue: 'No SKUs match your search.' })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {errored && (
          <p
            className={cm.cn(cm.sp('p', 4), cm.textSize('xs'), 'text-error italic')}
            data-testid="inventory-error"
          >
            {t(
              'inventory.errorFallback',
              {},
              { defaultValue: 'Live data temporarily unavailable.' },
            )}
          </p>
        )}
      </article>
    </div>
  )
}

export default Inventory
