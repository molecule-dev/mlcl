import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PennantHeroCardProps {
  /** Lead team's name (e.g. "Atlas United"). */
  leaderName: string
  /** Wins-Losses-Draws record string (e.g. "18-4-2"). */
  record: string
  /** Total points (table headline). */
  points: number
  /** Optional games-back metric vs runner-up (e.g. "+5 GB" or "0.0"). */
  gamesAhead?: string
  /** Optional last-10 form string (e.g. "W-W-L-W-W-W-D-W-W-L"). */
  formString?: string
  /** Sparkline of cumulative points over the season. */
  trend?: number[]
}

function buildSparklinePath(points: number[]): { stroke: string; fill: string } {
  if (points.length < 2) {
    return {
      stroke: 'M0,80 Q50,60 100,70 T200,30 T300,50 T400,10',
      fill: 'M0,80 Q50,60 100,70 T200,30 T300,50 T400,10 L400,100 L0,100 Z',
    }
  }
  const W = 400,
    H = 100
  const min = Math.min(...points),
    max = Math.max(...points)
  const range = max - min || 1
  const pts = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W
    const y = H - ((v - min) / range) * (H * 0.85) - H * 0.1
    return [x, y] as const
  })
  const stroke = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const fill = `${stroke} L${W},${H} L0,${H} Z`
  return { stroke, fill }
}

/**
 * Gradient hero card for the Dashboard — "Top of the table" leader card
 * with 6xl-extrabold points number, frosted-glass record pill, decorative
 * blurred orbs, and an inline season-points sparkline.
 *
 * Translated from banking-dashboard's BalanceHeroCard — same anatomy
 * (gradient panel, orbs, sparkline, frosted pill), retuned to the
 * Pennant teal-to-navy palette and to the sports-league domain
 * (points-by-week instead of balance-by-day).
 */
export function PennantHeroCard({
  leaderName,
  record,
  points,
  gamesAhead,
  formString,
  trend,
}: PennantHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const path = buildSparklinePath(trend ?? [])

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 rounded-[2rem] text-white relative overflow-hidden shadow-xl',
      )}
      style={{
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
      }}
    >
      <div className={cm.cn('relative z-10')}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'font-black uppercase tracking-[0.28em] text-white/70',
          )}
        >
          {t('pennantHeroCard.eyebrow', {}, { defaultValue: 'Top of the table' })}
        </p>
        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'tracking-tight',
          )}
        >
          {leaderName}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), 'flex-wrap')}>
          <span
            className={cm.cn(
              'text-6xl md:text-7xl font-extrabold tracking-tighter tabular-nums leading-none',
            )}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {points}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-white/80',
            )}
          >
            {t('pennantHeroCard.pointsLabel', {}, { defaultValue: 'PTS' })}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md uppercase tracking-widest tabular-nums',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm')}>
              military_tech
            </span>
            {record}
          </span>
        </div>
        {gamesAhead ? (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-white/80 tabular-nums')}>
            {t(
              'pennantHeroCard.gamesAhead',
              { value: gamesAhead },
              { defaultValue: '{{value}} games ahead of the chase' },
            )}
          </p>
        ) : null}
      </div>

      {formString ? (
        <div className={cm.cn(cm.sp('mt', 6), 'relative z-10')}>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-[0.28em] text-white/60 mb-2',
            )}
          >
            {t('pennantHeroCard.formLabel', {}, { defaultValue: 'Last 10' })}
          </p>
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            {formString
              .split('-')
              .slice(0, 10)
              .map((r, i) => {
                const toneBg =
                  r === 'W'
                    ? 'bg-win'
                    : r === 'L'
                      ? 'bg-loss'
                      : r === 'D'
                        ? 'bg-draw'
                        : 'bg-surface/20'
                const toneColor =
                  r === 'W' || r === 'L' || r === 'D'
                    ? 'var(--color-on-traffic)' /* dark navy — passes on all traffic-light colors */
                    : undefined
                return (
                  <span
                    key={`${r}-${i}`}
                    className={cm.cn(
                      'inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-extrabold',
                      toneBg,
                      r !== 'W' && r !== 'L' && r !== 'D' ? 'text-white/70' : undefined,
                    )}
                    style={toneColor ? { color: toneColor } : undefined}
                    aria-hidden="true"
                  >
                    {r || '·'}
                  </span>
                )
              })}
          </div>
        </div>
      ) : null}

      <div className={cm.cn(cm.sp('mt', 6), cm.h(20), cm.w('full'), 'relative z-10')}>
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
        >
          <path d={path.fill} fill="white" opacity="0.25" />
          <path
            d={path.stroke}
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-12 top-10 blur-xl pointer-events-none',
        )}
        style={{ backgroundColor: 'rgba(16, 185, 129, 0.35)' }}
        aria-hidden="true"
      />
    </div>
  )
}
