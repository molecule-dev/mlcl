import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ActivityItem from './ActivityItem.js'
import ContactActivityItem from './ContactActivityItem.js'
import SystemActivityItem from './SystemActivityItem.js'

interface Activity {
  id: string
  type: string
  subject: string
  due_date: string | null
  completed: boolean
  contact_name: string | null
}

function RecentActivitiesCard({ activities = [] }: { activities?: Activity[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.stack(4), 'lg:col-span-2')}>
      <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
        {t('recentActivitiesCard.title', {}, { defaultValue: 'Recent Activities' })}
      </h2>
      <div className={cm.fv4f3df31c}>
        {activities.length > 0 ? (
          activities.slice(0, 5).map((activity) => (
            <div
              key={activity.id}
              className={cm.cn(
                cm.flex(),
                cm.sp('p', 4),
                'gap-4 hover:bg-surface-container-low transition-colors rounded-xl',
              )}
            >
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.shrink0,
                  'bg-secondary-container text-white',
                )}
              >
                <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                  {activity.type === 'email'
                    ? 'mail'
                    : activity.type === 'call'
                      ? 'phone'
                      : 'event_note'}
                </span>
              </div>
              <div className={cm.flex1}>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                  <span className={cm.fontWeight('bold')}>
                    {activity.contact_name ??
                      t('recentActivitiesCard.systemContact', {}, { defaultValue: 'System' })}
                  </span>{' '}
                  — {activity.subject}
                </p>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {activity.due_date ? new Date(activity.due_date).toLocaleDateString() : ''}
                  {activity.completed
                    ? ' · ' + t('common.completed', {}, { defaultValue: 'Completed' })
                    : ''}
                </span>
              </div>
            </div>
          ))
        ) : (
          <>
            {/* Activity 1 */}
            <ActivityItem />
            {/* Activity 2 */}
            <SystemActivityItem />
            {/* Activity 3 */}
            <ContactActivityItem />
          </>
        )}
      </div>
    </div>
  )
}

export default RecentActivitiesCard
export { RecentActivitiesCard }
