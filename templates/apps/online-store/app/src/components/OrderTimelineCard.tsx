import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TimelineEvent {
  status: string
  label: string
  date: string
  completed: boolean
}

function OrderTimelineCard({ timeline }: { timeline: TimelineEvent[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>history</span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('orderTimelineCard.heading', {}, { defaultValue: 'Order Timeline' })}
        </h2>
      </div>
      <div
        className={cm.cn(
          cm.stack(4),
          'relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border',
        )}
      >
        {timeline.map((event, i) => (
          <div key={i} className={cm.cn(cm.sp('pl', 8), 'relative')}>
            <span
              className={cm.cn(
                'absolute left-0 top-0 w-4 h-4 rounded-full',
                event.completed ? 'bg-primary flex items-center justify-center' : 'bg-border',
              )}
            >
              {event.completed && (
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'material-symbols-outlined text-white text-[10px]',
                  )}
                >
                  check
                </span>
              )}
            </span>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  event.completed ? '' : 'text-foreground-secondary',
                )}
              >
                {event.label}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>{event.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrderTimelineCard
export { OrderTimelineCard }
