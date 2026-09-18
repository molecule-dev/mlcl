import { type Request, type Response, Router } from 'express'

import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

router.use(authorizers.auth())

interface ConversationRow {
  id: string
  status: string
  escalated: boolean
  satisfaction_score: number | null
  csat: number | null
  message_count: number
  channel: string
  created_at: string
}

interface FeedbackRow {
  id: string
  rating: number
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string

    const conversations = await findMany<ConversationRow>('conversations', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      limit: 1000,
    })

    const feedback = await findMany<FeedbackRow>('feedback', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      limit: 1000,
    })

    const knowledgeCount = await count('knowledge_articles', [
      { field: 'owner_id', operator: '=', value: userId },
    ])

    const total = conversations.length
    const resolved = conversations.filter(
      (c) => c.status === 'resolved' || c.status === 'closed',
    ).length
    const escalated = conversations.filter((c) => c.escalated).length
    const open = conversations.filter((c) => c.status === 'open' || c.status === 'pending').length

    const csatValues = conversations
      .map((c) => c.satisfaction_score ?? c.csat ?? null)
      .filter((n): n is number => typeof n === 'number')
    const avgCsat = csatValues.length
      ? csatValues.reduce((s, v) => s + v, 0) / csatValues.length
      : 0

    const resolutionRate = total > 0 ? resolved / total : 0

    const positiveFeedback = feedback.filter((f) => f.rating >= 4).length
    const totalFeedback = feedback.length
    const helpfulRate = totalFeedback > 0 ? positiveFeedback / totalFeedback : 0

    const channels: Record<string, number> = {}
    for (const c of conversations) {
      channels[c.channel] = (channels[c.channel] ?? 0) + 1
    }

    // Group conversations by day (last 14 days)
    const days: Array<{ date: string; total: number; resolved: number; escalated: number }> = []
    const now = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const date = d.toISOString().slice(0, 10)
      days.push({ date, total: 0, resolved: 0, escalated: 0 })
    }
    for (const c of conversations) {
      const created = c.created_at ? new Date(c.created_at as unknown as string | Date) : null
      const date = created ? created.toISOString().slice(0, 10) : ''
      const day = days.find((d) => d.date === date)
      if (day) {
        day.total += 1
        if (c.status === 'resolved' || c.status === 'closed') day.resolved += 1
        if (c.escalated) day.escalated += 1
      }
    }

    res.json({
      summary: {
        totalConversations: total,
        resolvedConversations: resolved,
        escalatedConversations: escalated,
        openConversations: open,
        resolutionRate,
        averageCsat: avgCsat,
        helpfulRate,
        knowledgeArticles: knowledgeCount,
        totalFeedback,
      },
      channels,
      timeseries: days,
    })
  } catch (err) {
    console.error('[analytics] aggregation failed:', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
