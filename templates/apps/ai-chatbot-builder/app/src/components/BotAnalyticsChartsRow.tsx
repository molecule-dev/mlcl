import { getClassMap } from '@molecule/app-ui'

import BotAnalyticsChannelChart from '../components/BotAnalyticsChannelChart.js'
import BotAnalyticsConversationsChart from '../components/BotAnalyticsConversationsChart.js'

function BotAnalyticsChartsRow() {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-3')}
      data-mol-id="charts-row"
    >
      {/* Line Chart: Conversations Over Time */}
      <BotAnalyticsConversationsChart />
      {/* Doughnut Chart: Resolution by Channel */}
      <BotAnalyticsChannelChart />
    </div>
  )
}

export default BotAnalyticsChartsRow
export { BotAnalyticsChartsRow }
