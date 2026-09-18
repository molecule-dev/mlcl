import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import BotAnalyticsKPICard from './BotAnalyticsKPICard.js'

type AnalyticsSummary = {
  totalConversations?: number
  totalMessages?: number
  resolutionRate?: number
  avgResponseTime?: string
  userSatisfaction?: number
}

function BotAnalyticsKPIRow({ analytics }: { analytics?: AnalyticsSummary | null }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const totalConversations = Number(analytics?.totalConversations ?? 0)
  const totalMessages = Number(analytics?.totalMessages ?? 0)
  const messagesPerConversation =
    totalConversations > 0 ? (totalMessages / totalConversations).toFixed(1) : '0.0'
  return (
    <div
      className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-4')}
      data-mol-id="kpi-row"
    >
      <BotAnalyticsKPICard
        icon="forum"
        iconBgClass="bg-primary-fixed"
        iconTextClass="text-primary"
        label={t(
          'botAnalyticsKpiRow.totalConversations',
          {},
          { defaultValue: 'Total Conversations' },
        )}
        value={totalConversations.toLocaleString()}
      />
      <BotAnalyticsKPICard
        icon="chat"
        iconBgClass="bg-tertiary-fixed"
        iconTextClass="text-tertiary"
        label={t('botAnalyticsKpiRow.totalMessages', {}, { defaultValue: 'Total Messages' })}
        value={totalMessages.toLocaleString()}
      />
      <BotAnalyticsKPICard
        icon="bar_chart"
        iconBgClass="bg-secondary-fixed"
        iconTextClass="text-secondary"
        label={t(
          'botAnalyticsKpiRow.messagesPerConversation',
          {},
          { defaultValue: 'Messages per conversation' },
        )}
        value={messagesPerConversation}
      />
      <BotAnalyticsKPICard
        icon="task_alt"
        iconBgClass="bg-tertiary-fixed"
        iconTextClass="text-tertiary"
        label={t('botAnalyticsKpiRow.resolutionRate', {}, { defaultValue: 'Resolution Rate' })}
        value={
          analytics?.resolutionRate != null
            ? `${analytics.resolutionRate}%`
            : t('botAnalyticsKpiRow.notAvailable', {}, { defaultValue: '—' })
        }
      />
    </div>
  )
}

export default BotAnalyticsKPIRow
export { BotAnalyticsKPIRow }
