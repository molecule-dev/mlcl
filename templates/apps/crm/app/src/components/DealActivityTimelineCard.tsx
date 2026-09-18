import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function DealActivityTimelineCard({
  activities,
}: {
  activities: {
    id: string
    type: string
    subject: string
    description: string | null
    created_at: string
    author_name: string | null
  }[]
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const FILTER_TYPES: (string | null)[] = [null, 'call', 'email', 'meeting']
  const [filterIdx, setFilterIdx] = useState(0)
  const filterType = FILTER_TYPES[filterIdx]
  const visibleActivities = filterType
    ? activities.filter((a) => a.type === filterType)
    : activities
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl architectural-shadow overflow-hidden relative',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 6))}>
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-outline',
          )}
        >
          {t('dealActivityTimelineCard.title', {}, { defaultValue: 'Activity Timeline' })}
        </h3>
        <button
          type="button"
          className={cm.cn(
            cm.cursorPointer,
            'material-symbols-outlined text-outline hover:text-primary',
          )}
          onClick={() => setFilterIdx((i) => (i + 1) % FILTER_TYPES.length)}
          aria-label={t(
            'dealActivityTimelineCard.filterLabel',
            {},
            { defaultValue: 'Filter activities by type' },
          )}
        >
          filter_list
        </button>
      </div>
      <div className={cm.cn(cm.stack(0), 'relative')}>
        {/* Line */}
        <div
          className={cm.cn(cm.w(0.5), 'absolute left-3.5 top-2 bottom-2 bg-outline-variant/30')}
        ></div>
        {visibleActivities.length === 0 ? (
          <p className={cm.cn(cm.textSize('xs'), cm.sp('py', 4), 'text-outline')}>
            {t('dealActivityTimelineCard.empty', {}, { defaultValue: 'No activities yet.' })}
          </p>
        ) : (
          visibleActivities.slice(0, 5).map((activity, i) => (
            <div
              key={activity.id}
              className={cm.cn(
                'relative flex gap-4',
                i < Math.min(visibleActivities.length, 5) - 1 && 'pb-6',
              )}
            >
              <div
                className={cm.cn(
                  cm.w(7),
                  cm.h(7),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  'bg-secondary-container text-white relative z-10',
                )}
              >
                <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>
                  {activity.type === 'call'
                    ? 'call'
                    : activity.type === 'email'
                      ? 'mail'
                      : activity.type === 'meeting'
                        ? 'event'
                        : 'send'}
                </span>
              </div>
              <div className={cm.flex1}>
                <div className={cm.flex({ justify: 'between' })}>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {activity.subject}
                  </p>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] text-outline uppercase tracking-tighter',
                    )}
                  >
                    {new Date(activity.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {activity.description && (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 1),
                      'text-on-surface-variant leading-relaxed',
                    )}
                  >
                    {activity.description}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <Link to="/activities" className={cm.fv5681c29a}>
        {t('dealActivityTimelineCard.viewAll', {}, { defaultValue: 'View All Activity' })}
      </Link>
    </div>
  )
}

export default DealActivityTimelineCard
export { DealActivityTimelineCard }
