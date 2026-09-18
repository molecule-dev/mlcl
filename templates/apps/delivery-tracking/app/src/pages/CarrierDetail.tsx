import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Carrier {
  id: string
  name: string
  region: string
  shipments_30d: number
  on_time_rate: number
  exception_rate: number
  avg_transit_hours: number
  api_status: 'connected' | 'degraded' | 'disconnected'
  api_endpoint: string
  api_key_masked: string
  webhook_url: string | null
  integrated_at: string
}

interface Shipment {
  id: string
  tracking_number: string
  customer: string
  status: string
  destination_city: string
  destination_state: string
}

export function CarrierDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = '' } = useParams<{ id: string }>()
  const [carrier, setCarrier] = useState<Carrier | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([http.get(`/api/carriers/${id}`), http.get(`/api/shipments?carrier_id=${id}`)])
      .then(([c, s]) => {
        if (cancelled) return
        setCarrier(unwrapSingle<Carrier>(c))
        setShipments(unwrapList<Shipment>(s).slice(0, 10))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('carrierDetail.loadError', {}, { defaultValue: 'Failed to load carrier.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!carrier)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('carrierDetail.notFound', {}, { defaultValue: 'Carrier not found.' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/carriers"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('carrierDetail.backLink', {}, { defaultValue: 'All carriers' })}
      </Link>

      <header className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{carrier.name}</h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {carrier.region}
        </p>
      </header>

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <Kpi
          label={t('carrierDetail.kpi.shipments', {}, { defaultValue: 'Shipments (30d)' })}
          value={carrier.shipments_30d.toLocaleString()}
        />
        <Kpi
          label={t('carrierDetail.kpi.onTime', {}, { defaultValue: 'On-time rate' })}
          value={`${Math.round(carrier.on_time_rate * 100)}%`}
          accent
        />
        <Kpi
          label={t('carrierDetail.kpi.exceptions', {}, { defaultValue: 'Exception rate' })}
          value={`${(carrier.exception_rate * 100).toFixed(1)}%`}
          warn={carrier.exception_rate > 0.02}
        />
        <Kpi
          label={t('carrierDetail.kpi.transit', {}, { defaultValue: 'Avg transit' })}
          value={`${carrier.avg_transit_hours}h`}
        />
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider',
            'text-on-surface-variant',
          )}
        >
          {t('carrierDetail.integrationHeading', {}, { defaultValue: 'Integration' })}
        </h2>
        <KV
          label={t('carrierDetail.api.endpoint', {}, { defaultValue: 'API endpoint' })}
          value={carrier.api_endpoint}
          mono
        />
        <KV
          label={t('carrierDetail.api.apiKey', {}, { defaultValue: 'API key' })}
          value={carrier.api_key_masked}
          mono
        />
        <KV
          label={t('carrierDetail.api.webhook', {}, { defaultValue: 'Webhook URL' })}
          value={carrier.webhook_url || '—'}
          mono
        />
        <KV
          label={t('carrierDetail.api.connectedSince', {}, { defaultValue: 'Connected since' })}
          value={new Date(carrier.integrated_at).toLocaleDateString()}
        />
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider',
            'text-on-surface-variant',
            cm.sp('mb', 3),
          )}
        >
          {t('carrierDetail.recentShipmentsHeading', {}, { defaultValue: 'Recent shipments' })}
        </h2>
        <ul className={'space-y-1'}>
          {shipments.map((s) => (
            <li key={s.id}>
              <Link
                to={`/shipments/${s.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded hover:bg-surface-container',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                    'shrink-0 font-mono',
                  )}
                  style={{ width: '180px' }}
                >
                  {s.tracking_number}
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.flex1, 'truncate')}>{s.customer}</span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                    'shrink-0 truncate',
                  )}
                  style={{ width: '160px' }}
                >
                  {s.destination_city}, {s.destination_state}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'shrink-0')}>
                  {t(
                    `shipments.status.${s.status}`,
                    {},
                    { defaultValue: s.status.replace('_', ' ') },
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  accent,
  warn,
}: {
  label: string
  value: string
  accent?: boolean
  warn?: boolean
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          'text-on-surface-variant',
          cm.fontWeight('medium'),
          'uppercase tracking-wider',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('bold'),
          cm.sp('mt', 1),
          accent ? cm.textPrimary : warn ? 'text-error' : '',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{label}</span>
      <span
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'font-mono',
          mono ? '' : 'truncate ml-4',
        )}
        style={mono ? { fontFamily: 'var(--mol-font-mono)' } : undefined}
      >
        {value}
      </span>
    </div>
  )
}
