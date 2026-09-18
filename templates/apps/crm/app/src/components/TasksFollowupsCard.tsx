import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function TasksFollowupsCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [done1, setDone1] = useState(false)
  const [done2, setDone2] = useState(false)
  const [done3, setDone3] = useState(true)

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.stack(4),
        'bg-surface-container-low rounded-3xl border border-outline-variant/20',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
        <input
          className={cm.cn(
            cm.w(4),
            cm.h(4),
            'rounded-sm border-border-secondary text-primary focus:ring-primary',
          )}
          type="checkbox"
          checked={done1}
          onChange={() => setDone1((c) => !c)}
        />
        <div className={cm.flex1}>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('tasksFollowupsCard.overdueTaskTitle', {}, { defaultValue: 'Call David Foster' })}
          </p>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] text-tertiary uppercase tracking-tight',
            )}
          >
            {t('status.overdue', {}, { defaultValue: 'Overdue' })}
          </span>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
        <input
          className={cm.cn(
            cm.w(4),
            cm.h(4),
            'rounded-sm border-border-secondary text-primary focus:ring-primary',
          )}
          type="checkbox"
          checked={done2}
          onChange={() => setDone2((c) => !c)}
        />
        <div className={cm.flex1}>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t(
              'tasksFollowupsCard.dueTodayTaskTitle',
              {},
              { defaultValue: 'Review NexGen Contract' },
            )}
          </p>
          <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-on-surface-variant')}>
            {t('tasksFollowupsCard.dueToday', {}, { defaultValue: 'Due Today' })}
          </span>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3 opacity-60')}>
        <input
          checked={done3}
          className={cm.cn(
            cm.w(4),
            cm.h(4),
            'rounded-sm border-border-secondary text-primary focus:ring-primary',
          )}
          type="checkbox"
          onChange={() => setDone3((c) => !c)}
        />
        <div className={cm.flex1}>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-on-surface line-through',
            )}
          >
            {t('tasksFollowupsCard.completedTaskTitle', {}, { defaultValue: 'Draft Pitch Deck' })}
          </p>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-success uppercase')}>
            {t('common.completed', {}, { defaultValue: 'Completed' })}
          </span>
        </div>
      </div>
      <button
        className={cm.cn(
          cm.w('full'),
          cm.sp('mt', 4),
          cm.sp('py', 2),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'border border-primary/30 text-primary rounded-lg hover:bg-primary/5 transition-colors',
        )}
        onClick={() => {
          /* TODO: wire when backend endpoint exists */
        }}
      >
        {t('tasksFollowupsCard.addTask', {}, { defaultValue: '+ Add New Task' })}
      </button>
    </div>
  )
}

export default TasksFollowupsCard
export { TasksFollowupsCard }
