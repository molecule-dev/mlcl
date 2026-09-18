import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { HttpClient } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type ApiBox, type ApiShipment, formatDate, unwrapList, unwrapSingle } from '../lib/api.js'

interface BoxWithShipment extends ApiBox {
  shipment?: ApiShipment | null
}

const statusStyle = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'bg-success-light text-success'
    case 'shipped':
    case 'in_transit':
    case 'out_for_delivery':
      return 'bg-info-light text-info'
    case 'pending':
    case 'customizing':
    case 'ready':
      return 'bg-warning-light text-warning'
    default:
      return 'bg-surface-container-high text-on-surface-variant'
  }
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'check_circle'
    case 'shipped':
    case 'in_transit':
    case 'out_for_delivery':
      return 'local_shipping'
    case 'pending':
    case 'customizing':
    case 'ready':
      return 'hourglass_top'
    default:
      return 'inventory_2'
  }
}

export function Shipments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [upcoming, setUpcoming] = useState<BoxWithShipment | null>(null)
  const [history, setHistory] = useState<BoxWithShipment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http
        .get('/api/boxes/mine/upcoming')
        .then(unwrapSingle<ApiBox>)
        .catch(() => null),
      http
        .get('/api/boxes/mine/history')
        .then(unwrapList<ApiBox>)
        .catch(() => []),
    ])
      .then(async ([up, hist]) => {
        if (cancelled) return
        const upWithShip = up
          ? await fetchShipment(http, up).catch(() => ({ ...up, shipment: null }))
          : null
        const histWithShip = await Promise.all(
          hist.map((b) => fetchShipment(http, b).catch(() => ({ ...b, shipment: null }))),
        )
        if (cancelled) return
        setUpcoming(upWithShip)
        setHistory(histWithShip)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('py', 8))}
      data-testid="shipments-page"
    >
      <div>
        <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('shipments.eyebrow', {}, { defaultValue: 'Tracking' })}
        </span>
        <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface')}>
          {t(
            'shipments.heading',
            { appName: APP_NAME },
            { defaultValue: 'Where every {{appName}} has been' },
          )}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
          {t(
            'shipments.subtitle',
            {},
            {
              defaultValue:
                'Track the box on its way to you, then revisit every edition you have unboxed before.',
            },
          )}
        </p>
      </div>

      {loading ? (
        <div
          className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}
          data-testid="shipments-loading"
        >
          {t('shipments.loading', {}, { defaultValue: 'Loading shipments…' })}
        </div>
      ) : (
        <>
          <section
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'md' }),
              cm.sp('p', 8),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
            )}
            data-testid="shipments-active"
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
              )}
            >
              <div>
                <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
                  {t('shipments.live.eyebrow', {}, { defaultValue: 'Active shipment' })}
                </span>
                <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
                  {upcoming
                    ? upcoming.theme ||
                      t('shipments.live.unnamed', {}, { defaultValue: 'Your next box' })
                    : t('shipments.live.empty', {}, { defaultValue: 'No active shipment yet' })}
                </h2>
              </div>
              <Link
                to="/customize"
                data-testid="shipments-customize"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'text-sm border-2 border-on-surface text-on-surface hover:bg-on-surface hover:text-surface transition-all',
                )}
              >
                {t('shipments.live.cta', {}, { defaultValue: 'Customize next box' })}
              </Link>
            </div>
            {upcoming ? (
              <ShipmentTimelineActive box={upcoming} />
            ) : (
              <p className={cm.textMuted}>
                {t(
                  'shipments.live.bodyEmpty',
                  {},
                  {
                    defaultValue:
                      'Subscribe to a tier and your first edition will appear here with live tracking once it ships.',
                  },
                )}
              </p>
            )}
          </section>

          <section
            className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
            data-testid="shipments-history"
          >
            <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
              {t('shipments.history.heading', {}, { defaultValue: 'Past shipments' })}
            </h2>
            {history.length === 0 ? (
              <p className={cm.textMuted}>
                {t(
                  'shipments.history.empty',
                  {},
                  { defaultValue: 'No past shipments yet — your first delivery will land here.' },
                )}
              </p>
            ) : (
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                {history.map((box) => (
                  <li
                    key={box.id}
                    data-testid={`shipments-row-${box.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                      cm.sp('p', 5),
                      'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/40 transition-colors',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-12 h-12 rounded-2xl bg-primary-fixed/30 text-primary',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-2xl')}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        inventory_2
                      </span>
                    </span>
                    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
                      <span
                        className={cm.cn(
                          'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {formatDate(box.shipment?.shipped_at ?? box.created_at)}
                      </span>
                      <h3
                        className={cm.cn('text-base font-extrabold tracking-tight text-on-surface')}
                      >
                        {box.theme ||
                          t('shipments.history.unnamed', {}, { defaultValue: 'Edition' })}
                      </h3>
                    </div>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'text-[10px] uppercase tracking-widest',
                        statusStyle(box.shipment?.status ?? box.status),
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-base')}>
                        {statusIcon(box.shipment?.status ?? box.status)}
                      </span>
                      {box.shipment?.status ?? box.status}
                    </span>
                    {box.shipment?.tracking_number && (
                      <span className={cm.cn('text-xs font-mono text-on-surface-variant truncate')}>
                        {box.shipment.tracking_number}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function ShipmentTimelineActive({ box }: { box: BoxWithShipment }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const ship = box.shipment
  const steps = [
    {
      id: 'ordered',
      title: t('shipments.step.ordered', {}, { defaultValue: 'Order placed' }),
      description: t(
        'shipments.step.orderedBody',
        {},
        { defaultValue: 'Your subscription queued this edition for the next ship cycle.' },
      ),
      date: formatDate(box.created_at),
      status: 'completed' as const,
    },
    {
      id: 'packed',
      title: t('shipments.step.packed', {}, { defaultValue: 'Hand-packed' }),
      description: t(
        'shipments.step.packedBody',
        {},
        { defaultValue: 'Each piece wrapped and tucked into the box with a hand-written note.' },
      ),
      date: formatDate(ship?.shipped_at) || '—',
      status: (ship ? 'completed' : 'upcoming') as 'completed' | 'current' | 'upcoming',
    },
    {
      id: 'in-transit',
      title: t('shipments.step.transit', {}, { defaultValue: 'On the way' }),
      description: ship?.tracking_number
        ? t(
            'shipments.step.transitBody',
            { carrier: ship.carrier ?? 'Carrier', tracking: ship.tracking_number },
            { defaultValue: 'Picked up — tracking is now live ({{carrier}} #{{tracking}}).' },
          )
        : t(
            'shipments.step.transitNot',
            {},
            { defaultValue: 'Tracking will appear here once your box is in transit.' },
          ),
      date: ship?.estimated_delivery ? formatDate(ship.estimated_delivery) : '—',
      status: (ship?.status === 'in_transit' || ship?.status === 'shipped'
        ? 'current'
        : ship?.status === 'delivered'
          ? 'completed'
          : 'upcoming') as 'completed' | 'current' | 'upcoming',
    },
    {
      id: 'delivered',
      title: t('shipments.step.delivered', {}, { defaultValue: 'Delivered' }),
      description: t(
        'shipments.step.deliveredBody',
        { appName: APP_NAME },
        { defaultValue: 'Tag #{{appName}}unbox to share what you discover.' },
      ),
      date: ship?.delivered_at ? formatDate(ship.delivered_at) : '—',
      status: (ship?.status === 'delivered' ? 'completed' : 'upcoming') as
        'completed' | 'current' | 'upcoming',
    },
  ]
  return (
    <ol
      className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
      data-testid="shipments-timeline"
    >
      {steps.map((step) => (
        <li
          key={step.id}
          className={cm.cn(
            cm.flex({ align: 'start', gap: 'md' }),
            cm.sp('p', 4),
            'rounded-2xl border',
            step.status === 'completed'
              ? 'border-success/40 bg-success-light/50'
              : step.status === 'current'
                ? 'border-primary bg-primary/5'
                : 'border-outline-variant/30 bg-surface-container-low/50',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-10 h-10 rounded-full',
              step.status === 'completed'
                ? 'bg-success text-on-success'
                : step.status === 'current'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-lg')}>
              {step.status === 'completed'
                ? 'check'
                : step.status === 'current'
                  ? 'radio_button_checked'
                  : 'radio_button_unchecked'}
            </span>
          </span>
          <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1)}>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
              <h3 className={cm.cn('text-base font-extrabold tracking-tight text-on-surface')}>
                {step.title}
              </h3>
              <span className={cm.cn('text-xs font-bold text-on-surface-variant')}>
                {step.date}
              </span>
            </div>
            <p className={cm.cn('text-sm text-on-surface-variant')}>{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

async function fetchShipment(http: HttpClient, box: ApiBox): Promise<BoxWithShipment> {
  const ship = await http
    .get(`/api/shipments/box/${box.id}`)
    .then(unwrapSingle<ApiShipment>)
    .catch(() => null)
  return { ...box, shipment: ship }
}

export default Shipments
