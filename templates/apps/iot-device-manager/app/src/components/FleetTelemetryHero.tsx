import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FleetTelemetryHeroProps {
  online: number
  warning: number
  critical: number
  messagesPerMin: number
}

/**
 * Dark navy command-bar hero with constellation backdrop, live LIVE indicator,
 * and KPI overlay row.
 *
 * Per DESIGN.md: console-navy `#0c1222` shell, telemetry cyan `#06b6d4`,
 * online green `#10b981`, warning amber `#f59e0b`, critical red `#ef4444`.
 *
 * Translated from fleet-management/FleetCommandHero.tsx — pin grid
 * recoloured for IoT device statuses, mph→messagesPerMin meta.
 */
export function FleetTelemetryHero({
  online,
  warning,
  critical,
  messagesPerMin,
}: FleetTelemetryHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const pins = [
    { x: 12, y: 38, status: 'online' },
    { x: 24, y: 52, status: 'online' },
    { x: 32, y: 28, status: 'online' },
    { x: 44, y: 64, status: 'warning' },
    { x: 52, y: 38, status: 'online' },
    { x: 60, y: 22, status: 'online' },
    { x: 68, y: 56, status: 'online' },
    { x: 78, y: 72, status: 'critical' },
    { x: 84, y: 36, status: 'online' },
    { x: 90, y: 58, status: 'warning' },
  ] as const

  const statusColor: Record<string, string> = {
    online: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444',
    offline: '#6b7280',
  }

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10',
      )}
      style={{ backgroundColor: '#0c1222', minHeight: '380px' }}
    >
      <div
        className={cm.cn('absolute inset-0')}
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.45) 0%, transparent 35%),' +
            'radial-gradient(circle at 60% 30%, rgba(99, 102, 241, 0.35) 0%, transparent 30%),' +
            'radial-gradient(circle at 85% 70%, rgba(239, 68, 68, 0.25) 0%, transparent 30%),' +
            // Console-navy per DESIGN.md — fixed (NOT var(--color-text), which
            // flips light in dark mode and would put white text on white).
            'linear-gradient(135deg, #0c1222 0%, #1a2332 100%)',
        }}
        aria-hidden="true"
      />

      {pins.map((pin, i) => (
        <span
          key={i}
          className={cm.cn('absolute')}
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

      <div
        className={cm.cn(
          'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute right-12 top-12 w-20 h-20 rounded-full bg-emerald-400/30 blur-2xl',
        )}
        aria-hidden="true"
      />

      <div
        className={cm.cn('relative z-10 p-8 lg:p-10 flex flex-col justify-between min-h-[380px]')}
      >
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span className={cm.cn('relative flex h-3 w-3')} aria-hidden="true">
              <span
                className={cm.cn(
                  'absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping',
                )}
              />
              <span className={cm.cn('relative inline-flex rounded-full h-3 w-3 bg-emerald-400')} />
            </span>
            <span
              className={cm.cn('text-[11px] font-bold uppercase tracking-widest text-emerald-300')}
            >
              {t('fleetTelemetryHero.liveLabel', {}, { defaultValue: 'Live · streaming MQTT' })}
            </span>
          </div>
          <span
            className={cm.cn(
              'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/10 backdrop-blur-md text-white/80',
            )}
          >
            {t('fleetTelemetryHero.commandLabel', {}, { defaultValue: 'Fleet telemetry' })}
          </span>
        </div>

        <div className={cm.cn('mt-6')}>
          <p
            className={cm.cn(
              'text-[11px] font-bold uppercase tracking-widest text-cyan-300/80 mb-2',
            )}
          >
            {t('fleetTelemetryHero.realtimeLabel', {}, { defaultValue: 'Realtime device fleet' })}
          </p>
          <h2 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-tight')}>
            {t(
              'fleetTelemetryHero.headline',
              { count: online },
              { defaultValue: '{{count}} devices online' },
            )}
          </h2>
        </div>

        <div className={cm.cn(cm.grid({ cols: 4, gap: 'md' }), 'mt-8')}>
          {[
            {
              label: t('settings.online', {}, { defaultValue: 'Online' }),
              value: online,
              color: 'text-emerald-300',
            },
            {
              label: t('fleetTelemetryHero.warning', {}, { defaultValue: 'Warnings' }),
              value: warning,
              color: warning > 0 ? 'text-amber-300' : 'text-white/70',
            },
            {
              label: t('fleetTelemetryHero.critical', {}, { defaultValue: 'Critical' }),
              value: critical,
              color: critical > 0 ? 'text-red-400' : 'text-white/70',
            },
            {
              label: t('fleetTelemetryHero.msgPerMin', {}, { defaultValue: 'msgs / min' }),
              value: messagesPerMin.toLocaleString(),
              color: 'text-cyan-300',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cm.cn('bg-surface/10 backdrop-blur-md rounded-xl p-3')}
            >
              <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-white/60')}>
                {stat.label}
              </p>
              <p
                className={cm.cn('text-2xl font-extrabold tabular-nums mt-1 font-mono', stat.color)}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
