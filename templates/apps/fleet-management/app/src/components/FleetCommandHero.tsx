import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FleetCommandHeroProps {
  inTransit: number
  idle: number
  alerts: number
  milesToday: number
}

/**
 * Dark navy command-bar hero with map background, status dots, and live overlay.
 *
 * Per DESIGN.md: "Map-dominant layouts on Dashboard/Routes with min 55%
 * viewport width", "Realtime LIVE indicator uses pulsing accent green;
 * vehicle status colors are reserved (green=operational, cyan=in-transit,
 * amber=idle, red=alert)", "Map Overlay: rgba(12, 25, 41, 0.85)",
 * "Command Bar: #0c1929".
 */
export function FleetCommandHero({ inTransit, idle, alerts, milesToday }: FleetCommandHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Faked-map status pins, colored by fleet semantics
  const pins = [
    { x: 12, y: 38, status: 'in_transit' },
    { x: 24, y: 52, status: 'operational' },
    { x: 32, y: 28, status: 'in_transit' },
    { x: 44, y: 64, status: 'idle' },
    { x: 52, y: 38, status: 'in_transit' },
    { x: 60, y: 22, status: 'alert' },
    { x: 68, y: 56, status: 'in_transit' },
    { x: 78, y: 72, status: 'operational' },
    { x: 84, y: 36, status: 'in_transit' },
    { x: 90, y: 58, status: 'alert' },
  ] as const

  const statusColor: Record<string, string> = {
    operational: '#10b981',
    in_transit: '#0891b2',
    idle: '#f59e0b',
    alert: '#dc2626',
  }

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10',
      )}
      style={{ backgroundColor: 'var(--color-map-bg)', minHeight: '380px' }}
    >
      {/* Map gradient layer */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(8, 145, 178, 0.45) 0%, transparent 35%),' +
            'radial-gradient(circle at 60% 30%, rgba(16, 185, 129, 0.35) 0%, transparent 30%),' +
            'radial-gradient(circle at 85% 70%, rgba(220, 38, 38, 0.30) 0%, transparent 30%),' +
            'linear-gradient(135deg, var(--color-map-bg) 0%, #162a44 100%)',
        }}
        aria-hidden="true"
      />

      {/* Status pins */}
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
            boxShadow: `0 0 0 6px ${statusColor[pin.status]}33, 0 0 0 12px ${statusColor[pin.status]}1a`,
          }}
          aria-hidden="true"
        />
      ))}

      {/* Decorative blur orbs */}
      <div
        className={'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl'}
        aria-hidden="true"
      />
      <div
        className={'absolute right-12 top-12 w-20 h-20 rounded-full bg-emerald-400/30 blur-2xl'}
        aria-hidden="true"
      />

      {/* Content overlay */}
      <div className={'relative z-10 p-8 lg:p-10 flex flex-col justify-between min-h-[380px]'}>
        {/* Top: Live indicator */}
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
              {t('fleetCommandHero.liveLabel', {}, { defaultValue: 'Live · auto-refresh 5s' })}
            </span>
          </div>
          <span
            className={
              'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/10 backdrop-blur-md text-white/80'
            }
          >
            {t('fleetCommandHero.commandLabel', {}, { defaultValue: 'Fleet Command' })}
          </span>
        </div>

        {/* Headline */}
        <div className={'mt-6'}>
          <p className={'text-[11px] font-bold uppercase tracking-widest text-cyan-300/80 mb-2'}>
            {t('fleetCommandHero.realtimeLabel', {}, { defaultValue: 'Realtime fleet status' })}
          </p>
          <h2 className={'text-4xl md:text-5xl font-extrabold tracking-tight leading-tight'}>
            {t(
              'fleetCommandHero.headline',
              { count: inTransit },
              { defaultValue: '{{count}} vehicles in motion' },
            )}
          </h2>
        </div>

        {/* Stat overlay row */}
        <div className={cm.cn(cm.grid({ cols: 4, gap: 'md' }), 'mt-8')}>
          {[
            {
              label: t('fleetCommandHero.inTransit', {}, { defaultValue: 'In transit' }),
              value: inTransit,
              color: 'text-cyan-300',
            },
            {
              label: t('fleetCommandHero.idle', {}, { defaultValue: 'Idle' }),
              value: idle,
              color: 'text-amber-300',
            },
            {
              label: t('nav.alerts', {}, { defaultValue: 'Alerts' }),
              value: alerts,
              color: alerts > 0 ? 'text-red-400' : 'text-white/70',
            },
            {
              label: t('fleetCommandHero.miles', {}, { defaultValue: 'Miles today' }),
              value: milesToday.toLocaleString(),
              color: 'text-white',
            },
          ].map((stat) => (
            <div key={stat.label} className={'bg-surface/10 backdrop-blur-md rounded-xl p-3'}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                {stat.label}
              </p>
              <p className={cm.cn('text-2xl font-extrabold tabular-nums mt-1', stat.color)}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
