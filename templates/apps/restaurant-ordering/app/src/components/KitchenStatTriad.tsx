import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface KitchenStat {
  /** Stable key used for i18n + React keys (e.g. 'orders', 'avgTicket'). */
  key: string
  /** Display label (will be looked up via t('kitchenStatTriad.<key>') with this as default). */
  label: string
  /** Pre-formatted display value (e.g. '$1,240.50', '42'). */
  value: string
  /** Optional secondary line below the value (e.g. '+12% vs yesterday'). */
  delta?: string
  /** Direction of trend chip — controls icon and color. */
  deltaDirection?: 'up' | 'down' | 'neutral'
  /** Material symbol to show in the icon chip. */
  icon: string
  /** Tailwind class for the icon tint (e.g. 'text-primary', 'text-success'). */
  tint: string
}

interface KitchenStatTriadProps {
  stats: ReadonlyArray<KitchenStat>
}

/**
 * Three-up KPI section — surface-container-lowest cards with icon chip in
 * white-shadow square, uppercase 10px label, 3xl extrabold value, and an
 * optional delta chip.
 *
 * Translated from banking-dashboard's AccountsTriad (which in turn was
 * translated from personal-finance's DashboardAccountOverview pattern).
 */
export function KitchenStatTriad({ stats }: KitchenStatTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (stats.length === 0) return null

  const colsClass =
    stats.length === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), colsClass)}>
      {stats.map((s) => (
        <div
          key={s.key}
          className={cm.cn(
            cm.sp('p', 6),
            'block bg-surface-container-low rounded-2xl hover:bg-surface-container-lowest hover:-translate-y-0.5 transition-all group',
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
            <div
              className={cm.cn(
                cm.sp('p', 3),
                s.tint,
                'bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
              )}
            >
              <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                {s.icon}
              </span>
            </div>
            {s.delta && (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  s.deltaDirection === 'down'
                    ? 'bg-error-container text-on-error-container'
                    : s.deltaDirection === 'neutral'
                      ? 'bg-surface-container text-on-surface-variant'
                      : 'bg-success-container text-on-success-container',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-xs')} aria-hidden="true">
                  {s.deltaDirection === 'down'
                    ? 'trending_down'
                    : s.deltaDirection === 'neutral'
                      ? 'trending_flat'
                      : 'trending_up'}
                </span>
                {s.delta}
              </span>
            )}
          </div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(`kitchenStatTriad.${s.key}`, {}, { defaultValue: s.label })}
          </p>
          <p className={cm.cn(cm.textSize('3xl'), 'font-extrabold tabular-nums font-display')}>
            {s.value}
          </p>
        </div>
      ))}
    </section>
  )
}
