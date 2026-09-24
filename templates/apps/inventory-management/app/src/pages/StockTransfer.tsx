import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { InventoryKpiCard } from '../components/InventoryKpiCard.js'

interface ApiWarehouse {
  id: string
  name: string
  code: string
}

interface ApiProduct {
  id: string
  name: string
  sku: string
}

interface ApiTransfer {
  id: string
  from_warehouse_id: string
  to_warehouse_id: string
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
  completed_at?: string | null
}

interface ScannedLine {
  uid: string
  productId: string
  sku: string
  name: string
  quantity: number
}

export function StockTransfer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([])
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [transfers, setTransfers] = useState<ApiTransfer[]>([])
  const [source, setSource] = useState<string>('')
  const [destination, setDestination] = useState<string>('')
  const [lines, setLines] = useState<ScannedLine[]>([])
  const [scan, setScan] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [committing, setCommitting] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const productMap = useMemo(() => {
    const map = new Map<string, ApiProduct>()
    for (const p of products) {
      map.set(String(p.sku).toUpperCase(), p)
      map.set(String(p.id), p)
    }
    return map
  }, [products])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [wh, ps, tr] = await Promise.all([
        http.get<ApiWarehouse[]>('/warehouses'),
        http.get<ApiProduct[]>('/products?limit=200'),
        http.get<ApiTransfer[]>('/transfers?limit=20'),
      ])
      const whList = Array.isArray(wh.data) ? wh.data : []
      setWarehouses(whList)
      setProducts(Array.isArray(ps.data) ? ps.data : [])
      setTransfers(Array.isArray(tr.data) ? tr.data : [])
      if (whList.length >= 1) {
        setSource((prev) => prev || String(whList[0].id))
        setDestination((prev) => prev || String(whList[1]?.id ?? whList[0].id))
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load transfers')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void load()
  }, [load])

  function addScan(e: React.FormEvent) {
    e.preventDefault()
    setScanError(null)
    const trimmed = scan.trim().toUpperCase()
    if (!trimmed) return
    const product = productMap.get(trimmed)
    if (!product) {
      setScanError(
        t(
          'stockTransfer.unknownSku',
          { sku: trimmed },
          { defaultValue: 'No product matches "{{sku}}"' },
        ),
      )
      return
    }
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [
        ...prev,
        {
          uid: `${product.id}-${Date.now()}`,
          productId: String(product.id),
          sku: String(product.sku),
          name: String(product.name),
          quantity: 1,
        },
      ]
    })
    setScan('')
  }

  function updateQty(uid: string, qty: number) {
    // parseInt('') is NaN and Math.max(1, NaN) stays NaN — fall back to 1 so a
    // cleared input never renders "NaN" in the manifest.
    setLines((prev) =>
      prev.map((l) =>
        l.uid === uid ? { ...l, quantity: Number.isFinite(qty) ? Math.max(1, qty) : 1 } : l,
      ),
    )
  }

  function removeLine(uid: string) {
    setLines((prev) => prev.filter((l) => l.uid !== uid))
  }

  async function commitTransfer() {
    setCommitError(null)
    setFeedback(null)
    if (lines.length === 0) {
      setCommitError(
        t('stockTransfer.empty', {}, { defaultValue: 'Add at least one SKU before committing.' }),
      )
      return
    }
    if (source === destination) {
      setCommitError(
        t(
          'stockTransfer.sameWarehouse',
          {},
          { defaultValue: 'Source and destination warehouses must differ.' },
        ),
      )
      return
    }
    setCommitting(true)
    try {
      const created = await http.post<{ id?: string }>('/transfers', {
        from_warehouse_id: source,
        to_warehouse_id: destination,
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
      })
      track({
        name: 'transfer.created',
        properties: {
          id: created.data?.id,
          from_warehouse_id: source,
          to_warehouse_id: destination,
          line_count: lines.length,
        },
      })
      setLines([])
      setNotes('')
      setFeedback(
        t(
          'stockTransfer.committed',
          {},
          { defaultValue: 'Transfer created — mark complete to move stock.' },
        ),
      )
      await load()
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setCommitError(apiError ?? (err instanceof Error ? err.message : 'Failed to create transfer'))
    } finally {
      setCommitting(false)
    }
  }

  async function actOnTransfer(id: string, action: 'complete' | 'cancel') {
    setActingId(id)
    setCommitError(null)
    try {
      await http.post(`/transfers/${id}/${action}`, {})
      // Completing posts the stock movements to both warehouses atomically —
      // the stock.adjusted funnel for rebalancing.
      if (action === 'complete') {
        track({ name: 'stock.adjusted', properties: { id, reason: 'transfer' } })
      }
      await load()
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setCommitError(
        apiError ?? (err instanceof Error ? err.message : `Failed to ${action} the transfer`),
      )
    } finally {
      setActingId(null)
    }
  }

  const sourceName = warehouses.find((w) => w.id === source)?.name ?? '—'
  const destName = warehouses.find((w) => w.id === destination)?.name ?? '—'

  return (
    <div className={cm.stack(6)}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('stockTransfer.eyebrow', {}, { defaultValue: 'Network rebalance' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('stockTransfer.title', {}, { defaultValue: 'Stock transfers' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'stockTransfer.subtitle',
              {},
              {
                defaultValue:
                  'Pick a source, scan SKUs into the cart, then commit the manifest. Movements post live to both warehouses on completion.',
              },
            )}
          </p>
        </div>
      </header>

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      )}

      {!loading && loadError && (
        // data-testid rides along as a rest prop so the spec locator keeps
        // working; the banner owns the retry pending/disabled state.
        <LoadErrorBanner
          data-testid="transfers-load-error"
          message={loadError}
          retryLabel={t('common.retry', {}, { defaultValue: 'Retry' })}
          onRetry={load}
        />
      )}

      {!loading && !loadError && warehouses.length < 2 && (
        <div
          data-testid="transfers-needs-warehouses"
          className={cm.cn(
            cm.stack(2),
            cm.sp('p', 6),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          )}
        >
          <p className={cm.cn(cm.textSize('lg'), 'font-bold')}>
            {t(
              'stockTransfer.needWarehouses.title',
              {},
              { defaultValue: 'You need at least two warehouses' },
            )}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'stockTransfer.needWarehouses.body',
              {},
              {
                defaultValue:
                  'Create source and destination warehouses first, then come back here to scan a manifest.',
              },
            )}
          </p>
          <Link
            to="/warehouses"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'self-start rounded-lg bg-gradient-to-br from-primary to-primary-dark text-sm font-bold text-white shadow shadow-primary/30 hover:opacity-95',
            )}
          >
            {t('stockTransfer.openWarehouses', {}, { defaultValue: 'Open warehouses' })}
          </Link>
        </div>
      )}

      {!loading && !loadError && warehouses.length >= 2 && (
        <>
          <section className={cm.cn('grid lg:grid-cols-3 gap-4')}>
            <InventoryKpiCard
              label={t('stockTransfer.kpis.scanned', {}, { defaultValue: 'Lines scanned' })}
              value={String(lines.length)}
              tone="primary"
              icon="barcode_reader"
            />
            <InventoryKpiCard
              label={t('stockTransfer.kpis.units', {}, { defaultValue: 'Units in manifest' })}
              value={lines.reduce((sum, l) => sum + l.quantity, 0).toString()}
              tone="info"
              icon="local_shipping"
            />
            <InventoryKpiCard
              label={t('stockTransfer.kpis.route', {}, { defaultValue: 'Route' })}
              value={`${sourceName} → ${destName}`}
              tone="success"
              icon="route"
            />
          </section>

          <section
            data-testid="transfers-create"
            className={cm.cn(
              cm.stack(5),
              cm.sp('p', 6),
              'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
            )}
          >
            <header className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
              <Selector
                label={t('stockTransfer.source', {}, { defaultValue: 'Source warehouse' })}
                value={source}
                onChange={setSource}
                options={warehouses}
                icon="warehouse"
                testId="transfer-source"
              />
              <span
                className={cm.cn('material-symbols-outlined text-on-surface-variant')}
                data-icon="arrow_forward"
                aria-hidden="true"
              >
                arrow_forward
              </span>
              <Selector
                label={t(
                  'stockTransfer.destination',
                  {},
                  { defaultValue: 'Destination warehouse' },
                )}
                value={destination}
                onChange={setDestination}
                options={warehouses}
                icon="location_on"
                testId="transfer-destination"
              />
            </header>

            <form
              onSubmit={addScan}
              data-testid="scan-form"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('p', 4),
                // Wrap on narrow screens so the commit button never gets
                // pushed past the viewport edge (flex-nowrap overflowed 390px).
                'flex-wrap rounded-xl border border-dashed border-primary/40 bg-primary/5',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[28px] text-primary')}
                data-icon="qr_code_scanner"
                aria-hidden="true"
              >
                qr_code_scanner
              </span>
              <input
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                data-testid="scan-input"
                placeholder={t(
                  'stockTransfer.scanPlaceholder',
                  {},
                  { defaultValue: 'Scan an SKU or barcode and press Enter' },
                )}
                className={cm.cn(
                  'min-w-0 flex-1 bg-transparent border-none outline-none text-base font-mono text-on-surface placeholder:text-on-surface-variant',
                )}
              />
              <button
                type="submit"
                data-testid="scan-add-button"
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
                {t('stockTransfer.add', {}, { defaultValue: 'Add to manifest' })}
              </button>
            </form>

            {scanError && (
              <p role="alert" className={cm.cn('text-xs text-error')}>
                {scanError}
              </p>
            )}

            <div className={cm.cn('overflow-x-auto')}>
              <table className={cm.cn(cm.w('full'), 'text-left')}>
                <thead>
                  <tr
                    className={cm.cn(
                      'border-b border-outline-variant/40 text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant',
                    )}
                  >
                    <th className={cm.cn('py-2')}>
                      {t('stockTransfer.col.sku', {}, { defaultValue: 'SKU' })}
                    </th>
                    <th className={cm.cn('py-2')}>
                      {t('nav.product', {}, { defaultValue: 'Product' })}
                    </th>
                    <th className={cm.cn('py-2 text-right')}>
                      {t('stockTransfer.col.qty', {}, { defaultValue: 'Qty' })}
                    </th>
                    <th className={cm.cn('py-2 text-right')}>
                      {t('common.remove', {}, { defaultValue: 'Remove' })}
                    </th>
                  </tr>
                </thead>
                <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
                  {lines.map((line) => (
                    <tr key={line.uid} data-testid="manifest-line">
                      <td
                        className={cm.cn('py-3 font-mono text-sm')}
                        style={{ color: 'var(--color-sku)' }}
                      >
                        {line.sku}
                      </td>
                      <td className={cm.cn('py-3 text-sm text-on-surface')}>{line.name}</td>
                      <td className={cm.cn('py-3 text-right')}>
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => updateQty(line.uid, Number.parseInt(e.target.value, 10))}
                          className={cm.cn(
                            'w-20 text-right tabular-nums rounded-md border border-outline-variant bg-background-secondary px-2 py-1 text-sm focus:border-primary outline-none',
                          )}
                          data-testid="line-qty"
                        />
                      </td>
                      <td className={cm.cn('py-3 text-right')}>
                        <button
                          type="button"
                          onClick={() => removeLine(line.uid)}
                          aria-label={t('common.remove', {}, { defaultValue: 'Remove' })}
                          className={cm.cn(
                            'h-7 w-7 rounded-full',
                            cm.flex({ align: 'center', justify: 'center' }),
                            'text-on-surface-variant hover:bg-background-secondary hover:text-error',
                          )}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined text-[18px]')}
                            data-icon="delete"
                          >
                            delete
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className={cm.cn('py-8 text-center text-sm text-on-surface-variant')}
                      >
                        {t(
                          'stockTransfer.linesEmpty',
                          {},
                          {
                            defaultValue: 'No lines yet — scan an SKU above to start the manifest.',
                          },
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t(
                'stockTransfer.notesPlaceholder',
                {},
                { defaultValue: 'Optional notes — e.g. "Cross-dock weekly rebalance"' },
              )}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-background-secondary text-sm text-on-surface focus:border-primary focus:bg-surface outline-none',
              )}
              data-testid="transfer-notes"
            />

            {commitError && (
              <p role="alert" className={cm.cn('text-xs text-error')}>
                {commitError}
              </p>
            )}
            {feedback && (
              <p
                data-testid="transfer-feedback"
                role="status"
                className={cm.cn(
                  cm.sp('p', 2),
                  'rounded-md border border-success/40 bg-success/10 text-xs',
                )}
                style={{ color: 'var(--color-stock-in)' }}
              >
                {feedback}
              </p>
            )}

            <footer
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                'flex-wrap',
              )}
            >
              <p className={cm.cn('text-xs text-on-surface-variant')}>
                {t(
                  'stockTransfer.confirmation',
                  {},
                  {
                    defaultValue: 'Movements post atomically when the transfer is marked complete.',
                  },
                )}
              </p>
              <button
                type="button"
                onClick={commitTransfer}
                disabled={committing || lines.length === 0}
                data-testid="commit-transfer-button"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-lg bg-secondary text-white shadow hover:opacity-95 disabled:opacity-40 transition-opacity',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[18px]')}
                  data-icon="local_shipping"
                >
                  local_shipping
                </span>
                {committing
                  ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                  : t('stockTransfer.commit', {}, { defaultValue: 'Commit transfer' })}
              </button>
            </footer>
          </section>

          <section
            data-testid="transfers-list"
            className={cm.cn(
              cm.stack(2),
              'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
            )}
          >
            <header
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 6),
                cm.sp('pt', 6),
              )}
            >
              <div className={cm.stack(1)}>
                <p
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
                  )}
                >
                  {t('stockTransfer.list.eyebrow', {}, { defaultValue: 'Manifest log' })}
                </p>
                <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                  {t('stockTransfer.list.title', {}, { defaultValue: 'Recent transfers' })}
                </h2>
              </div>
              <Link
                to="/notifications"
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:underline',
                )}
              >
                {t('stockTransfer.list.viewMovements', {}, { defaultValue: 'View movements' })}
              </Link>
            </header>
            <div className={cm.cn('divide-y divide-outline-variant/40')}>
              {transfers.length === 0 && (
                <p className={cm.cn(cm.sp('p', 6), 'text-sm text-on-surface-variant')}>
                  {t(
                    'stockTransfer.list.empty',
                    {},
                    { defaultValue: 'No transfers yet — create one above.' },
                  )}
                </p>
              )}
              {transfers.map((tr) => {
                const fromName =
                  warehouses.find((w) => w.id === tr.from_warehouse_id)?.name ??
                  tr.from_warehouse_id
                const toName =
                  warehouses.find((w) => w.id === tr.to_warehouse_id)?.name ?? tr.to_warehouse_id
                const isPending = tr.status === 'pending' || tr.status === 'in_transit'
                return (
                  <div
                    key={tr.id}
                    data-testid="transfer-row"
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                      cm.sp('px', 6),
                      cm.sp('py', 4),
                    )}
                  >
                    <div className={cm.stack(1)}>
                      <p className={cm.cn('text-sm font-bold text-on-surface')}>
                        {fromName} → {toName}
                      </p>
                      <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                        {new Date(tr.created_at).toLocaleString()} ·{' '}
                        {tr.notes ||
                          t('stockTransfer.list.noNotes', {}, { defaultValue: 'No notes' })}
                      </p>
                    </div>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <span
                        data-testid="transfer-status"
                        data-status={tr.status}
                        className={cm.cn(
                          'inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                        )}
                        style={
                          tr.status === 'completed'
                            ? {
                                backgroundColor: 'var(--color-stock-in-bg)',
                                color: 'var(--color-stock-in)',
                              }
                            : tr.status === 'cancelled'
                              ? {
                                  backgroundColor: 'var(--color-stock-out-bg)',
                                  color: 'var(--color-stock-out)',
                                }
                              : {
                                  backgroundColor: 'var(--color-stock-incoming-bg)',
                                  color: 'var(--color-stock-incoming)',
                                }
                        }
                      >
                        {t(
                          `stockTransfer.status.${tr.status}`,
                          {},
                          { defaultValue: tr.status[0].toUpperCase() + tr.status.slice(1) },
                        )}
                      </span>
                      {isPending && (
                        <>
                          <button
                            type="button"
                            disabled={actingId === tr.id}
                            data-testid="transfer-complete-button"
                            onClick={() => actOnTransfer(tr.id, 'complete')}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              'min-h-[36px] rounded-md text-[10px] font-black uppercase tracking-wider text-primary border border-primary/40 hover:bg-primary/10 disabled:opacity-40',
                            )}
                          >
                            {t('stockTransfer.complete', {}, { defaultValue: 'Complete' })}
                          </button>
                          <button
                            type="button"
                            disabled={actingId === tr.id}
                            data-testid="transfer-cancel-button"
                            onClick={() => actOnTransfer(tr.id, 'cancel')}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              'min-h-[36px] rounded-md text-[10px] font-black uppercase tracking-wider text-on-surface-variant border border-outline-variant hover:text-error hover:border-error/40 disabled:opacity-40',
                            )}
                          >
                            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

interface SelectorProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: ApiWarehouse[]
  icon: string
  testId?: string
}

function Selector({ label, value, onChange, options, icon, testId }: SelectorProps) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.stack(1), 'flex-1 min-w-[200px]')}>
      <span
        className={cm.cn('text-[10px] font-bold uppercase tracking-wider text-on-surface-variant')}
      >
        {label}
      </span>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('px', 3),
          'h-11 rounded-lg border border-outline-variant bg-background-secondary text-sm text-on-surface',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-[18px] text-on-surface-variant')}
          data-icon={icon}
        >
          {icon}
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
          className={cm.cn('flex-1 bg-transparent border-none outline-none text-sm font-semibold')}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.code})
            </option>
          ))}
        </select>
      </div>
    </label>
  )
}

export default StockTransfer
