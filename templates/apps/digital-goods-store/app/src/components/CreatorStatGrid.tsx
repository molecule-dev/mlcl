import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Quad of summary KPI cards — uppercase 10px label, extrabold value, accent
 * border-l-4, hover lift. Sits below the RevenueHeroCard on the seller
 * dashboard.
 *
 * Translated from personal-finance/DashboardAccountOverview.tsx + the §2.3
 * KPI grid recipe from POLISHED-PATTERN-CATALOG.md.
 */

export interface CreatorStat {
  /** Stable key used for translation namespace. */
  key: string
  label: string
  value: string
  delta?: string
  deltaPositive?: boolean
  icon: string
  /** Tailwind border + icon accent color (one of: primary, accent, success, info). */
  accent?: 'primary' | 'accent' | 'success' | 'info'
}

const ACCENT_BORDER: Record<NonNullable<CreatorStat['accent']>, string> = {
  primary: 'border-l-primary',
  accent: 'border-l-accent',
  success: 'border-l-success',
  info: 'border-l-info',
}

const ACCENT_ICON: Record<NonNullable<CreatorStat['accent']>, string> = {
  primary: 'text-primary bg-primary-light',
  accent: 'text-accent bg-accent-light',
  success: 'text-success bg-success-light',
  info: 'text-info bg-info-light',
}

interface CreatorStatGridProps {
  stats: CreatorStat[]
}

export default function CreatorStatGrid({ stats }: CreatorStatGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
      aria-label={t('creatorStatGrid.label', {}, { defaultValue: 'Creator highlights' })}
    >
      {stats.map((stat) => {
        const accent = stat.accent ?? 'primary'
        return (
          <div
            key={stat.key}
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl border-l-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300',
              ACCENT_BORDER[accent],
            )}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <div
                className={cm.cn(
                  cm.sp('p', 2),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  ACCENT_ICON[accent],
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {stat.icon}
                </span>
              </div>
              {stat.delta && (
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    stat.deltaPositive ? 'text-success' : 'text-error',
                  )}
                >
                  {stat.delta}
                </span>
              )}
            </div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {stat.label}
            </p>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'text-on-surface',
              )}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {stat.value}
            </p>
          </div>
        )
      })}
    </section>
  )
}

export { CreatorStatGrid }
