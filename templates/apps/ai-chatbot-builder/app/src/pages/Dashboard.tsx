// Phase 1 baseline — verbatim JSX of design-ai-chatbot-builder-dashboard.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'

import { useHttpClient } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AppShell } from '../components/AppShell.js'
import BotsGrid from '../components/BotsGrid.js'
import DashboardPageHeader from '../components/DashboardPageHeader.js'
import KPIGrid from '../components/KPIGrid.js'
import MyBotsSectionHeader from '../components/MyBotsSectionHeader.js'
import RecentIntelligencePanel from '../components/RecentIntelligencePanel.js'

type Bot = {
  id: string
  name?: string
  description?: string
  status?: string
  conversations?: number
  lastActive?: string
  avatarUrl?: string
}
type Conversation = {
  id: string
  botLabel?: string
  question?: string
  answer?: string
  rating?: number | string
}

function Dashboard() {
  const cm = getClassMap()
  const http = useHttpClient()
  const [bots, setBots] = useState<Bot[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [botsLoading, setBotsLoading] = useState(true)
  const [convsLoading, setConvsLoading] = useState(true)

  useEffect(() => {
    http
      .get('/api/bots')
      .then((res) => setBots(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []))
      // Dashboard cards degrade to their empty states if the fetch fails.
      .catch(() => {})
      .finally(() => setBotsLoading(false))
    http
      .get('/api/conversations')
      .then((res) =>
        setConversations(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []),
      )
      // Dashboard cards degrade to their empty states if the fetch fails.
      .catch(() => {})
      .finally(() => setConvsLoading(false))
  }, [http])

  return (
    <AppShell>
      <div className={cm.cn(cm.sp('p', 8), cm.stack(8), 'overflow-y-auto')}>
        {/* Page Header */}
        <DashboardPageHeader />
        {/* KPI Cards */}
        <KPIGrid bots={bots} conversations={conversations} />
        {/* Content Area: Bento Style */}
        <div className={cm.grid({ cols: 12, gap: 'xl' })}>
          {/* My Bots Grid */}
          <div className={cm.cn(cm.stack(6), 'col-span-12 lg:col-span-8')}>
            <MyBotsSectionHeader />
            <BotsGrid bots={bots} loading={botsLoading} />
          </div>
          {/* Recent Conversations Preview */}
          <RecentIntelligencePanel conversations={conversations} loading={convsLoading} />
        </div>
      </div>
    </AppShell>
  )
}

export default Dashboard
export { Dashboard, Dashboard as DashboardPage }
