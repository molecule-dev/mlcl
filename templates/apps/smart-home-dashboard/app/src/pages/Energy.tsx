import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EnergyMeterCard } from '../components/EnergyMeterCard.js'

interface EnergyStats {
  today_kwh?: number
  today_cost?: number
  month_kwh?: number
  month_cost?: number
}

interface EnergyCurrent {
  total_watts?: number
  devices?: ReadonlyArray<{
    device_id: string
    device_name: string
    device_type?: string
    room?: string | null
    watts?: number
  }>
}

function unwrapSingle<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') return null
  return payload as T
}

export function Energy() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<EnergyStats>({})
  const [current, setCurrent] = useState<EnergyCurrent>({ total_watts: 0, devices: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/energy/stats').catch(() => null),
      http.get('/api/energy/current').catch(() => null),
    ])
      .then(([s, c]) => {
        if (cancelled) return
        setStats(unwrapSingle<EnergyStats>(s) || {})
        setCurrent(unwrapSingle<EnergyCurrent>(c) || { total_watts: 0, devices: [] })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const totalWatts = Number(current.total_watts || 0)
  const todayKwh = Number(stats.today_kwh || 0)
  const todayCost = Number(stats.today_cost || 0)
  const monthKwh = Number(stats.month_kwh || 0)
  const monthCost = Number(stats.month_cost || 0)

  const sortedDevices = [...(current.devices || [])]
    .sort((a, b) => Number(b.watts || 0) - Number(a.watts || 0))
    .slice(0, 8)
  const peakDeviceWatts = sortedDevices[0]?.watts || 1

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('energy.eyebrow', {}, { defaultValue: 'Power' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('energy.heading', {}, { defaultValue: 'Energy' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'energy.subheading',
            {},
            { defaultValue: 'Live wattage, daily kWh, and monthly cost — color-coded.' },
          )}
        </p>
      </header>

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('p', 10),
            'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-success to-success/40 rounded-[2rem] relative overflow-hidden text-[var(--mol-color-on-success)]',
          )}
        >
          <div className={cm.cn('relative z-10')}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.sp('mb', 2),
                'uppercase tracking-widest opacity-80',
              )}
            >
              {t('energy.heroLabel', {}, { defaultValue: 'Whole-home draw' })}
            </h2>
            <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
              <span className={cm.cn('text-6xl font-extrabold tracking-tighter tabular-nums')}>
                {totalWatts.toLocaleString()}
              </span>
              <span
                className={cm.cn('text-3xl font-bold tracking-tighter tabular-nums opacity-80')}
              >
                W
              </span>
            </div>
            <p
              className={cm.cn(
                cm.sp('mt', 4),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'opacity-90',
              )}
            >
              {t(
                'energy.heroSummary',
                { kwh: todayKwh.toFixed(1), cost: todayCost.toFixed(2) },
                { defaultValue: '{{kwh}} kWh today · ${{cost}} estimated' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.sp('mt', 12), cm.h(24), cm.w('full'), 'relative z-10')}>
            <svg
              className={cm.cn(cm.w('full'), cm.h('full'))}
              viewBox="0 0 400 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M0,80 Q40,55 80,60 T160,30 T240,55 T320,20 T400,40 L400,100 L0,100 Z"
                fill="white"
                opacity="0.3"
              />
              <path
                d="M0,80 Q40,55 80,60 T160,30 T240,55 T320,20 T400,40"
                fill="none"
                stroke="white"
                strokeWidth="3"
              />
            </svg>
          </div>
          <div
            className={cm.cn(
              'absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-surface/10 blur-3xl',
            )}
            aria-hidden="true"
          />
        </div>

        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('p', 6),
            'lg:col-span-4 bg-surface-container-lowest rounded-2xl',
          )}
        >
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), cm.sp('mb', 6))}>
            {t('energy.monthHeading', {}, { defaultValue: 'This month' })}
          </h3>
          <div className={cm.stack(5)}>
            <div>
              <p
                className={cm.cn(
                  'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant',
                )}
              >
                {t('energy.monthKwh', {}, { defaultValue: 'kWh used' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.sp('mt', 1),
                  'font-extrabold text-success tabular-nums',
                )}
              >
                {monthKwh.toFixed(1)}
              </p>
            </div>
            <div>
              <p
                className={cm.cn(
                  'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant',
                )}
              >
                {t('energy.monthCost', {}, { defaultValue: 'Estimated cost' })}
              </p>
              <p
                className={cm.cn(cm.textSize('2xl'), cm.sp('mt', 1), 'font-extrabold tabular-nums')}
              >
                ${monthCost.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
      >
        <EnergyMeterCard currentWatts={totalWatts} todayKwh={todayKwh} todayCost={todayCost} />
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('energy.topConsumersHeading', {}, { defaultValue: 'Top consumers right now' })}
        </h2>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {sortedDevices.length === 0 && !loading ? (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl text-center text-on-surface-variant',
              )}
            >
              {t(
                'energy.noConsumers',
                {},
                { defaultValue: 'No active devices reporting power right now.' },
              )}
            </div>
          ) : null}
          {sortedDevices.map((d) => {
            const pct =
              peakDeviceWatts > 0 ? Math.round(((d.watts || 0) / peakDeviceWatts) * 100) : 0
            const tone = pct >= 80 ? 'bg-error' : pct >= 40 ? 'bg-warning' : 'bg-success'
            return (
              <div
                key={d.device_id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  cm.sp('p', 4),
                  'bg-surface-container-lowest rounded-2xl',
                )}
              >
                <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
                  <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>{d.device_name}</p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {d.room || t('status.unassigned', {}, { defaultValue: 'Unassigned' })}
                  </p>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-[140px]')}>
                  <div
                    className={cm.cn(
                      cm.h(2),
                      cm.w(20),
                      'bg-surface-container rounded-full overflow-hidden',
                    )}
                    aria-hidden="true"
                  >
                    <div
                      className={cm.cn(cm.h('full'), 'rounded-full transition-all', tone)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={cm.cn(cm.fontWeight('bold'), 'tabular-nums text-sm')}>
                    {t('energy.watts', { watts: d.watts || 0 }, { defaultValue: '{{watts}} W' })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        {loading ? null : null}
      </section>
    </div>
  )
}
