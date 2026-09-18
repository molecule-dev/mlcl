import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface OrderTrackingHeroProps {
  inTransit: number
  inTransitChangePct: number
  deliveredToday: number
  deliveredTodayChangePct: number
  exceptionRate: number
  onTimeRate: number
  activeCarriers: number
}

/**
 * Map-dominant command-bar hero for Parcel — deep-navy panel with
 * route polyline overlay, live indicator, and four stat overlay tiles
 * (in-transit, delivered today, on-time rate, exceptions).
 *
 * Translated from fleet-management's FleetCommandHero, recoloured to
 * Parcel's cyan-on-navy palette and adapted to surface logistics ops
 * KPIs.
 */
export function OrderTrackingHero({
  inTransit,
  inTransitChangePct,
  deliveredToday,
  deliveredTodayChangePct,
  exceptionRate,
  onTimeRate,
  activeCarriers,
}: OrderTrackingHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Faked route polyline + status pins
  const pins = [
    { x: 14, y: 58, status: 'in_transit' },
    { x: 28, y: 38, status: 'delivered' },
    { x: 42, y: 70, status: 'in_transit' },
    { x: 56, y: 28, status: 'out_for_delivery' },
    { x: 68, y: 56, status: 'exception' },
    { x: 78, y: 32, status: 'in_transit' },
    { x: 88, y: 68, status: 'delivered' },
  ] as const
  const statusColor: Record<string, string> = {
    in_transit: 'var(--color-status-in-transit)',
    delivered: 'var(--color-status-delivered)',
    out_for_delivery: 'var(--color-status-out-delivery)',
    exception: 'var(--color-status-exception)',
  }

  return (
    <section
      className={
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10'
      }
      style={{ backgroundColor: 'var(--color-navy)', minHeight: '380px' }}
    >
      {/* Map gradient + route polyline */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, color-mix(in srgb, var(--mol-color-info) 50%, transparent) 0%, transparent 35%),' +
            'radial-gradient(circle at 65% 35%, color-mix(in srgb, var(--mol-color-info) 40%, transparent) 0%, transparent 30%),' +
            'radial-gradient(circle at 85% 70%, color-mix(in srgb, var(--color-error) 30%, transparent) 0%, transparent 30%),' +
            'linear-gradient(135deg, var(--color-navy) 0%, var(--color-map-bg) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Route polyline SVG */}
      <svg
        className={'absolute inset-0 w-full h-full opacity-40'}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M14,58 Q21,48 28,38 T42,70 Q49,49 56,28 Q62,42 68,56 Q73,44 78,32 Q83,50 88,68"
          fill="none"
          stroke="white"
          strokeWidth="0.4"
          strokeDasharray="1.5,1.5"
        />
      </svg>

      {/* Pins */}
      {pins.map((pin, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: `${pin.x}%`,
            top: `${pin.y}%`,
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: statusColor[pin.status],
            boxShadow: `0 0 0 6px color-mix(in srgb, ${statusColor[pin.status]} 33%, transparent), 0 0 0 12px color-mix(in srgb, ${statusColor[pin.status]} 10%, transparent)`,
          }}
          aria-hidden="true"
        />
      ))}

      <div
        className={'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl'}
        aria-hidden="true"
      />
      <div
        className={'absolute right-12 top-12 w-20 h-20 rounded-full bg-emerald-400/30 blur-2xl'}
        aria-hidden="true"
      />

      <div className={'relative z-10 p-8 lg:p-10 flex flex-col justify-between min-h-[380px]'}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span className={'relative flex h-3 w-3'} aria-hidden="true">
              <span
                className={
                  'absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping'
                }
              />
              <span className={'relative inline-flex rounded-full h-3 w-3 bg-emerald-400'} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
              {t('orderTrackingHero.liveLabel', {}, { defaultValue: 'Live · auto-refresh 30s' })}
            </span>
          </div>
          <span
            className={
              'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/10 backdrop-blur-md text-white/80'
            }
          >
            {t(
              'orderTrackingHero.commandLabel',
              { appName: APP_NAME, count: activeCarriers },
              { defaultValue: '{{appName}} · {{count}} carriers connected' },
            )}
          </span>
        </div>

        <div className={'mt-6'}>
          <p className={'text-[11px] font-bold uppercase tracking-widest text-cyan-300/80 mb-2'}>
            {t('orderTrackingHero.eyebrow', {}, { defaultValue: 'Realtime shipment status' })}
          </p>
          <h2 className={'text-4xl md:text-5xl font-extrabold tracking-tight leading-tight'}>
            {t(
              'orderTrackingHero.headline',
              { count: inTransit.toLocaleString() },
              { defaultValue: '{{count}} packages on the move' },
            )}
          </h2>
        </div>

        <div className={cm.cn(cm.grid({ cols: 4, gap: 'md' }), 'mt-8')}>
          {[
            {
              label: t('orderTrackingHero.inTransit', {}, { defaultValue: 'In transit' }),
              value: inTransit.toLocaleString(),
              meta: `${inTransitChangePct >= 0 ? '+' : ''}${inTransitChangePct.toFixed(1)}%`,
              tone: 'text-cyan-300',
            },
            {
              label: t('orderTrackingHero.delivered', {}, { defaultValue: 'Delivered today' }),
              value: deliveredToday.toLocaleString(),
              meta: `${deliveredTodayChangePct >= 0 ? '+' : ''}${deliveredTodayChangePct.toFixed(1)}%`,
              tone: 'text-emerald-300',
            },
            {
              label: t('orderTrackingHero.onTime', {}, { defaultValue: 'On-time rate' }),
              value: `${(onTimeRate * 100).toFixed(1)}%`,
              meta: t('orderTrackingHero.onTimeMeta', {}, { defaultValue: 'last 30 days' }),
              tone: 'text-emerald-300',
            },
            {
              label: t('orderTrackingHero.exceptions', {}, { defaultValue: 'Exceptions' }),
              value: `${exceptionRate.toFixed(1)}%`,
              meta: t('orderTrackingHero.exceptionsMeta', {}, { defaultValue: 'needs attention' }),
              tone: exceptionRate > 2 ? 'text-red-400' : 'text-amber-300',
            },
          ].map((stat) => (
            <div key={stat.label} className={'bg-surface/10 backdrop-blur-md rounded-xl p-3'}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                {stat.label}
              </p>
              <p className={cm.cn('text-2xl font-extrabold tabular-nums mt-1', stat.tone)}>
                {stat.value}
              </p>
              <p className={'text-[9px] text-white/60 mt-0.5 tabular-nums'}>{stat.meta}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
