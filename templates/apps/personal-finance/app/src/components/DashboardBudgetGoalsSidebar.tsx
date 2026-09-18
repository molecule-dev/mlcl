import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import BudgetProgressPanel from './BudgetProgressPanel.js'
import SavingGoalCard from './SavingGoalCard.js'

function DashboardBudgetGoalsSidebar() {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.stack(8), 'lg:col-span-4')}>
      <BudgetProgressPanel />
      {/* Goals/Visual Callout */}
      <Link to="/goals" className={cm.cn('contents')} onClick={(e) => e.stopPropagation()}>
        <SavingGoalCard />
      </Link>
    </div>
  )
}

export default DashboardBudgetGoalsSidebar
export { DashboardBudgetGoalsSidebar }
