import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ScoreBreakdown {
  /** Display label (already localised). */
  label: string
  /** Score 0-10. */
  value: number
}

interface ScoreCardProps {
  /** Overall AI score, 0-10. */
  score: number
  /** Optional category breakdown — bars rendered below the ring. */
  breakdown?: ReadonlyArray<ScoreBreakdown>
  /** Headline label above the score (default: "AI Quality Score"). */
  label?: string
  /** Optional subtitle line. */
  subtitle?: string
  /** Tighter layout for grid placement. */
  compact?: boolean
}

/**
 * Circular SVG progress ring + tabular-nums score + horizontal stacked
 * breakdown bars — driven by Refract's DESIGN.md "Score Card" recipe
 * (80px circle, 6px stroke, score-high/medium/low color mapping, 4px
 * stacked bars).
 *
 * Translated from personal-finance's NetWorthCard ring + project-
 * management's ProgressBar pattern, recoloured to Refract's
 * green/yellow/red score scale.
 */
export function ScoreCard({
  score,
  breakdown = [],
  label,
  subtitle,
  compact = false,
}: ScoreCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const radius = compact ? 28 : 36
  const stroke = compact ? 5 : 6
  const dim = (radius + stroke) * 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(1, score / 10))
  const offset = circumference * (1 - pct)
  const ringColor =
    score >= 8
      ? 'var(--color-score-high)'
      : score >= 5
        ? 'var(--color-score-mid)'
        : 'var(--color-score-low)'

  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'md' }),
        cm.sp('p', compact ? 4 : 6),
        'bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30',
      )}
    >
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {label || t('scoreCard.label', {}, { defaultValue: 'AI Quality Score' })}
          </p>
          {subtitle ? (
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 1),
                'text-on-surface-variant font-mono',
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="relative" style={{ width: dim, height: dim }}>
          <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className="-rotate-90">
            <circle
              cx={dim / 2}
              cy={dim / 2}
              r={radius}
              fill="none"
              stroke="var(--color-surface-variant)"
              strokeWidth={stroke}
            />
            <circle
              cx={dim / 2}
              cy={dim / 2}
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className={cm.cn('absolute inset-0 flex items-center justify-center')}>
            <span
              className={cm.cn(
                compact ? cm.textSize('lg') : cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'tabular-nums',
              )}
              style={{ color: ringColor }}
            >
              {score.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {breakdown.length > 0 ? (
        <ul className={cm.cn(cm.stack(2), cm.sp('mt', 2))}>
          {breakdown.map((b) => {
            const v = Math.max(0, Math.min(1, b.value / 10))
            const tint =
              b.value >= 8
                ? 'var(--color-score-high)'
                : b.value >= 5
                  ? 'var(--color-score-mid)'
                  : 'var(--color-score-low)'
            return (
              <li key={b.label}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span
                    className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-on-surface')}
                  >
                    {b.label}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'tabular-nums font-mono text-on-surface-variant',
                    )}
                  >
                    {/* Callers pass both 0-10 subscores and plain counts — don't
                        render counts with a fake ".0" decimal. */}
                    {Number.isInteger(b.value) ? String(b.value) : b.value.toFixed(1)}
                  </span>
                </div>
                <div className={cm.cn('h-1 rounded-full bg-surface-variant overflow-hidden mt-1')}>
                  <div
                    className={cm.cn('h-full rounded-full')}
                    style={{ width: `${v * 100}%`, backgroundColor: tint }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </article>
  )
}
