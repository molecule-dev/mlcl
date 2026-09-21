import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { getRealtimeConnection } from '../lib/realtime.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Shipment {
  id: string
  tracking_number: string
  carrier: string
  carrier_id: string
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception'
  origin_city: string
  origin_state: string
  origin_country: string
  destination_city: string
  destination_state: string
  destination_country: string
  destination_address: string
  customer: string
  customer_email: string
  weight_lb: number
  service_level: string
  shipped_at: string
  eta: string
  delivered_at: string | null
}

interface Event {
  id: string
  shipment_id: string
  timestamp: string
  status:
    | 'created'
    | 'pending'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'exception'
    | 'picked_up'
    | 'arrived'
  location: string
  description: string
}

const STATUS_COLOR: Record<Shipment['status'], string> = {
  pending: 'bg-surface-container text-on-surface',
  in_transit: 'bg-primary-container text-on-primary-container',
  out_for_delivery: 'bg-warning-container text-on-warning-container',
  delivered: 'bg-success-container text-on-success-container',
  exception: 'bg-error-container text-on-error-container',
}

const EVENT_DOT: Record<Event['status'], string> = {
  created: 'var(--color-status-pending)',
  pending: 'var(--color-status-pending)',
  picked_up: 'var(--color-status-pending)',
  in_transit: 'var(--color-status-in-transit)',
  arrived: 'var(--color-status-in-transit)',
  out_for_delivery: 'var(--color-status-out-delivery)',
  delivered: 'var(--color-status-delivered)',
  exception: 'var(--color-status-exception)',
}

