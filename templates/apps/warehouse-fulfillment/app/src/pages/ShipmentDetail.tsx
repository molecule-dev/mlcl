import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ApiShipmentEvent {
  id: string
  status?: string
  description?: string
  location?: string
  created_at?: string
}

interface ApiShipmentDetail {
  id: string
  manifest_number?: string | null
  tracking_number?: string | null
  carrier?: string | null
  service?: string | null
  dock?: string | null
  weight_oz?: number | null
  status?: string
  events?: ApiShipmentEvent[]
}

const STATUSES = [
  { value: 'label_created', label: 'Label created' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'exception', label: 'Exception' },
]

const STATUS_META: Record<string, { bg: string; color: string }> = {
  label_created: { bg: 'var(--color-order-pending-bg)', color: 'var(--color-order-pending)' },
  in_transit: { bg: 'var(--color-order-picking-bg)', color: 'var(--color-order-picking)' },
  delivered: { bg: 'var(--color-order-shipped-bg)', color: 'var(--color-order-shipped)' },
  exception: { bg: 'var(--color-stock-out-bg)', color: 'var(--color-stock-out)' },
}

export function ShipmentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()
  const id = params.id ?? ''
  const [data, setData] = useState<ApiShipmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await http.get<ApiShipmentDetail>(`/shipments/${id}`)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await http.get<ApiShipmentDetail>(`/shipments/${id}`)
        if (cancelled) return
        setData(res.data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, id])

  async function setStatus(next: string) {
    setUpdating(true)
    try {
      await http.post(`/shipments/${id}/status`, { status: next, description: `Marked ${next}` })
      await refresh()
    } finally {
      setUpdating(false)
    }
  }

  if (loading && !data) {
    return (
      <div className={cm.cn(cm.sp('p', 6), cm.textMuted)} data-testid="shipment-detail-loading">
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (!data) {
    return (
      <div className={cm.stack(4)} data-testid="shipment-detail-empty">
        <Link to="/shipments" className="text-primary hover:underline">
          ← {t('shipmentDetail.back', {}, { defaultValue: 'Back to manifests' })}
        </Link>
        <p className={cm.textMuted}>
          {t('shipmentDetail.notFound', {}, { defaultValue: 'Shipment not found.' })}
        </p>
      </div>
    )
  }

  const status = data.status ?? 'label_created'
  const statusMeta = STATUS_META[status] ?? STATUS_META.label_created
  const events = data.events ?? []

  return (
    <div className={cm.stack(8)} data-testid="shipment-detail-page">
      <header className={cm.stack(2)}>
        <Link
          to="/shipments"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant hover:text-on-surface',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')} data-icon="arrow_back">
            arrow_back
          </span>
          {t('shipmentDetail.back', {}, { defaultValue: 'Back to manifests' })}
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <h1 className={cm.cn('font-mono text-3xl font-extrabold tracking-wider text-on-surface')}>
            {data.manifest_number ?? data.tracking_number ?? data.id.slice(0, 12)}
          </h1>
          <span
            className={cm.cn(
              'inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
            )}
            style={statusMeta}
            data-testid="shipment-status-badge"
          >
            {status.replace(/_/g, ' ')}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {String(data.carrier ?? '').toUpperCase()} · {data.service ?? '—'} · {data.dock ?? '—'} ·{' '}
          {Number(data.weight_oz ?? 0) / 16} lb
        </p>
      </header>

      <article
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          cm.stack(3),
        )}
        data-testid="shipment-actions"
      >
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
          {t('shipmentDetail.actions.title', {}, { defaultValue: 'Update status' })}
        </h2>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
          {STATUSES.map((s) => {
            const active = status === s.value
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                disabled={updating || active}
                data-testid={`shipment-status-${s.value}`}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-lg border transition-colors',
                  active
                    ? 'bg-primary text-on-primary border-primary'
                    : 'border-outline-variant text-on-surface hover:bg-background-secondary',
                )}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </article>

      <article
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          cm.stack(4),
        )}
        data-testid="shipment-timeline"
      >
        <header className={cm.stack(1)}>
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
            )}
          >
            {t('shipmentDetail.timeline.eyebrow', {}, { defaultValue: 'Timeline' })}
          </p>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('shipmentDetail.timeline.title', {}, { defaultValue: 'Manifest events' })}
          </h2>
        </header>
        {events.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)} data-testid="shipment-events-empty">
            {t('shipmentDetail.timeline.empty', {}, { defaultValue: 'No events yet.' })}
          </p>
        ) : (
          <ol className={cm.cn(cm.stack(2))}>
            {events.map((evt) => (
              <li
                key={evt.id}
                className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('py', 2))}
                data-testid="shipment-event"
              >
                <span
                  className={cm.cn(
                    'h-9 w-9 rounded-full inline-flex',
                    cm.flex({ align: 'center', justify: 'center' }),
                  )}
                  style={{
                    backgroundColor: 'var(--color-stock-in-bg)',
                    color: 'var(--color-stock-in)',
                  }}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    data-icon="check"
                  >
                    check
                  </span>
                </span>
                <div className={cm.cn('flex-1')}>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {evt.description || evt.status}
                  </p>
                  <p
                    className={cm.cn(
                      'text-[11px] uppercase tracking-wider text-on-surface-variant',
                    )}
                  >
                    {evt.created_at ? new Date(evt.created_at).toLocaleString() : ''}
                    {evt.location ? ` · ${evt.location}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </article>
    </div>
  )
}

export default ShipmentDetail
