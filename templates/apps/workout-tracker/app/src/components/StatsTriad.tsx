import { getClassMap } from '@molecule/app-ui'

export interface StatItem {
  /** Stable key for React. */
  key: string
  /** Translated label (uppercase, tracked, all-caps in render). */
  label: string
  /** Headline value. */
  value: string
  /** Optional sub-label below value (e.g. "this week"). */
  caption?: string
  /** Material-symbols icon name. */
  icon: string
  /** Tonal accent — drives the accent bar, its label and the icon color. */
  tone?: 'primary' | 'pr' | 'volume-up' | 'volume-down' | 'rest-timer' | 'streak'
  /** Optional trend pill ("+12 vs last week"). */
  trend?: {
    value: string
    direction: 'up' | 'down' | 'flat'
  }
}

interface StatsTriadProps {
  items: StatItem[]
}

const TONE: Record<NonNullable<StatItem['tone']>, { accent: string; icon: string }> = {
  primary: { accent: 'var(--color-primary)', icon: 'text-primary' },
  pr: { accent: 'var(--color-pr)', icon: 'text-pr' },
  'volume-up': { accent: 'var(--color-volume-up)', icon: 'text-volume-up' },
  'volume-down': { accent: 'var(--color-volume-down)', icon: 'text-volume-down' },
  'rest-timer': { accent: 'var(--color-rest-timer)', icon: 'text-rest-timer' },
  streak: { accent: 'var(--color-streak-active)', icon: 'text-streak-active' },
}

/**
 * Triad of KPI cards — each rendered with the inset accent bar, an icon
 * chip, an uppercase 10px tracked label, and an extrabold tabular-num value.
 * Cards lift on hover (translate-y-0.5) for a subtle interactive feel.
 *
 * Translated from crm/personal-finance's StatsRow / AccountsTriad.tsx
 * pattern — adapted to the Forja palette + workout-domain tones.
 */
export function StatsTriad({ items }: StatsTriadProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4')}>
      {items.map((item) => {
        const tone = TONE[item.tone ?? 'primary']
        const trendIcon =
          item.trend?.direction === 'down'
            ? 'trending_down'
            : item.trend?.direction === 'flat'
              ? 'trending_flat'
              : 'trending_up'
        const trendColor = item.trend?.direction === 'down' ? 'text-volume-down' : 'text-volume-up'
        return (
          <article
            key={item.key}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 5),
              cm.accentCard({ tone: 'custom' }),
              'rounded-xl bg-surface shadow-sm border border-outline/40 transition-transform hover:-translate-y-0.5',
            )}
            style={{ ['--mol-accent' as string]: tone.accent }}
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-2xl', tone.icon)}
              >
                {item.icon}
              </span>
              {item.trend ? (
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.fontWeight('semibold'),
                    'rounded-full text-[10px] uppercase tracking-widest bg-surface-variant',
                    trendColor,
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm')}>
                    {trendIcon}
                  </span>
                  <span className="tabular-nums">{item.trend.value}</span>
                </span>
              ) : null}
            </div>
            <div className={cm.accentCardLabel({ tone: 'custom' })}>{item.label}</div>
            <div
              className={cm.cn(
                'text-4xl font-extrabold tracking-tight tabular-nums text-on-surface',
              )}
            >
              {item.value}
            </div>
            {item.caption ? (
              <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                {item.caption}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
