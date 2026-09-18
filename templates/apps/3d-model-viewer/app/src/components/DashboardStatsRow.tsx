import { getClassMap } from '@molecule/app-ui'

import ActiveEmbedsStatCard from './ActiveEmbedsStatCard.js'
import StatCard from './StatCard.js'
import StorageStatCard from './StorageStatCard.js'
import ViewsStatCard from './ViewsStatCard.js'

function DashboardStatsRow() {
  const cm = getClassMap()
  return (
    <section className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-2 lg:grid-cols-4')}>
      {/* Stat Card 1 */}
      <StatCard />
      {/* Stat Card 2 */}
      <StorageStatCard />
      {/* Stat Card 3 */}
      <ViewsStatCard />
      {/* Stat Card 4 */}
      <ActiveEmbedsStatCard />
    </section>
  )
}

export default DashboardStatsRow
export { DashboardStatsRow }
