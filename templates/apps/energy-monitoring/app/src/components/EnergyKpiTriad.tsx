import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface EnergyKpi {
  /** Stable key for translation namespacing. */
  key: 'consumption' | 'production' | 'export' | 'import' | 'peak' | 'off-peak' | 'cost' | string
  /** Short user-facing label (translatable). */
  label: string
  /** Pre-formatted display value (e.g. "12.4 kWh", "$3.42"). */
  value: string
  /** Material symbol icon name. */
  icon: string
  /** Tailwind text-* token for the icon chip tint. */
  tint: string
  /** Optional trend arrow indicator. */
  delta?: { direction: 'up' | 'down'; pct: number; tone: 'good' | 'bad' | 'neutral' }
}

interface EnergyKpiTriadProps {
  kpis: ReadonlyArray<EnergyKpi>
}

/**
 * KPI strip — surface-container-lowest cards with a tinted material-symbol
 * chip in a white-shadow square, uppercase 10px label, 3xl-extrabold
 * mono value, and an optional ▲/▼ trend pill.
 *
 * Translated from smart-home-dashboard's RoomTriad and personal-finance's
 * AccountsTriad — group-hover scale on the icon chip + caps tracking-widest
 * label + tabular-nums value. Renders any 1–4 cards; defaults to a 4-up
 * grid that collapses to 1-col on mobile.
 */
export function EnergyKpiTriad({ kpis }: EnergyKpiTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const featured = kpis.slice(0, 4)
  if (featured.length === 0) return null

  const colsClass =
    featured.length >= 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : featured.length === 3
        ? 'grid-cols-1 md:grid-cols-3'
        : featured.length === 2
          ? 'grid-cols-1 md:grid-cols-2'
          : 'grid-cols-1'

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), colsClass)}>
      {featured.map((kpi) => (
        <div
          key={kpi.key}
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
            <div
              className={cm.cn(
                cm.sp('p', 3),
                kpi.tint,
                'bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {kpi.icon}
              </span>
            </div>
            {kpi.delta ? (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 2),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'text-[10px] py-0.5 uppercase tracking-widest tabular-nums',
                  kpi.delta.tone === 'good'
                    ? 'bg-success-container text-on-success-container'
                    : kpi.delta.tone === 'bad'
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-surface-container text-on-surface-variant',
                )}
              >
                <span className="material-symbols-outlined text-[10px]" aria-hidden="true">
                  {kpi.delta.direction === 'up' ? 'trending_up' : 'trending_down'}
                </span>
                {t(
                  `energyKpiTriad.delta.${kpi.delta.direction}`,
                  { pct: kpi.delta.pct.toFixed(1) },
                  { defaultValue: '{{pct}}%' },
                )}
              </span>
            ) : null}
          </div>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('mb', 1),
              'text-on-surface-variant',
            )}
          >
            {t(`energyKpiTriad.label.${kpi.key}`, {}, { defaultValue: kpi.label })}
          </p>
          <p className={cm.cn(cm.textSize('3xl'), 'font-mono font-extrabold tabular-nums')}>
            {kpi.value}
          </p>
        </div>
      ))}
    </section>
  )
}
