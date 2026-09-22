import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Field, SelectField, TextareaField } from '../components/Field.js'
import { InventoryKpiCard } from '../components/InventoryKpiCard.js'
import { Modal } from '../components/Modal.js'

type OrderStatus = 'inbound' | 'outbound' | 'received' | 'shipped' | 'cancelled'

interface ApiOrder {
  id: string
  reference: string
  type: 'inbound' | 'outbound'
  status: OrderStatus
  partner?: string | null
  warehouse_id?: string | null
  warehouse?: { id: string; name: string } | null
  total_units?: number | null
  total_value_cents?: number | null
  expected_at?: string | null
  created_at?: string | null
}

interface ApiWarehouse {
  id: string
  name: string
  code?: string | null
}

interface ApiProduct {
  id: string
  name: string
  sku: string
  cost_price?: number | null
}

interface OrderRow {
  id: string
  reference: string
  partner: string
  type: 'inbound' | 'outbound'
  warehouse: string
  status: OrderStatus
  totalUnits: number
  totalValueCents: number
  expectedAt: string
}

const STATUS_META: Record<
  OrderStatus,
  { labelKey: string; labelDefault: string; tone: { bg: string; text: string } }
> = {
  inbound: {
    labelKey: 'orders.status.inbound',
    labelDefault: 'Inbound',
    tone: { bg: 'var(--color-stock-incoming-bg)', text: 'var(--color-stock-incoming)' },
  },
  outbound: {
    labelKey: 'orders.status.outbound',
    labelDefault: 'Picking',
    tone: { bg: 'var(--color-stock-low-bg)', text: 'var(--color-stock-low)' },
  },
  received: {
    labelKey: 'orders.status.received',
    labelDefault: 'Received',
    tone: { bg: 'var(--color-stock-in-bg)', text: 'var(--color-stock-in)' },
  },
  shipped: {
    labelKey: 'orders.status.shipped',
    labelDefault: 'Shipped',
    tone: { bg: 'var(--color-stock-overstock-bg)', text: 'var(--color-stock-overstock)' },
  },
  cancelled: {
    labelKey: 'orders.status.cancelled',
    labelDefault: 'Cancelled',
    tone: { bg: 'var(--color-stock-out-bg)', text: 'var(--color-stock-out)' },
  },
}

interface CreateForm {
  reference: string
  type: 'inbound' | 'outbound'
  partner: string
  warehouseId: string
  productId: string
  quantity: string
  unitCost: string
  notes: string
  expectedAt: string
}

const EMPTY_FORM: CreateForm = {
  reference: '',
  type: 'inbound',
  partner: '',
  warehouseId: '',
  productId: '',
  quantity: '1',
  unitCost: '0',
  notes: '',
  expectedAt: '',
}

function formatRow(o: ApiOrder, warehouses: Map<string, ApiWarehouse>): OrderRow {
  const warehouseName =
    o.warehouse?.name ??
    (o.warehouse_id ? (warehouses.get(String(o.warehouse_id))?.name ?? '—') : '—')
  return {
    id: String(o.id),
    reference: String(o.reference ?? ''),
    partner: String(o.partner ?? ''),
    type: (o.type ?? 'inbound') as 'inbound' | 'outbound',
    warehouse: warehouseName,
    status: (o.status ?? o.type ?? 'inbound') as OrderStatus,
    totalUnits: Number(o.total_units ?? 0),
    totalValueCents: Number(o.total_value_cents ?? 0),
    expectedAt: o.expected_at ? String(o.expected_at).slice(0, 10) : '—',
  }
}

