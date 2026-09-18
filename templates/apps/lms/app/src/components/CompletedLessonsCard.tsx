import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useDashboardStats } from '../lib/useDashboardStats.js'

/**
 * "Completed Lessons" KPI tile on the dashboard.
 *
 * Reads the user's real lesson_completion totals from `/api/me/stats`.
 * If the user is enrolled in courses we show `<completed>/<total>`,
 * otherwise just the absolute completion count — there's no fake "8/15"
 * anymore. While loading the value is rendered as `—`.
 */
function CompletedLessonsCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { stats, loading } = useDashboardStats()
  const completed = stats?.completedLessons ?? 0
  const total = stats?.totalLessons ?? 0

  let progressLabel: string
  if (loading) {
    progressLabel = '—'
  } else if (total > 0) {
    progressLabel = t(
      'completedLessonsCard.progress',
      { completed, total },
      { defaultValue: '{{completed}}/{{total}}' },
    )
  } else {
    progressLabel = t(
      'completedLessonsCard.progressOpen',
      { completed },
      { defaultValue: '{{completed}}' },
    )
  }

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10',
      )}
      data-mol-id="completed-lessons-card"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div className={cm.cn(cm.sp('p', 2), 'bg-success-light rounded-lg')}>
          <span className={cm.cn('material-symbols-outlined text-secondary')} data-icon="task_alt">
            task_alt
          </span>
        </div>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'completedLessonsCard.period',
            { count: stats?.completedLessonsThisWeek ?? 0 },
            { defaultValue: '{{count}} this week' },
          )}
        </span>
      </div>
      <p
        className={cm.cn(
          'text-on-surface-variant font-label text-[10px] uppercase tracking-widest',
        )}
      >
        {t('completedLessonsCard.title', {}, { defaultValue: 'Completed Lessons' })}
      </p>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('bold'),
          cm.sp('mt', 1),
          'font-headline',
        )}
        data-mol-id="completed-lessons-value"
      >
        {progressLabel}
      </p>
    </div>
  )
}

export default CompletedLessonsCard
export { CompletedLessonsCard }
