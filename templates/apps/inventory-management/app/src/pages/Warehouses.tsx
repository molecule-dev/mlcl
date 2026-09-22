import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Field } from '../components/Field.js'
import { Modal } from '../components/Modal.js'

interface ApiWarehouse {
  id: string
  name: string
  code: string
  city?: string
  country?: string
  capacity?: number | null
  contact_name?: string
  contact_email?: string
  status?: 'active' | 'inactive'
}

interface Warehouse {
  id: string
  name: string
  code: string
  city: string
  country: string
  capacity: number
  contact: string
  status: 'active' | 'inactive'
}

interface WarehouseSummary extends Warehouse {
  used: number
  skuCount: number
}

interface AddForm {
  name: string
  code: string
  city: string
  country: string
  capacity: string
  contact_name: string
  contact_email: string
}

const EMPTY: AddForm = {
  name: '',
  code: '',
  city: '',
  country: '',
  capacity: '',
  contact_name: '',
  contact_email: '',
}

export function Warehouses() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [items, setItems] = useState<WarehouseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<AddForm>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await http.get<ApiWarehouse[]>('/warehouses')
      const list = Array.isArray(resp.data) ? resp.data : []
      // Pull stock summaries per warehouse from valuation (1 round-trip).
      const valuation = await http
        .get<{
          items?: Array<{ warehouse_id?: string; quantity?: number; product_id?: string }>
        }>('/reports/valuation')
        .catch(() => ({ data: { items: [] } }))
      const usedByWh: Record<string, number> = {}
      const skuByWh: Record<string, Set<string>> = {}
      for (const item of valuation.data?.items ?? []) {
        const wid = String(item.warehouse_id ?? '')
        if (!wid) continue
        usedByWh[wid] = (usedByWh[wid] ?? 0) + Number(item.quantity ?? 0)
        if (!skuByWh[wid]) skuByWh[wid] = new Set()
        if (item.product_id) skuByWh[wid].add(String(item.product_id))
      }

      setItems(
        list.map((w) => ({
          id: String(w.id),
          name: String(w.name),
          code: String(w.code),
          city: String(w.city ?? ''),
          country: String(w.country ?? ''),
          capacity: Number(w.capacity ?? 0),
          contact: w.contact_name ? String(w.contact_name) : '',
          status: (w.status ?? 'active') as Warehouse['status'],
          used: usedByWh[String(w.id)] ?? 0,
          skuCount: skuByWh[String(w.id)]?.size ?? 0,
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void load()
  }, [load])

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        code: form.code.trim(),
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
        contact_name: form.contact_name.trim() || undefined,
      }
      if (form.contact_email.trim()) payload.contact_email = form.contact_email.trim()
      if (form.capacity.trim()) {
        const cap = Number.parseInt(form.capacity, 10)
        if (Number.isFinite(cap) && cap > 0) payload.capacity = cap
      }
      const created = await http.post<{ id?: string }>('/warehouses', payload)
      track({
        name: 'warehouse.created',
        properties: { id: created.data?.id, code: form.code.trim() },
      })
      setAddOpen(false)
      setForm(EMPTY)
      await load()
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setSubmitError(apiError ?? (err instanceof Error ? err.message : 'Failed to add warehouse'))
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
            {t('settings.network', {}, { defaultValue: 'Network' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('warehouses.title', {}, { defaultValue: 'Warehouses' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'warehouses.subtitle',
              { count: items.length },
              { defaultValue: '{{count}} sites · capacity, staff, and SKU coverage' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="add-warehouse-button"
          onClick={() => setAddOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow shadow-primary/30 hover:opacity-95',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="add_business">
            add_business
          </span>
          {t('warehouses.add', {}, { defaultValue: 'Add warehouse' })}
        </button>
      </header>

      {error && (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-lg border border-error/40 bg-error/10 text-sm text-error',
          )}
        >
          {error}
        </p>
      )}

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('warehouses.loading', {}, { defaultValue: 'Loading warehouse network…' })}
        </p>
      )}

      {!loading && items.length === 0 && (
        <div
          data-testid="warehouses-empty"
          className={cm.cn(
            cm.stack(2),
            cm.sp('p', 8),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest text-center',
          )}
        >
          <p className={cm.cn(cm.textSize('lg'), 'font-bold text-on-surface')}>
            {t('warehouses.emptyTitle', {}, { defaultValue: 'No warehouses yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'warehouses.emptyBody',
              {},
              { defaultValue: 'Add your first site to start tracking stock.' },
            )}
          </p>
        </div>
      )}

      <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4')}>
        {items.map((w) => {
          const utilization = w.capacity > 0 ? Math.min(100, (w.used / w.capacity) * 100) : 0
          const utilizationTone =
            utilization >= 90
              ? 'var(--color-stock-out)'
              : utilization >= 70
                ? 'var(--color-stock-low)'
                : 'var(--color-stock-in)'
          return (
            <article
              key={w.id}
              data-testid="warehouse-card"
              className={cm.cn(
                cm.stack(4),
                cm.sp('p', 6),
                'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest hover:border-primary/30 hover:shadow-md transition-all',
              )}
            >
              <header className={cm.cn(cm.flex({ align: 'start', justify: 'between' }))}>
                <div className={cm.stack(1)}>
                  <Link
                    to={`/warehouses/${w.id}`}
                    className={cm.cn(
                      cm.textSize('lg'),
                      'font-extrabold text-on-surface hover:text-primary',
                    )}
                  >
                    {w.name}
                  </Link>
                  <p
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      'text-xs text-on-surface-variant',
                    )}
                  >
                    <span className={cm.cn('font-mono')}>{w.code}</span>
                    {w.city && <span>· {w.city}</span>}
                    {w.country && <span>· {w.country}</span>}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                  )}
                  style={
                    w.status === 'active'
                      ? {
                          backgroundColor: 'var(--color-stock-in-bg)',
                          color: 'var(--color-stock-in)',
                        }
                      : {
                          backgroundColor: 'var(--color-stock-reserved-bg)',
                          color: 'var(--color-stock-reserved)',
                        }
                  }
                >
                  {t(`warehouses.status.${w.status}`, {}, { defaultValue: w.status })}
                </span>
              </header>

              {w.capacity > 0 ? (
                <div className={cm.stack(2)}>
                  <div
                    className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'text-xs')}
                  >
                    <span
                      className={cm.cn(
                        'font-semibold uppercase tracking-wider text-on-surface-variant',
                      )}
                    >
                      {t('warehouses.utilization', {}, { defaultValue: 'Utilization' })}
                    </span>
                    <span
                      className={cm.cn('font-mono font-bold tabular-nums')}
                      style={{ color: utilizationTone }}
                    >
                      {utilization.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      'h-2 w-full overflow-hidden rounded-full bg-background-secondary',
                    )}
                  >
                    <div
                      className={cm.cn('h-full rounded-full transition-all')}
                      style={{ width: `${utilization}%`, backgroundColor: utilizationTone }}
                    />
                  </div>
                  <p className={cm.cn('text-[11px] text-on-surface-variant tabular-nums')}>
                    {t(
                      'warehouses.capacity',
                      { used: w.used.toLocaleString(), capacity: w.capacity.toLocaleString() },
                      { defaultValue: '{{used}} / {{capacity}} units' },
                    )}
                  </p>
                </div>
              ) : (
                <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                  {t(
                    'warehouses.noCapacity',
                    { used: w.used.toLocaleString() },
                    { defaultValue: '{{used}} units on hand · capacity not set' },
                  )}
                </p>
              )}

              <footer
                className={cm.cn(
                  'grid grid-cols-2 gap-3 border-t border-outline-variant/40 pt-4 text-xs',
                )}
              >
                <div>
                  <p
                    className={cm.cn(
                      'text-[10px] font-bold uppercase tracking-wider text-on-surface-variant',
                    )}
                  >
                    {t('warehouses.skus', {}, { defaultValue: 'SKUs' })}
                  </p>
                  <p className={cm.cn('text-lg font-extrabold tabular-nums text-on-surface')}>
                    {w.skuCount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p
                    className={cm.cn(
                      'text-[10px] font-bold uppercase tracking-wider text-on-surface-variant',
                    )}
                  >
                    {t('nav.contact', {}, { defaultValue: 'Contact' })}
                  </p>
                  <p className={cm.cn('text-sm font-semibold text-on-surface truncate')}>
                    {w.contact || '—'}
                  </p>
                </div>
              </footer>
            </article>
          )
        })}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('warehouses.add.title', {}, { defaultValue: 'Add a new warehouse' })}
        description={t(
          'warehouses.add.description',
          {},
          { defaultValue: 'Register a site so you can route receivals, transfers, and stock.' },
        )}
      >
        <form onSubmit={submitAdd} className={cm.stack(3)} data-testid="add-warehouse-form">
          <Field
            id="add-wh-name"
            label={t('form.name', {}, { defaultValue: 'Name' })}
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
          />
          <Field
            id="add-wh-code"
            label={t('warehouses.add.code', {}, { defaultValue: 'Code (unique)' })}
            value={form.code}
            onChange={(v) => setForm({ ...form, code: v })}
            required
            hint={t(
              'warehouses.add.codeHint',
              {},
              { defaultValue: 'A short identifier — e.g. RENO-1, MEM-DC' },
            )}
          />
          <div className={cm.cn('grid grid-cols-2 gap-3')}>
            <Field
              id="add-wh-city"
              label={t('warehouses.add.city', {}, { defaultValue: 'City' })}
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
            />
            <Field
              id="add-wh-country"
              label={t('warehouses.add.country', {}, { defaultValue: 'Country' })}
              value={form.country}
              onChange={(v) => setForm({ ...form, country: v })}
            />
          </div>
          <Field
            id="add-wh-capacity"
            label={t('warehouses.add.capacity', {}, { defaultValue: 'Capacity (units)' })}
            type="number"
            value={form.capacity}
            onChange={(v) => setForm({ ...form, capacity: v })}
            hint={t(
              'warehouses.add.capacityHint',
              {},
              { defaultValue: 'Optional — used for utilization charts.' },
            )}
          />
          <Field
            id="add-wh-contact-name"
            label={t('warehouses.add.contactName', {}, { defaultValue: 'Contact name' })}
            value={form.contact_name}
            onChange={(v) => setForm({ ...form, contact_name: v })}
          />
          <Field
            id="add-wh-contact-email"
            label={t('warehouses.add.contactEmail', {}, { defaultValue: 'Contact email' })}
            type="email"
            value={form.contact_email}
            onChange={(v) => setForm({ ...form, contact_email: v })}
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
              data-testid="add-warehouse-submit"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-sm font-bold text-white shadow shadow-primary/30 hover:opacity-95 disabled:opacity-40',
              )}
            >
              {submitting
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('warehouses.add.submit', {}, { defaultValue: 'Add warehouse' })}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Warehouses
