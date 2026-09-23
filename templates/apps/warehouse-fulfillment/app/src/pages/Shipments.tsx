import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FulfillmentKpiCard } from '../components/FulfillmentKpiCard.js'
import { type CarrierId, useDefaultCarrier } from '../lib/preferences.js'

interface ApiShipment {
  id: string
  manifest_number?: string | null
  tracking_number?: string | null
  carrier?: string | null
  service?: string | null
  dock?: string | null
  weight_oz?: number | null
  status?: string
  cutoff_at?: string | null
  created_at?: string
}

const STATE_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  label_created: {
    label: 'Staged',
    bg: 'var(--color-order-pending-bg)',
    color: 'var(--color-order-pending)',
    icon: 'inventory_2',
  },
  in_transit: {
    label: 'In transit',
    bg: 'var(--color-order-picking-bg)',
    color: 'var(--color-order-picking)',
    icon: 'local_shipping',
  },
  delivered: {
    label: 'Delivered',
    bg: 'var(--color-order-shipped-bg)',
    color: 'var(--color-order-shipped)',
    icon: 'check_circle',
  },
  exception: {
    label: 'Exception',
    bg: 'var(--color-stock-out-bg)',
    color: 'var(--color-stock-out)',
    icon: 'error',
  },
}

export function Shipments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<ApiShipment[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const defaultCarrier = useDefaultCarrier()
  const [carrier, setCarrier] = useState<CarrierId>(defaultCarrier)
  const [showForm, setShowForm] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await http.get<ApiShipment[]>('/shipments')
      const data = res.data
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await http.get<ApiShipment[]>('/shipments')
        if (cancelled) return
        const data = res.data
        setRows(Array.isArray(data) ? data : [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      await http.post('/shipments', {
        carrier,
        weight_oz: 16,
        status: 'label_created',
      })
      void track({ name: 'shipment.created', properties: { carrier } })
      setShowForm(false)
      await refresh()
    } finally {
      setCreating(false)
    }
  }

  const stats = {
    staged: rows.filter((r) => r.status === 'label_created').length,
    transit: rows.filter((r) => r.status === 'in_transit').length,
    delivered: rows.filter((r) => r.status === 'delivered').length,
    weight: rows.reduce((s, r) => s + Number(r.weight_oz ?? 0) / 16, 0),
  }

  return (
    <div className={cm.stack(8)} data-testid="shipments-page">
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('shipments.eyebrow', {}, { defaultValue: 'Outbound shipments' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('shipments.title', {}, { defaultValue: 'Manifests' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'shipments.subtitle',
              { count: rows.length },
              { defaultValue: '{{count}} manifests in motion' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          data-testid="shipments-new-toggle"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-lg bg-primary text-on-primary shadow shadow-primary/30 hover:opacity-95',
          )}
        >
          {showForm
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('shipments.new', {}, { defaultValue: 'New manifest' })}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ gap: 'sm' }),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest items-end flex-wrap',
          )}
          data-testid="shipments-new-form"
        >
          <label className={cm.stack(1)}>
            <span
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('shipments.carrier', {}, { defaultValue: 'Carrier' })}
            </span>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value as 'usps' | 'ups' | 'fedex' | 'dhl')}
              data-testid="shipments-carrier"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            >
              <option value="usps">USPS</option>
              <option value="ups">UPS</option>
              <option value="fedex">FedEx</option>
              <option value="dhl">DHL</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={creating}
            data-testid="shipments-create-submit"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg bg-primary text-on-primary hover:opacity-95 disabled:opacity-50',
            )}
          >
            {t('shipments.create', {}, { defaultValue: 'Create label' })}
          </button>
        </form>
      )}

      <section className={cm.cn('grid grid-cols-2 sm:grid-cols-4 gap-4')}>
        <FulfillmentKpiCard
          label={t('shipments.kpis.staged', {}, { defaultValue: 'Staged' })}
          value={String(stats.staged)}
          tone="pending"
          icon="inventory"
        />
        <FulfillmentKpiCard
          label={t('shipments.kpis.transit', {}, { defaultValue: 'In transit' })}
          value={String(stats.transit)}
          tone="picking"
          icon="local_shipping"
        />
        <FulfillmentKpiCard
          label={t('shipments.kpis.delivered', {}, { defaultValue: 'Delivered' })}
          value={String(stats.delivered)}
          tone="shipped"
          icon="check_circle"
        />
        <FulfillmentKpiCard
          label={t('shipments.kpis.weight', {}, { defaultValue: 'Weight (lb)' })}
          value={stats.weight.toFixed(1)}
          tone="primary"
          icon="scale"
        />
      </section>

      <article
        className={cm.cn(
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
        )}
        data-testid="shipments-table"
      >
        <div className={cm.cn('overflow-x-auto')}>
          <table className={cm.cn('w-full min-w-[560px] text-sm')}>
            <thead>
              <tr
                className={cm.cn('text-left text-[10px] uppercase tracking-[0.2em] text-white')}
                style={{ backgroundColor: 'var(--color-sidebar)' }}
              >
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold')}>
                  {t('shipments.cols.manifest', {}, { defaultValue: 'Manifest' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold')}>
                  {t('shipments.cols.carrier', {}, { defaultValue: 'Carrier' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold')}>
                  {t('shipments.cols.tracking', {}, { defaultValue: 'Tracking' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold text-right')}>
                  {t('shipments.cols.weight', {}, { defaultValue: 'Weight' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold')}>
                  {t('shipments.cols.state', {}, { defaultValue: 'State' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/50')}>
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className={cm.cn(cm.sp('p', 6), cm.textMuted, 'text-center text-sm')}
                  >
                    {t('shipments.loading', {}, { defaultValue: 'Loading shipments…' })}
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className={cm.cn(cm.sp('p', 6), cm.textMuted, 'text-center text-sm')}
                    data-testid="shipments-empty"
                  >
                    {t(
                      'shipments.empty',
                      {},
                      { defaultValue: 'No shipments yet — create one above.' },
                    )}
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => {
                  const meta = STATE_META[row.status ?? 'label_created'] ?? STATE_META.label_created
                  return (
                    <tr
                      key={row.id}
                      className={cm.cn('hover:bg-background-secondary transition-colors')}
                      data-testid="shipment-row"
                    >
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'font-mono text-xs font-bold',
                        )}
                        style={{ color: 'var(--color-sku)' }}
                      >
                        <Link to={`/shipments/${row.id}`} className={cm.cn('hover:underline')}>
                          {row.manifest_number ?? row.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'text-on-surface uppercase',
                        )}
                      >
                        {row.carrier}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'font-mono text-xs text-on-surface-variant',
                        )}
                      >
                        {row.tracking_number ?? '—'}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'font-mono text-right tabular-nums',
                        )}
                      >
                        {(Number(row.weight_oz ?? 0) / 16).toFixed(1)} lb
                      </td>
                      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                        <span
                          className={cm.cn(
                            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                          )}
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined text-[12px]')}
                            data-icon={meta.icon}
                          >
                            {meta.icon}
                          </span>
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  )
}

export default Shipments
