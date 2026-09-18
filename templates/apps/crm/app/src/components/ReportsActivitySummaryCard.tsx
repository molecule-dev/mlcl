import { useMemo } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Activity {
  id: string
  type: string
  created_at: string
  [key: string]: unknown
}

interface WeekData {
  week: string
  calls: number
  emails: number
  meetings: number
}

interface ReportsActivitySummaryCardProps {
  activities: Activity[]
}

const SAMPLE_WEEKS: WeekData[] = [
  { week: 'WEEK 39', calls: 32, emails: 48, meetings: 16 },
  { week: 'WEEK 40', calls: 40, emails: 64, meetings: 24 },
  { week: 'WEEK 41', calls: 56, emails: 40, meetings: 32 },
  { week: 'WEEK 42', calls: 48, emails: 80, meetings: 40 },
  { week: 'WEEK 43', calls: 36, emails: 56, meetings: 20 },
  { week: 'WEEK 44', calls: 64, emails: 48, meetings: 48 },
]

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function ReportsActivitySummaryCard({ activities }: ReportsActivitySummaryCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const weeks = useMemo<WeekData[]>(() => {
    if (!activities.length) return SAMPLE_WEEKS
    const map: Record<string, WeekData> = {}
    for (const a of activities) {
      const date = new Date(a.created_at)
      if (isNaN(date.getTime())) continue
      const key = `WEEK ${getISOWeek(date)}`
      if (!map[key]) map[key] = { week: key, calls: 0, emails: 0, meetings: 0 }
      if (a.type === 'call') map[key].calls++
      else if (a.type === 'email') map[key].emails++
      else if (a.type === 'meeting') map[key].meetings++
    }
    const sorted = Object.values(map)
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-6)
    return sorted.length ? sorted : SAMPLE_WEEKS
  }, [activities])

  const maxVal = Math.max(...weeks.flatMap((w) => [w.calls, w.emails, w.meetings]), 1)
  const px = (v: number) => `${Math.max(4, Math.round((v / maxVal) * 80))}px`

  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'col-span-12 bg-surface-container-lowest rounded-3xl architectural-shadow',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 8))}>
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'tracking-wider text-on-surface uppercase opacity-80',
          )}
        >
          {t('reportsActivitySummaryCard.title', {}, { defaultValue: 'Activity Summary' })}
        </h3>
        <div className={cm.cn(cm.flex({}), 'gap-4')}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
            <span className={cm.cn(cm.w(3), cm.h(3), 'rounded bg-primary')}></span>
            <span className={cm.cn(cm.textSize('xs'), 'text-outline')}>
              {t('reportsActivitySummaryCard.calls', {}, { defaultValue: 'Calls' })}
            </span>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
            <span className={cm.cn(cm.w(3), cm.h(3), 'rounded bg-secondary-container')}></span>
            <span className={cm.cn(cm.textSize('xs'), 'text-outline')}>
              {t('reportsActivitySummaryCard.emails', {}, { defaultValue: 'Emails' })}
            </span>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
            <span className={cm.cn(cm.w(3), cm.h(3), 'rounded bg-secondary')}></span>
            <span className={cm.cn(cm.textSize('xs'), 'text-outline')}>
              {t('reportsActivitySummaryCard.meetings', {}, { defaultValue: 'Meetings' })}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.h(48),
          cm.flex({ align: 'end', justify: 'between' }),
          cm.sp('px', 4),
          'gap-8',
        )}
      >
        {weeks.map((w) => (
          <div
            key={w.week}
            className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.flex1, 'gap-1')}
          >
            <div className={cm.cn(cm.stack(1), 'w-full')}>
              <div
                className={cm.cn(cm.w('full'), 'bg-primary rounded-sm')}
                style={{ height: px(w.calls) }}
              ></div>
              <div
                className={cm.cn(cm.w('full'), 'bg-secondary-container rounded-sm')}
                style={{ height: px(w.emails) }}
              ></div>
              <div
                className={cm.cn(cm.w('full'), 'bg-secondary rounded-sm')}
                style={{ height: px(w.meetings) }}
              ></div>
            </div>
            <span
              className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 3), 'text-[10px] text-outline')}
            >
              {w.week}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ReportsActivitySummaryCard
export { ReportsActivitySummaryCard }
