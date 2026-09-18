import { getClassMap } from '@molecule/app-ui'

import EditorStreakCard from './EditorStreakCard.js'
import QuickActionsCard from './QuickActionsCard.js'

function DashboardRightSidebar() {
  const cm = getClassMap()
  return (
    <aside className={cm.cn(cm.w('full'), cm.flex({ direction: 'col', gap: 'lg' }), 'lg:w-80')}>
      <QuickActionsCard />
      {/* Engagement Bloom Card */}
      <EditorStreakCard />
    </aside>
  )
}

export default DashboardRightSidebar
export { DashboardRightSidebar }
