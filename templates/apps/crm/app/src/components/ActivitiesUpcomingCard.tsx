import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface UpcomingActivity {
  id: string
  type: string
  subject: string
  due_date: string | null
}

interface UpcomingCardProps {
  upcomingActivities: UpcomingActivity[]
}

function getUpcomingIcon(type: string): string {
  switch (type) {
    case 'call':
      return 'call'
    case 'email':
      return 'mail'
    case 'meeting':
      return 'groups'
    case 'task':
      return 'task_alt'
    default:
      return 'event'
  }
}

function formatUpcomingDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ActivitiesUpcomingCard({ upcomingActivities }: UpcomingCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-low rounded-3xl')}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'text-on-surface uppercase tracking-wider',
          )}
        >
          {t('activitiesUpcomingCard.heading', {}, { defaultValue: 'Next 24 Hours' })}
        </h3>
        <Link to="/activities" className={cm.fvd81937c0}>
          {t('common.viewAll', {}, { defaultValue: 'View All' })}
        </Link>
      </div>
      <div className={cm.stack(4)}>
        {upcomingActivities.length === 0 ? (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.textCenter,
              cm.sp('py', 4),
              'text-on-surface-variant',
            )}
          >
            {t('activitiesUpcomingCard.empty', {}, { defaultValue: 'No upcoming activities' })}
          </p>
        ) : (
          upcomingActivities.slice(0, 3).map((activity) => (
            <button
              type="button"
              key={activity.id}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.cursorPointer,
                'group w-full text-left',
              )}
              onClick={() => navigate(`/activities/${activity.id}`)}
            >
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.textPrimary,
                  'rounded-xl bg-surface group-hover:bg-primary group-hover:text-white transition-all shadow-sm',
                )}
              >
                <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                  {getUpcomingIcon(activity.type)}
                </span>
              </div>
              <div>
                <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}>
                  {activity.subject}
                </p>
                <p
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    'text-[10px] text-foreground-secondary',
                  )}
                >
                  {formatUpcomingDate(activity.due_date)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
export { ActivitiesUpcomingCard }
