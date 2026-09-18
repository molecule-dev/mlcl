import { getClassMap } from '@molecule/app-ui'

import BotAnalyticsChartsRow from './BotAnalyticsChartsRow.js'
import BotAnalyticsKpiRow from './BotAnalyticsKpiRow.js'
import BotAnalyticsRecentConversationsPanel from './BotAnalyticsRecentConversationsPanel.js'
import BotAnalyticsTopIntentsPanel from './BotAnalyticsTopIntentsPanel.js'

function BotAnalyticsMainContent() {
  const cm = getClassMap()
  return (
    <main className={cm.cn(cm.sp('pt', 16), cm.minH('screen'), 'pl-64')}>
      <div className={cm.cn(cm.sp('p', 8), 'max-w-[1600px]', cm.mxAuto, cm.stack(8))}>
        <BotAnalyticsKpiRow />
        <BotAnalyticsChartsRow />
        <BotAnalyticsTopIntentsPanel />
        <BotAnalyticsRecentConversationsPanel />
      </div>
    </main>
  )
}

export default BotAnalyticsMainContent
export { BotAnalyticsMainContent }
