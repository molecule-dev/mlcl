import { getClassMap } from '@molecule/app-ui'

import ProjectedSavingsCard from './ProjectedSavingsCard.js'
import SpendingInsightCard from './SpendingInsightCard.js'

function TransactionsInsightsBento() {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}>
      <SpendingInsightCard />
      <ProjectedSavingsCard />
    </div>
  )
}

export default TransactionsInsightsBento
export { TransactionsInsightsBento }
