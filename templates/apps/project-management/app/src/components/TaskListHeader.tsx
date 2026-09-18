import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function TaskListHeader({
  dateString,
  remainingTasks,
}: {
  dateString: string
  remainingTasks: number
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.stack(2)}>
      <h2 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tighter text-on-surface')}>
        {t('taskList.title', {}, { defaultValue: 'My Tasks' })}
      </h2>
      <p className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant')}>
        {t(
          'taskList.subtitle',
          { date: dateString, count: remainingTasks },
          { defaultValue: '{{date}} — {{count}} tasks remaining' },
        )}
      </p>
    </div>
  )
}
export { TaskListHeader }
