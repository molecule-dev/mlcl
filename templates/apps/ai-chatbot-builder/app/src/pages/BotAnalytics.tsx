// Phase 1 baseline — verbatim JSX of design-ai-chatbot-builder-bot-analytics.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AppShell } from '../components/AppShell.js'
import BotAnalyticsChartsRow from '../components/BotAnalyticsChartsRow.js'
import BotAnalyticsKPIRow from '../components/BotAnalyticsKpiRow.js'
import BotAnalyticsRecentConversationsTable from '../components/BotAnalyticsRecentConversationsTable.js'
import { BotAnalyticsTopActions } from '../components/BotAnalyticsTopActions.js'
import BotAnalyticsTopIntentsPanel from '../components/BotAnalyticsTopIntentsPanel.js'

type AnalyticsSummary = {
  totalConversations?: number
  resolutionRate?: number
  avgResponseTime?: string
  userSatisfaction?: number
  totalMessages?: number
}

type BotStatsResponse = {
  total_conversations?: number
  total_messages?: number
}

function BotAnalytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    http
      .get<BotStatsResponse | { data: BotStatsResponse }>(`/api/bots/${id}/stats`)
      .then((res) => {
        if (!active) return
        const body =
          (res && typeof res === 'object' && 'data' in (res as object)
            ? (res as { data: BotStatsResponse }).data
            : (res as BotStatsResponse)) ?? {}
        setAnalytics({
          totalConversations: Number(body.total_conversations ?? 0),
          totalMessages: Number(body.total_messages ?? 0),
        })
      })
      .catch(() => {
        if (active) setAnalytics({ totalConversations: 0, totalMessages: 0 })
      })
    return () => {
      active = false
    }
  }, [id, http])

  return (
    <AppShell
      className="bg-background text-on-surface antialiased"
      leading={
        <h1
          className={cm.cn(
            cm.textSize('lg'),
            'font-extrabold bg-gradient-to-r from-primary to-tertiary-fixed-dim bg-clip-text text-transparent whitespace-nowrap',
          )}
        >
          {t('botAnalyticsTopBar.title', {}, { defaultValue: 'Analytics Dashboard' })}
        </h1>
      }
      actions={<BotAnalyticsTopActions />}
    >
      {/* Main Content Canvas */}
      <main>
        <div className={cm.cn(cm.sp('p', 8), 'max-w-[1600px]', cm.mxAuto, cm.stack(8))}>
          {/* KPI Row */}
          <BotAnalyticsKPIRow analytics={analytics} />
          {/* Charts Section */}
          <BotAnalyticsChartsRow />
          {/* Mid Section: Top Intents */}
          <BotAnalyticsTopIntentsPanel />
          <BotAnalyticsRecentConversationsTable />
        </div>
      </main>
      {/* Floating Sparkle Background Decoration */}
      <div
        className={cm.cn(
          'w-[600px]',
          'h-[600px]',
          cm.roundedFull,
          'fixed top-0 right-0 -z-10 bg-primary/5 blur-[120px] translate-x-1/3 -translate-y-1/3',
        )}
      ></div>
      <div
        className={cm.cn(
          'w-[400px]',
          'h-[400px]',
          cm.roundedFull,
          'fixed bottom-0 left-64 -z-10 bg-tertiary-fixed-dim/10 blur-[100px] -translate-x-1/2 translate-y-1/2',
        )}
      ></div>
    </AppShell>
  )
}

export default BotAnalytics
export { BotAnalytics, BotAnalytics as BotAnalyticsPage }
