/**
 * Results signature card — gradient hero with circular accuracy ring,
 * 3-up stats divider (correct / accuracy / rank), streak pill. Used on
 * the post-quiz Results page.
 *
 * Translated from personal-finance/NetWorthCard.tsx (gradient hero +
 * extrabold numeric value + frosted-glass change pill + decorative orbs)
 * with the inline SVG sparkline swapped for a percentage ring.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type ScoreBreakdownCardProps = {
  correct: number
  total: number
  rank: number
  totalPlayers: number
  pointsEarned: number
  streakBonusPct?: number
  quizTitle: string
}

export function ScoreBreakdownCard({
  correct,
  total,
  rank,
  totalPlayers,
  pointsEarned,
  streakBonusPct,
  quizTitle,
}: ScoreBreakdownCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (circumference * accuracy) / 100

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-tertiary text-white shadow-2xl shadow-primary/20',
        cm.sp('p', 10),
      )}
    >
      <span
        className={cm.cn(
          'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-amber-400/30 blur-3xl',
        )}
        aria-hidden="true"
      />
      <span
        className={cm.cn('absolute -left-16 -top-16 w-60 h-60 rounded-full bg-surface/15 blur-3xl')}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'relative z-10',
          cm.flex({ direction: 'col', gap: 8 }),
          'lg:flex-row lg:items-center',
        )}
      >
        <div
          className={cm.cn(
            'relative flex-shrink-0',
            cm.flex({ align: 'center', justify: 'center' }),
          )}
        >
          <svg width="160" height="160" viewBox="0 0 160 160" className={cm.cn('rotate-[-90deg]')}>
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="color-mix(in srgb, white 18%, transparent)"
              strokeWidth="14"
              fill="none"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="var(--quiz-gold)"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className={cm.cn('absolute inset-0 flex flex-col items-center justify-center')}>
            <span className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums')}>
              {accuracy}%
            </span>
            <span className={cm.cn('text-[10px] uppercase tracking-widest font-black opacity-80')}>
              {t('scoreBreakdownCard.accuracyLabel', {}, { defaultValue: 'Accuracy' })}
            </span>
          </div>
        </div>
        <div className={cm.cn(cm.flex1)}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-surface/20 backdrop-blur-md',
              cm.sp('mb', 4),
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              celebration
            </span>
            {t('scoreBreakdownCard.eyebrow', {}, { defaultValue: 'Quiz Complete' })}
          </span>
          <h2 className={cm.cn('text-3xl font-extrabold tracking-tight leading-tight mb-2')}>
            {t(
              'scoreBreakdownCard.headline',
              { quizTitle },
              { defaultValue: 'Nice work on "{{quizTitle}}"!' },
            )}
          </h2>
          <p className={cm.cn('text-white/80 text-sm mb-6 max-w-md')}>
            {t(
              'scoreBreakdownCard.subhead',
              {},
              {
                defaultValue:
                  'Your spark is showing. Review the breakdown below to keep climbing the leaderboard.',
              },
            )}
          </p>
          <div className={cm.cn('grid grid-cols-3 gap-4 divide-x divide-white/20')}>
            <div>
              <p className={cm.cn('text-[10px] uppercase tracking-widest font-black opacity-80')}>
                {t('scoreBreakdownCard.correctLabel', {}, { defaultValue: 'Correct' })}
              </p>
              <p className={cm.cn('text-3xl font-extrabold tracking-tighter tabular-nums')}>
                {correct}
                <span className={cm.cn('text-base opacity-70')}>/{total}</span>
              </p>
            </div>
            <div className={cm.cn('pl-4')}>
              <p className={cm.cn('text-[10px] uppercase tracking-widest font-black opacity-80')}>
                {t('scoreBreakdownCard.rankLabel', {}, { defaultValue: 'Rank' })}
              </p>
              <p className={cm.cn('text-3xl font-extrabold tracking-tighter tabular-nums')}>
                #{rank}
                <span className={cm.cn('text-base opacity-70')}>/{totalPlayers}</span>
              </p>
            </div>
            <div className={cm.cn('pl-4')}>
              <p className={cm.cn('text-[10px] uppercase tracking-widest font-black opacity-80')}>
                {t('scoreBreakdownCard.pointsLabel', {}, { defaultValue: 'Points' })}
              </p>
              <p
                className={cm.cn(
                  'text-3xl font-extrabold tracking-tighter tabular-nums text-amber-300',
                )}
              >
                +{pointsEarned.toLocaleString()}
              </p>
            </div>
          </div>
          {streakBonusPct !== undefined ? (
            <p
              className={cm.cn(
                'mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/20 text-amber-100 text-[10px] font-black uppercase tracking-widest border border-amber-300/30',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                bolt
              </span>
              {t(
                'scoreBreakdownCard.streakBonus',
                { pct: streakBonusPct },
                { defaultValue: 'Streak bonus +{{pct}}%' },
              )}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default ScoreBreakdownCard
