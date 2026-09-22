import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Field } from '../components/Field.js'
import { Modal } from '../components/Modal.js'
import { StockBadge } from '../components/StockBadge.js'

interface ApiProduct {
  id: string
  name: string
  sku: string
  category?: string | null
  cost_price?: number
  sell_price?: number
  low_stock_threshold?: number
  status?: 'active' | 'archived' | 'draft'
}

interface ValuationItem {
  product_id?: string
  warehouse_id?: string
  quantity?: number
}

interface ValuationResponse {
  items?: ValuationItem[]
}

interface ProductRow {
  id: string
  name: string
  sku: string
  category: string
  quantity: number
  threshold: number
  unitCostCents: number
  status: 'active' | 'archived' | 'draft'
}

const PER_PAGE = 8
const ALL_CATEGORIES = '__all_categories__'

interface AddSkuFormState {
  name: string
  sku: string
  category: string
  cost_price: string
  sell_price: string
  low_stock_threshold: string
}

const EMPTY_FORM: AddSkuFormState = {
  name: '',
  sku: '',
  category: '',
  cost_price: '0',
  sell_price: '0',
  low_stock_threshold: '10',
}

export function Inventory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [searchParams] = useSearchParams()
  // The app shell's global search navigates here with ?q=<term>.
  const globalQuery = searchParams.get('q') ?? ''

  const [rows, setRows] = useState<ProductRow[]>([])
  const [search, setSearch] = useState(globalQuery)
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'in'>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<AddSkuFormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [productsResp, valuationResp] = await Promise.all([
        http.get<ApiProduct[]>('/products?limit=200'),
        http
          .get<ValuationResponse>('/reports/valuation')
          .catch(() => ({ data: { items: [] } as ValuationResponse })),
      ])

      const products = Array.isArray(productsResp.data) ? productsResp.data : []
      const totals: Record<string, number> = {}
      for (const item of valuationResp.data?.items ?? []) {
        const pid = String(item.product_id ?? '')
        if (!pid) continue
        totals[pid] = (totals[pid] ?? 0) + Number(item.quantity ?? 0)
      }

      setRows(
        products.map((p) => ({
          id: String(p.id),
          name: String(p.name),
          sku: String(p.sku),
          category: p.category ? String(p.category) : 'Uncategorized',
          quantity: Number(totals[String(p.id)] ?? 0),
          threshold: Number(p.low_stock_threshold ?? 10),
          unitCostCents: Math.round(Number(p.cost_price ?? 0) * 100),
          status: (p.status ?? 'active') as ProductRow['status'],
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  // Re-apply the filter when the global search submits a new ?q while the
  // page is already mounted (same-route navigation does not remount).
  useEffect(() => {
    setSearch(globalQuery)
    setPage(1)
  }, [globalQuery])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) set.add(r.category)
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (q && !`${row.name} ${row.sku} ${row.category}`.toLowerCase().includes(q)) return false
      if (category !== ALL_CATEGORIES && row.category !== category) return false
      if (statusFilter === 'low' && row.quantity > row.threshold) return false
      if (statusFilter === 'in' && row.quantity <= row.threshold) return false
      return true
    })
  }, [rows, search, category, statusFilter])

  const pageStart = (page - 1) * PER_PAGE
  const pageRows = filtered.slice(pageStart, pageStart + PER_PAGE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))

  async function submitAddSku(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await http.post<{ id?: string }>('/products', {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category.trim() || undefined,
        cost_price: Number(form.cost_price) || 0,
        sell_price: Number(form.sell_price) || 0,
        low_stock_threshold: Number.parseInt(form.low_stock_threshold, 10) || 10,
      })
      track({
        name: 'item.created',
        properties: { id: created.data?.id, sku: form.sku.trim() },
      })
      setAddOpen(false)
      setForm(EMPTY_FORM)
      await loadProducts()
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setSubmitError(apiError ?? (err instanceof Error ? err.message : 'Failed to create SKU'))
    } finally {
      setSubmitting(false)
    }
  }

  async function downloadCsv() {
    setExportError(null)
    try {
      // Fetch as a real file download — backend sets
      // `Content-Disposition: attachment; filename="stock-levels.csv"`,
      // so the browser saves it. We use fetch directly so we can read
      // a Blob (the molecule HttpClient assumes JSON responses).
      const res = await fetch('/api/reports/export/stock', { credentials: 'include' })
      if (!res.ok) {
        setExportError(`Export failed: ${res.status}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'stock-levels.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    }
  }

  return (
    <div className={cm.stack(6)}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('inventory.eyebrow', {}, { defaultValue: 'Live ledger' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('inventory.title', {}, { defaultValue: 'Inventory' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'inventory.subtitle',
              { count: filtered.length },
              { defaultValue: '{{count}} SKUs match your filters' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
          <button
            type="button"
            onClick={downloadCsv}
            data-testid="export-csv-button"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg border border-outline-variant text-on-surface hover:bg-background-secondary',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="download">
              download
            </span>
            {t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            data-testid="add-sku-button"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow shadow-primary/30 hover:opacity-95',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="add">
              add
            </span>
            {t('inventory.actions.add', {}, { defaultValue: 'Add SKU' })}
          </button>
        </div>
      </header>

      <section
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('p', 4),
          'flex-wrap rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'flex-1 min-w-[220px] h-10 rounded-lg border border-outline-variant bg-background-secondary text-sm focus-within:border-primary focus-within:bg-surface',
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
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            data-testid="inventory-search"
            placeholder={t(
              'inventory.searchPlaceholder',
              {},
              { defaultValue: 'Search by name, SKU, or category' },
            )}
            className={cm.cn(
              'w-full bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant',
            )}
            aria-label={t('inventory.searchAria', {}, { defaultValue: 'Search inventory' })}
          />
        </div>
        <FilterSelect
          value={category}
          onChange={(v) => {
            setCategory(v)
            setPage(1)
          }}
          options={[ALL_CATEGORIES, ...categories]}
          icon="category"
          renderLabel={(value) =>
            value === ALL_CATEGORIES
              ? t('inventory.filters.allCategory', {}, { defaultValue: 'All categories' })
              : value
          }
        />
        <FilterSelect
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v as typeof statusFilter)
            setPage(1)
          }}
          options={['all', 'low', 'in']}
          icon="filter_alt"
          renderLabel={(value) =>
            value === 'all'
              ? t('inventory.filters.allStatus', {}, { defaultValue: 'Any stock state' })
              : value === 'low'
                ? t('inventory.filters.lowStatus', {}, { defaultValue: 'Low / Out only' })
                : t('inventory.filters.inStatus', {}, { defaultValue: 'In-stock only' })
          }
        />
      </section>

      {(error || exportError) && (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-lg border border-error/40 bg-error/10 text-sm text-error',
          )}
        >
          {error || exportError}
        </p>
      )}

      <section
        data-testid="inventory-table"
        className={cm.cn(
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
        )}
      >
        <div className={cm.cn('overflow-x-auto')}>
          <table className={cm.cn(cm.w('full'), 'text-left')}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-background-secondary)' }}>
                <Th label={t('inventory.col.sku', {}, { defaultValue: 'SKU' })} />
                <Th label={t('nav.product', {}, { defaultValue: 'Product' })} />
                <Th label={t('form.category', {}, { defaultValue: 'Category' })} />
                <Th label={t('inventory.col.qty', {}, { defaultValue: 'On hand' })} align="right" />
                <Th
                  label={t('inventory.col.cost', {}, { defaultValue: 'Unit cost' })}
                  align="right"
                />
                <Th label={t('nav.status', {}, { defaultValue: 'Status' })} />
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className={cm.cn('px-4 py-6 text-center text-sm text-on-surface-variant')}
                  >
                    {t('inventory.loading', {}, { defaultValue: 'Loading inventory…' })}
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    data-testid="inventory-empty"
                    className={cm.cn('px-4 py-10 text-center text-sm text-on-surface-variant')}
                  >
                    {t(
                      'inventory.emptyState',
                      {},
                      {
                        defaultValue: 'No SKUs yet. Click "Add SKU" to create your first product.',
                      },
                    )}
                  </td>
                </tr>
              )}
              {!loading && rows.length > 0 && pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className={cm.cn('px-4 py-10 text-center text-sm text-on-surface-variant')}
                  >
                    {t('inventory.empty', {}, { defaultValue: 'No SKUs match those filters yet.' })}
                  </td>
                </tr>
              )}
              {pageRows.map((row) => (
                <tr
                  key={row.id}
                  data-testid="inventory-row"
                  className={cm.cn('hover:bg-background-secondary transition-colors')}
                >
                  <td className={cm.cn('px-4 py-3')}>
                    <span
                      className={cm.cn(
                        'font-mono text-sm font-semibold tabular-nums tracking-wide',
                      )}
                      style={{ color: 'var(--color-sku)' }}
                    >
                      {row.sku}
                    </span>
                  </td>
                  <td className={cm.cn('px-4 py-3')}>
                    <Link
                      to={`/products/${row.id}`}
                      data-testid="product-link"
                      className={cm.cn(
                        'block font-semibold text-sm text-on-surface hover:text-primary',
                      )}
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className={cm.cn('px-4 py-3 text-sm text-on-surface-variant')}>
                    {row.category}
                  </td>
                  <td className={cm.cn('px-4 py-3 text-right')}>
                    <span
                      data-testid="row-qty"
                      className={cm.cn('font-mono font-semibold tabular-nums')}
                      style={{
                        color:
                          row.quantity === 0
                            ? 'var(--color-stock-out)'
                            : row.quantity <= row.threshold
                              ? 'var(--color-stock-low)'
                              : 'var(--color-stock-in)',
                      }}
                    >
                      {row.quantity.toLocaleString()}
                    </span>
                    <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                      {t(
                        'inventory.threshold',
                        { qty: row.threshold },
                        { defaultValue: 'reorder @ {{qty}}' },
                      )}
                    </p>
                  </td>
                  <td className={cm.cn('px-4 py-3 text-right font-mono text-sm tabular-nums')}>
                    ${(row.unitCostCents / 100).toFixed(2)}
                  </td>
                  <td className={cm.cn('px-4 py-3')}>
                    <StockBadge quantity={row.quantity} threshold={row.threshold} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'border-t border-outline-variant/40 text-sm text-on-surface-variant',
          )}
        >
          <span>
            {t(
              'inventory.pageStatus',
              {
                from: filtered.length === 0 ? 0 : pageStart + 1,
                to: Math.min(pageStart + PER_PAGE, filtered.length),
                total: filtered.length,
              },
              { defaultValue: '{{from}}–{{to}} of {{total}}' },
            )}
          </span>
          <div className={cm.cn(cm.flex({ gap: 'xs' }))}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={cm.cn(
                'rounded-md border border-outline-variant px-3 py-1 text-xs font-bold uppercase tracking-wider hover:bg-background-secondary disabled:opacity-40',
              )}
            >
              {t('common.previous', {}, { defaultValue: 'Prev' })}
            </button>
            <span
              className={cm.cn(
                'rounded-md border border-outline-variant px-3 py-1 text-xs font-bold tabular-nums text-on-surface',
              )}
            >
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={cm.cn(
                'rounded-md border border-outline-variant px-3 py-1 text-xs font-bold uppercase tracking-wider hover:bg-background-secondary disabled:opacity-40',
              )}
            >
              {t('common.next', {}, { defaultValue: 'Next' })}
            </button>
          </div>
        </footer>
      </section>

      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          setSubmitError(null)
        }}
        title={t('inventory.add.title', {}, { defaultValue: 'Add a new SKU' })}
        description={t(
          'inventory.add.description',
          {},
          { defaultValue: 'Create a product. Adjust stock and assign warehouses afterwards.' },
        )}
      >
        <form onSubmit={submitAddSku} className={cm.stack(3)} data-testid="add-sku-form">
          <Field
            id="add-sku-name"
            label={t('inventory.add.name', {}, { defaultValue: 'Product name' })}
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
          />
          <Field
            id="add-sku-sku"
            label={t('inventory.add.sku', {}, { defaultValue: 'SKU code' })}
            value={form.sku}
            onChange={(v) => setForm({ ...form, sku: v })}
            required
          />
          <Field
            id="add-sku-category"
            label={t('form.category', {}, { defaultValue: 'Category' })}
            value={form.category}
            onChange={(v) => setForm({ ...form, category: v })}
          />
          <div className={cm.cn('grid grid-cols-2 gap-3')}>
            <Field
              id="add-sku-cost"
              label={t('inventory.add.cost', {}, { defaultValue: 'Cost price ($)' })}
              type="number"
              step="0.01"
              value={form.cost_price}
              onChange={(v) => setForm({ ...form, cost_price: v })}
            />
            <Field
              id="add-sku-sell"
              label={t('inventory.add.sell', {}, { defaultValue: 'Sell price ($)' })}
              type="number"
              step="0.01"
              value={form.sell_price}
              onChange={(v) => setForm({ ...form, sell_price: v })}
            />
          </div>
          <Field
            id="add-sku-threshold"
            label={t('inventory.add.threshold', {}, { defaultValue: 'Low stock threshold' })}
            type="number"
            value={form.low_stock_threshold}
            onChange={(v) => setForm({ ...form, low_stock_threshold: v })}
          />
          {submitError && (
            <p
              role="alert"
              className={cm.cn(
                cm.sp('p', 2),
                'rounded-md border border-error/40 bg-error/10 text-xs text-error',
              )}
            >
              {submitError}
            </p>
          )}
          <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), 'pt-2')}>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant text-sm font-semibold text-on-surface hover:bg-background-secondary disabled:opacity-40',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-testid="add-sku-submit"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-sm font-bold text-white shadow shadow-primary/30 hover:opacity-95 disabled:opacity-40',
              )}
            >
              {submitting
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('inventory.add.submit', {}, { defaultValue: 'Create SKU' })}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Th({ label, align = 'left' }: { label: string; align?: 'left' | 'right' }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        'px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {label}
    </th>
  )
}

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  icon: string
  renderLabel?: (value: string) => string
}

function FilterSelect({ value, onChange, options, icon, renderLabel }: FilterSelectProps) {
  const cm = getClassMap()
  return (
    <label
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        'h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface',
      )}
    >
      <span
        className={cm.cn('material-symbols-outlined text-[16px] text-on-surface-variant')}
        data-icon={icon}
      >
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn('bg-transparent border-none outline-none text-sm font-medium pr-2')}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {renderLabel ? renderLabel(option) : option}
          </option>
        ))}
      </select>
    </label>
  )
}

export default Inventory