export function ShipmentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = '' } = useParams<{ id: string }>()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped by the live shipment feed below to re-fetch. The spinner shows only on
  // the FIRST load (hasLoadedRef) so a live tracking update refreshes silently.
  const [refreshKey, setRefreshKey] = useState(0)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    if (!hasLoadedRef.current) setLoading(true)
    Promise.all([http.get(`/api/shipments/${id}`), http.get(`/api/events?shipment_id=${id}`)])
      .then(([s, e]) => {
        if (cancelled) return
        setShipment(unwrapSingle<Shipment>(s))
        setEvents(unwrapList<Event>(e))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('shipmentDetail.loadError', {}, { defaultValue: 'Failed to load shipment.' }))
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          hasLoadedRef.current = true
        }
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t, refreshKey])

  // Live tracking — the API broadcasts `tracking:update` to the PUBLIC
  // `shipment:<id>` room whenever a tracking event is added (api/src/handlers/
  // tracking.ts). Join it and silently re-fetch so a new scan/status appears
  // without a reload. Room + event names MUST match the server exactly — a
  // mismatch is a silent no-op. Realtime is an enhancement: if the socket can't
  // connect, the page still works from the initial fetch.
  useEffect(() => {
    if (!id) return
    const room = `shipment:${id}`
    let active = true
    let connection: RealtimeConnection | null = null
    const onUpdate = () => {
      track({ name: 'delivery.updated', properties: { shipment_id: id, source: 'realtime' } })
      setRefreshKey((k) => k + 1)
    }
    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('tracking:update', onUpdate)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Socket unavailable — the page still works from the initial fetch.
      })
    return () => {
      active = false
      if (connection) {
        connection.off('tracking:update', onUpdate)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [id])

  if (error)
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.textCenter, 'space-y-4')}>
        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>
        <div className={cm.cn(cm.flex({ justify: 'center', gap: 'sm' }))}>
          <button
            type="button"
            data-mol-id="button-retry-shipment"
            onClick={() => {
              setError(null)
              setRefreshKey((k) => k + 1)
            }}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'border border-outline-variant rounded-md inline-flex items-center justify-center min-h-10',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
          <Link
            to="/shipments"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md inline-flex items-center justify-center min-h-10',
            )}
          >
            {t('shipmentDetail.backLink', {}, { defaultValue: 'All shipments' })}
          </Link>
        </div>
      </div>
    )
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!shipment)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('shipmentDetail.notFound', {}, { defaultValue: 'Shipment not found.' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/shipments"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('shipmentDetail.backLink', {}, { defaultValue: 'All shipments' })}
      </Link>

      <header className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
        <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), 'gap-3 flex-wrap')}>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant',
                cm.fontWeight('medium'),
                'uppercase tracking-wider',
              )}
            >
              {t('shipmentDetail.label', {}, { defaultValue: 'Tracking number' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'font-mono',
              )}
            >
              {shipment.tracking_number}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {shipment.carrier} · {shipment.service_level}
            </p>
          </div>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-full',
              STATUS_COLOR[shipment.status],
            )}
          >
            {t(
              `shipmentDetail.status.${shipment.status}`,
              {},
              { defaultValue: shipment.status.replace('_', ' ') },
            )}
          </span>
        </div>
      </header>

      <section className={cm.grid({ cols: 3, gap: 'md' })}>
        <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
              'uppercase tracking-wider',
            )}
          >
            {t('shipmentDetail.originHeading', {}, { defaultValue: 'Origin' })}
          </h2>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {shipment.origin_city}, {shipment.origin_state}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {shipment.origin_country}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 2))}>
            {t(
              'shipmentDetail.shippedOn',
              { date: new Date(shipment.shipped_at).toLocaleString() },
              { defaultValue: 'Shipped {{date}}' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
              'uppercase tracking-wider',
            )}
          >
            {t('shipmentDetail.destinationHeading', {}, { defaultValue: 'Destination' })}
          </h2>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {shipment.destination_city}, {shipment.destination_state}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {shipment.destination_address}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {shipment.destination_country}
          </p>
        </div>
        <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
              'uppercase tracking-wider',
            )}
          >
            {t('nav.customer', {}, { defaultValue: 'Customer' })}
          </h2>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {shipment.customer}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'truncate')}>
            {shipment.customer_email}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 2))}>
            {t(
              'shipmentDetail.weightLabel',
              { weight: shipment.weight_lb },
              { defaultValue: '{{weight}} lb' },
            )}
          </p>
        </div>
      </section>

      <div
        className={'rounded relative overflow-hidden'}
        data-mol-id="shipment-map"
        style={{
          aspectRatio: '21/8',
          backgroundColor: 'var(--color-map-bg)',
          backgroundImage:
            'radial-gradient(circle at 25% 50%, color-mix(in srgb, var(--color-primary) 40%, transparent) 0%, transparent 40%), radial-gradient(circle at 75% 50%, color-mix(in srgb, var(--color-secondary) 40%, transparent) 0%, transparent 40%)',
        }}
      >
        <p
          className={cm.cn(cm.textSize('xs'), 'absolute top-3 left-3 font-mono')}
          style={{ color: 'var(--mol-color-text-tertiary)' }}
        >
          {t(
            'shipmentDetail.mapLabel',
            {},
            { defaultValue: 'Live tracking · auto-refreshes every 60s' },
          )}
        </p>
        {/* Origin pin */}
        <span
          style={{
            position: 'absolute',
            left: '20%',
            top: '50%',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-status-pending)',
            border: '2px solid white',
          }}
          aria-hidden="true"
        />
        {/* Current location pin */}
        <span
          style={{
            position: 'absolute',
            left: '52%',
            top: '52%',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-status-in-transit)',
            border: '2px solid white',
            boxShadow: '0 0 0 6px color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}
          aria-hidden="true"
        />
        {/* Destination pin */}
        <span
          style={{
            position: 'absolute',
            left: '80%',
            top: '50%',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-map-route)',
            border: '2px solid white',
          }}
          aria-hidden="true"
        />
      </div>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 4))}>
          {t('shipmentDetail.timelineHeading', {}, { defaultValue: 'Tracking timeline' })}
        </h2>
        {events.length === 0 ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant',
              cm.sp('py', 6),
              cm.textCenter,
            )}
          >
            {t(
              'shipmentDetail.timelineEmpty',
              {},
              {
                defaultValue:
                  'No tracking events yet — updates appear here as the carrier scans the parcel.',
              },
            )}
          </p>
        ) : (
          <ol data-mol-id="shipment-timeline" className={'space-y-4'}>
            {events.map((e) => (
              <li key={e.id} className={cm.flex({ align: 'start', gap: 'md' })}>
                <span
                  className={'shrink-0 mt-1.5'}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: EVENT_DOT[e.status],
                  }}
                  aria-hidden="true"
                />
                <div className={cm.flex1}>
                  <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), 'flex-wrap')}>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {e.description}
                    </p>
                    <span
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'font-mono')}
                    >
                      {new Date(e.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}
                  >
                    {e.location}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
