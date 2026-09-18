import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AiInsightCard from './AiInsightCard.js'
import TasksFollowupsCard from './TasksFollowupsCard.js'

function DashboardSidePanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.stack(4)}>
      <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
        {t('dashboardSidePanel.tasksHeading', {}, { defaultValue: 'Tasks & Follow-ups' })}
      </h2>
      <TasksFollowupsCard />
      <AiInsightCard />
    </div>
  )
}

export default DashboardSidePanel
export { DashboardSidePanel }
