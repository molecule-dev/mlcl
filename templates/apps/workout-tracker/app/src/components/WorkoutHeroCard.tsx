import { getClassMap } from '@molecule/app-ui'

interface WorkoutHeroCardProps {
  /** Total volume (kg or lbs) for the headline number. */
  totalVolume: number
  /** Display unit ("kg" or "lbs"). */
  unit?: string
  /** Sub-eyebrow above the number ("This Week", "Last 30 Days", …). */
  eyebrow: string
  /** Tonal change pill — e.g. "+12.4% vs last week". */
  change?: {
    value: string
    direction: 'up' | 'down' | 'flat'
  }
  /** Sparkline points (volume per session over the lookback window). */
  trend: number[]
  /** Optional secondary stat: total sets logged this period. */
  setsLogged?: number
  /** Optional secondary stat: number of workouts logged this period. */
  workouts?: number
}

/**
 * Brand hero — gradient orange card with the headline volume number rendered
 * in 6xl extrabold tabular-num, a frosted-glass change pill, two decorative
 * blurred orbs, and an inline SVG sparkline that adapts to the data.
 *
 * Translated from banking-dashboard's BalanceHeroCard.tsx (volume gradient
 * + frosted pill + sparkline) — adapted to the Forja palette and to the
 * workout-volume domain.
 */
export function WorkoutHeroCard({
  totalVolume,
  unit = 'kg',
  eyebrow,
  change,
  trend,
  setsLogged,
  workouts,
}: WorkoutHeroCardProps) {
  const cm = getClassMap()

  const directionIcon =
    change?.direction === 'down'
      ? 'trending_down'
      : change?.direction === 'flat'
        ? 'trending_flat'
        : 'trending_up'

  const sparklinePath = useSparklinePath(trend)
  const sparklineFill = useSparklineFill(trend)

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 8),
        'relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow-lg',
      )}
      style={{ borderRadius: '2rem' }}
    >
      <div
        className={cm.cn(
          'absolute -right-20 -top-20 w-64 h-64 rounded-full bg-surface/10 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -left-16 -bottom-24 w-72 h-72 rounded-full bg-accent/30 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />

      <div className={cm.cn('relative z-10', cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-primary/70 font-black uppercase tracking-[0.28em]',
          )}
        >
          {eyebrow}
        </span>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), 'flex-wrap')}>
          <span
            className={cm.cn(
              'text-6xl md:text-7xl font-extrabold tracking-tighter tabular-nums leading-none',
            )}
          >
            {totalVolume.toLocaleString()}
          </span>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('semibold'),
              'text-on-primary/80 uppercase tracking-widest',
            )}
          >
            {unit}
          </span>
        </div>
        {change ? (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'inline-flex w-fit rounded-full bg-surface/20 backdrop-blur-md text-on-primary',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              {directionIcon}
            </span>
            <span className="tabular-nums">{change.value}</span>
          </div>
        ) : null}
      </div>

      <svg
        className={cm.cn('relative z-10 w-full h-24 mt-6')}
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={sparklineFill}
          fill="color-mix(in srgb, var(--color-on-primary) 18%, transparent)"
        />
        <path
          d={sparklinePath}
          fill="none"
          stroke="color-mix(in srgb, var(--color-on-primary) 92%, transparent)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {setsLogged !== undefined || workouts !== undefined ? (
        <div className={cm.cn('relative z-10 grid grid-cols-2 gap-4 mt-4')}>
          {workouts !== undefined ? (
            <div>
              <div
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-primary/70 font-black uppercase tracking-[0.18em]',
                )}
              >
                Workouts
              </div>
              <div className={cm.cn('text-2xl font-extrabold tabular-nums')}>{workouts}</div>
            </div>
          ) : null}
          {setsLogged !== undefined ? (
            <div>
              <div
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-primary/70 font-black uppercase tracking-[0.18em]',
                )}
              >
                Sets logged
              </div>
              <div className={cm.cn('text-2xl font-extrabold tabular-nums')}>
                {setsLogged.toLocaleString()}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function useSparklinePath(points: number[]): string {
  if (points.length < 2) return ''
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = 100 / (points.length - 1)
  return points
    .map((v, i) => {
      const x = i * step
      const y = 32 - ((v - min) / range) * 28 - 2
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function useSparklineFill(points: number[]): string {
  const path = useSparklinePath(points)
  if (!path) return ''
  return `${path} L 100 32 L 0 32 Z`
}