export function Orders() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [direction, setDirection] = useState<'all' | 'inbound' | 'outbound'>('all')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([])
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create-order modal
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ordersResp, warehousesResp, productsResp] = await Promise.all([
        http.get<ApiOrder[]>('/orders?limit=200'),
        http.get<ApiWarehouse[]>('/warehouses'),
        http.get<ApiProduct[]>('/products?limit=200'),
      ])
      const whList = Array.isArray(warehousesResp.data) ? warehousesResp.data : []
      setWarehouses(whList)
      const psList = Array.isArray(productsResp.data) ? productsResp.data : []
      setProducts(psList)
      const whMap = new Map<string, ApiWarehouse>()
      for (const w of whList) whMap.set(String(w.id), w)
      const list = Array.isArray(ordersResp.data) ? ordersResp.data : []
      setOrders(list.map((o) => formatRow(o, whMap)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = orders.filter((row) => (direction === 'all' ? true : row.type === direction))

  // KPI computation from real data
  const openInbound = orders.filter(
    (o) => o.type === 'inbound' && (o.status === 'inbound' || o.status === 'outbound'),
  ).length
  const openOutbound = orders.filter(
    (o) => o.type === 'outbound' && (o.status === 'outbound' || o.status === 'inbound'),
  ).length
  const shippedReceived = orders.filter(
    (o) => o.status === 'shipped' || o.status === 'received',
  ).length
  const today = new Date().toISOString().slice(0, 10)
  const lateCount = orders.filter(
    (o) =>
      o.expectedAt !== '—' &&
      o.expectedAt < today &&
      (o.status === 'inbound' || o.status === 'outbound'),
  ).length

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      reference: `PO-${Math.floor(Math.random() * 9000 + 1000)}`,
      warehouseId: warehouses[0]?.id ?? '',
      productId: products[0]?.id ?? '',
    })
    setSubmitError(null)
    setCreateOpen(true)
  }

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const product = products.find((p) => String(p.id) === form.productId)
      const qty = Number.parseInt(form.quantity, 10) || 1
      const unitCostCents = Math.round((Number(form.unitCost) || 0) * 100)
      const created = await http.post<{ id?: string }>('/orders', {
        reference: form.reference.trim(),
        type: form.type,
        partner: form.partner.trim() || 'Partner TBD',
        warehouse_id: form.warehouseId,
        notes: form.notes.trim() || undefined,
        expected_at: form.expectedAt || undefined,
        items: [
          {
            product_id: form.productId,
            sku: product?.sku ?? '',
            name: product?.name ?? '',
            expected_quantity: qty,
            unit_cost_cents: unitCostCents,
          },
        ],
      })
      track({
        name: 'order.created',
        properties: { id: created.data?.id, reference: form.reference.trim(), type: form.type },
      })
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setSubmitError(apiError ?? (err instanceof Error ? err.message : 'Failed to create order'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.stack(6)}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('orders.eyebrow', {}, { defaultValue: 'Movement' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('orders.title', {}, { defaultValue: 'Orders' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'orders.subtitle',
              {},
              { defaultValue: 'Inbound POs and outbound SOs across the network.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
          <button
            type="button"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow shadow-primary/30 hover:opacity-95',
            )}
            onClick={openCreate}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="add">
              add
            </span>
            {t('orders.create', {}, { defaultValue: 'Create order' })}
          </button>
        </div>
      </header>

      <section className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4')}>
        <InventoryKpiCard
          label={t('orders.kpis.openInbound', {}, { defaultValue: 'Open inbound' })}
          value={String(openInbound)}
          tone="info"
          icon="local_shipping"
        />
        <InventoryKpiCard
          label={t('orders.kpis.openOutbound', {}, { defaultValue: 'Open outbound' })}
          value={String(openOutbound)}
          tone="warning"
          icon="outbox"
        />
        <InventoryKpiCard
          label={t('orders.kpis.shippedToday', {}, { defaultValue: 'Closed (received/shipped)' })}
          value={String(shippedReceived)}
          tone="success"
          icon="check_circle"
        />
        <InventoryKpiCard
          label={t('orders.kpis.late', {}, { defaultValue: 'Late vs ETA' })}
          value={String(lateCount)}
          tone="error"
          icon="schedule"
        />
      </section>

      <section
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('p', 4),
          'flex-wrap rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
        )}
      >
        {(['all', 'inbound', 'outbound'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setDirection(option)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'rounded-md uppercase tracking-wider transition-colors',
              direction === option
                ? 'bg-primary text-white shadow'
                : 'text-on-surface-variant hover:bg-background-secondary',
            )}
          >
            {t(
              `orders.filter.${option}`,
              {},
              { defaultValue: option[0].toUpperCase() + option.slice(1) },
            )}
          </button>
        ))}
      </section>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            'rounded-lg bg-error-container text-on-error-container px-4 py-3 text-sm',
          )}
        >
          {error}
        </div>
      )}

      <section
        className={cm.cn(
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
        )}
      >
        <div className={cm.cn('overflow-x-auto')}>
          <table className={cm.cn(cm.w('full'), 'text-left')}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-background-secondary)' }}>
                <Th label={t('orders.col.reference', {}, { defaultValue: 'Reference' })} />
                <Th label={t('orders.col.partner', {}, { defaultValue: 'Partner' })} />
                <Th label={t('orders.col.warehouse', {}, { defaultValue: 'Warehouse' })} />
                <Th label={t('orders.col.eta', {}, { defaultValue: 'ETA' })} />
                <Th label={t('orders.col.units', {}, { defaultValue: 'Units' })} align="right" />
                <Th label={t('orders.col.value', {}, { defaultValue: 'Value' })} align="right" />
                <Th label={t('nav.status', {}, { defaultValue: 'Status' })} />
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className={cm.cn('px-4 py-6 text-center text-sm text-on-surface-variant')}
                  >
                    {t('orders.loading', {}, { defaultValue: 'Loading orders…' })}
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className={cm.cn('px-4 py-6 text-center text-sm text-on-surface-variant')}
                  >
                    {t(
                      'orders.empty',
                      {},
                      { defaultValue: 'No orders yet — click Create order to add one.' },
                    )}
                  </td>
                </tr>
              )}
              {filtered.map((row) => {
                const status = STATUS_META[row.status]
                return (
                  <tr
                    key={row.id}
                    className={cm.cn('hover:bg-background-secondary transition-colors')}
                  >
                    <td className={cm.cn('px-4 py-3')}>
                      <Link
                        to={`/orders/${row.id}`}
                        className={cm.cn(
                          'font-mono text-sm font-semibold text-primary hover:underline',
                        )}
                      >
                        {row.reference}
                      </Link>
                      <p
                        className={cm.cn(
                          'text-[11px] text-on-surface-variant uppercase tracking-wider',
                        )}
                      >
                        {row.type === 'inbound'
                          ? t('orders.row.po', {}, { defaultValue: 'Purchase order' })
                          : t('orders.row.so', {}, { defaultValue: 'Sales order' })}
                      </p>
                    </td>
                    <td className={cm.cn('px-4 py-3 text-sm text-on-surface')}>{row.partner}</td>
                    <td className={cm.cn('px-4 py-3 text-sm text-on-surface-variant')}>
                      {row.warehouse}
                    </td>
                    <td className={cm.cn('px-4 py-3 text-sm text-on-surface tabular-nums')}>
                      {row.expectedAt}
                    </td>
                    <td className={cm.cn('px-4 py-3 text-right font-mono text-sm tabular-nums')}>
                      {row.totalUnits}
                    </td>
                    <td className={cm.cn('px-4 py-3 text-right font-mono text-sm tabular-nums')}>
                      $
                      {(row.totalValueCents / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className={cm.cn('px-4 py-3')}>
                      <span
                        className={cm.cn(
                          'inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                        )}
                        style={{ backgroundColor: status?.tone.bg, color: status?.tone.text }}
                      >
                        {t(
                          status?.labelKey ?? 'orders.status.unknown',
                          {},
                          { defaultValue: status?.labelDefault ?? row.status },
                        )}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('orders.create', {}, { defaultValue: 'Create order' })}
      >
        <form onSubmit={submitCreate} className={cm.stack(4)}>
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-3')}>
            <Field
              id="ord-reference"
              label={t('orders.form.reference', {}, { defaultValue: 'Reference' })}
              value={form.reference}
              onChange={(v) => setForm((f) => ({ ...f, reference: v }))}
              required
            />
            <SelectField
              id="ord-type"
              label={t('form.type', {}, { defaultValue: 'Type' })}
              value={form.type}
              onChange={(v) => setForm((f) => ({ ...f, type: v as 'inbound' | 'outbound' }))}
              options={[
                {
                  value: 'inbound',
                  label: t('orders.form.typeInbound', {}, { defaultValue: 'Inbound (PO)' }),
                },
                {
                  value: 'outbound',
                  label: t('orders.form.typeOutbound', {}, { defaultValue: 'Outbound (SO)' }),
                },
              ]}
              required
            />
            <Field
              id="ord-partner"
              label={t('orders.form.partner', {}, { defaultValue: 'Partner' })}
              value={form.partner}
              onChange={(v) => setForm((f) => ({ ...f, partner: v }))}
              required
            />
            <SelectField
              id="ord-warehouse"
              label={t('orders.form.warehouse', {}, { defaultValue: 'Warehouse' })}
              value={form.warehouseId}
              onChange={(v) => setForm((f) => ({ ...f, warehouseId: v }))}
              options={warehouses.map((w) => ({ value: String(w.id), label: w.name }))}
              required
              placeholder={t('orders.form.warehousePh', {}, { defaultValue: 'Pick a warehouse' })}
            />
            <SelectField
              id="ord-product"
              label={t('nav.product', {}, { defaultValue: 'Product' })}
              value={form.productId}
              onChange={(v) => setForm((f) => ({ ...f, productId: v }))}
              options={products.map((p) => ({
                value: String(p.id),
                label: `${p.sku} — ${p.name}`,
              }))}
              required
              placeholder={t('orders.form.productPh', {}, { defaultValue: 'Pick a product' })}
            />
            <Field
              id="ord-quantity"
              label={t('orders.form.quantity', {}, { defaultValue: 'Quantity' })}
              type="number"
              value={form.quantity}
              onChange={(v) => setForm((f) => ({ ...f, quantity: v }))}
              min="1"
              required
            />
            <Field
              id="ord-unit-cost"
              label={t('orders.form.unitCost', {}, { defaultValue: 'Unit cost ($)' })}
              type="number"
              value={form.unitCost}
              onChange={(v) => setForm((f) => ({ ...f, unitCost: v }))}
              step="0.01"
              min="0"
            />
            <Field
              id="ord-eta"
              label={t('orders.form.eta', {}, { defaultValue: 'Expected at' })}
              value={form.expectedAt}
              onChange={(v) => setForm((f) => ({ ...f, expectedAt: v }))}
            />
          </div>
          <TextareaField
            id="ord-notes"
            label={t('form.notes', {}, { defaultValue: 'Notes' })}
            value={form.notes}
            onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
            rows={2}
          />

          {submitError && (
            <div
              role="alert"
              className={cm.cn(
                'rounded-lg bg-error-container text-on-error-container px-4 py-3 text-sm',
              )}
            >
              {submitError}
            </div>
          )}

          <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant text-on-surface hover:bg-background-secondary',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={
                submitting || !form.reference.trim() || !form.warehouseId || !form.productId
              }
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-lg bg-primary text-white hover:opacity-95 disabled:opacity-60',
              )}
            >
              {submitting
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('orders.form.submit', {}, { defaultValue: 'Create order' })}
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

export default Orders
