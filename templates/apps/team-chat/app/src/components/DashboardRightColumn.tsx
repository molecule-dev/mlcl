import { getClassMap } from '@molecule/app-ui'

import ActivityCard from './ActivityCard.js'
import PinnedItemsEmpty from './PinnedItemsEmpty.js'
import RecommendedChannels from './RecommendedChannels.js'

function DashboardRightColumn() {
  const cm = getClassMap()
  return (
    <div className={cm.stack(8)}>
      <ActivityCard />
      <RecommendedChannels />
      <PinnedItemsEmpty />
    </div>
  )
}

export default DashboardRightColumn
export { DashboardRightColumn }
