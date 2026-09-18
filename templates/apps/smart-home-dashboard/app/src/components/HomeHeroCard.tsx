import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface HomeHeroCardProps {
  /** Devices currently powered on. */
  devicesOn: number
  /** Devices currently online. */
  devicesOnline: number
  /** Total registered devices. */
  totalDevices: number
  /** Live indoor temperature in degrees Fahrenheit, or null if no thermostat. */
  temperatureF: number | null
  /** Active scene name, if any. */
  activeScene?: string | null
  /** 24h power-draw history in watts (drives the inline area sparkline). */
  history?: ReadonlyArray<{ hour: string; watts: number }>
}

/**
 * Gradient hero card — Ember's "home glance": current temp in 6xl-extrabold,
 * frosted-glass active-scene pill, decorative blurred orbs, inline SVG
 * sparkline of the 24h power draw.
 *
 * Translated from banking-dashboard's BalanceHeroCard pattern (the gradient
 * + extrabold reading + glass pill + sparkline shape) but rebrand to
 * Ember's amber/warm palette with a cyan glow accent.
 */
export function HomeHeroCard({
  devicesOn,
  devicesOnline,
  totalDevices,
  temperatureF,
  activeScene,
  history,
}: HomeHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const sparklinePaths = (() => {
    if (!history || history.length < 2) {
      return {
        fill: 'M0,80 Q40,60 80,55 T160,40 T240,60 T320,30 T400,45 L400,100 L0,100 Z',
        stroke: 'M0,80 Q40,60 80,55 T160,40 T240,60 T320,30 T400,45',
      }
    }
    const W = 400
    const H = 100
    const values = history.map((p) => p.watts)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * W
      const y = H - ((v - min) / range) * (H * 0.85) - H * 0.1
      return [x, y] as const
    })
    const stroke = pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ')
    const fill = `${stroke} L${W},${H} L0,${H} Z`
    return { fill, stroke }
  })()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-on-primary relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary-fixed/80',
          )}
        >
          {t('homeHeroCard.title', {}, { defaultValue: 'Home right now' })}
        </h2>
        <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
          <span
            data-testid="home-hero-temperature"
            className={cm.cn('text-6xl font-extrabold tracking-tighter tabular-nums')}
          >
            {temperatureF == null
              ? t('homeHeroCard.noTemperature', {}, { defaultValue: '— °F' })
              : t(
                  'homeHeroCard.temperature',
                  { degrees: Math.round(temperatureF) },
                  { defaultValue: '{{degrees}}°F' },
                )}
          </span>
          {activeScene ? (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'bg-surface/20 backdrop-blur-md',
              )}
            >
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                auto_awesome
              </span>
              {t('homeHeroCard.activeScene', { scene: activeScene }, { defaultValue: '{{scene}}' })}
            </span>
          ) : null}
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
            'homeHeroCard.devicesSummary',
            { on: devicesOn, online: devicesOnline, total: totalDevices },
            { defaultValue: '{{on}} on · {{online}} of {{total}} online' },
          )}
        </p>
      </div>

      <div
        className={cm.cn(
          cm.sp('mt', 12),
          cm.h(24),
          cm.w('full'),
          cm.flex({ align: 'end' }),
          'relative z-10',
        )}
      >
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={sparklinePaths.fill} fill="white" opacity="0.3" />
          <path d={sparklinePaths.stroke} fill="none" stroke="white" strokeWidth="3" />
        </svg>
      </div>

      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-primary-fixed/20 blur-xl',
        )}
        aria-hidden="true"
      />
    </div>
  )
}
