import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useDashboardStats } from '../lib/useDashboardStats.js'

function letterGradeFor(percent: number | null): string | null {
  if (percent == null || !Number.isFinite(percent)) return null
  if (percent >= 90) return 'A'
  if (percent >= 80) return 'B'
  if (percent >= 70) return 'C'
  if (percent >= 60) return 'D'
  return 'F'
}

/**
 * "Average Score" KPI tile.
 *
 * Reads the user's actual graded-assignment average from
 * `/api/me/stats`. If they have no graded work yet we show "—" with a
 * "no grades yet" hint instead of the previously hardcoded 92% / Grade A.
 */
function AverageScoreCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { stats, loading } = useDashboardStats()
  const score = stats?.averageScore ?? null
  const letter = letterGradeFor(score)
  const valueLabel = loading
    ? '—'
    : score == null
      ? t('averageScoreCard.empty', {}, { defaultValue: '—' })
      : t('averageScoreCard.score', { value: score }, { defaultValue: '{{value}}%' })

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10',
      )}
      data-mol-id="average-score-card"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div className={cm.cn(cm.sp('p', 2), 'bg-purple-50 rounded-lg')}>
          <span className={cm.cn('material-symbols-outlined text-tertiary')} data-icon="star">
            star
          </span>
        </div>
        {letter ? (
          <div
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'bg-secondary text-on-secondary rounded text-[10px] uppercase tracking-wider',
            )}
            data-mol-id="average-score-letter"
          >
            {t('averageScoreCard.grade', { grade: letter }, { defaultValue: 'GRADE {{grade}}' })}
          </div>
        ) : (
          <div
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'bg-surface-container-low text-on-surface-variant rounded text-[10px] uppercase tracking-wider',
            )}
          >
            {t(
              'averageScoreCard.gradedCount',
              { count: stats?.graded ?? 0 },
              { defaultValue: '{{count}} graded' },
            )}
          </div>
        )}
      </div>
      <p
        className={cm.cn(
          'text-on-surface-variant font-label text-[10px] uppercase tracking-widest',
        )}
      >
        {t('averageScoreCard.label', {}, { defaultValue: 'Average Score' })}
      </p>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.sp('mt', 1),
          cm.fontWeight('bold'),
          'font-headline',
        )}
        data-mol-id="average-score-value"
      >
        {valueLabel}
      </p>
      {!loading && score == null ? (
        <p
          className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
          data-mol-id="average-score-empty"
        >
          {t(
            'averageScoreCard.emptyHint',
            {},
            { defaultValue: 'Submit assignments to see your average.' },
          )}
        </p>
      ) : null}
    </div>
  )
}

export default AverageScoreCard
export { AverageScoreCard }
