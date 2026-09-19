import type { Request, Response } from 'express'
import { Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { promoteDueScheduledIssues } from './_scheduled.js'

const router = Router()

interface SubscriberRow {
  id: string
  status: string
  tier: string
  created_at?: string | null
}

interface IssueRow {
  id: string
  subject: string
  status: string
  publish_at?: string | null
}

interface IssueStatsRow {
  issue_id: string
  delivered: number
  opened: number
  clicked: number
}

/**
 * GET /stats/overview — the Dashboard numbers. Publication-wide by design:
 * a newsletter has ONE list, so subscriber counts and growth cover the whole
 * publication, while issue counts/open rates are computed from every
 * published issue. Growth is a 30-day cumulative series from subscribers'
 * created_at (UTC day buckets), and `lastIssue` carries the most recent
 * published issue's delivery stats for the open-rate card.
 */
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    await promoteDueScheduledIssues()

    const subscribers = (await findMany<SubscriberRow>('subscribers', {
      limit: 100_000,
    })) as SubscriberRow[]
    const issues = (await findMany<IssueRow>('issues', {
      limit: 100_000,
    })) as IssueRow[]
    const stats = (await findMany<IssueStatsRow>('issue_stats', {
      limit: 100_000,
    })) as IssueStatsRow[]
    const statsByIssue = new Map(stats.map((s) => [String(s.issue_id), s]))

    const subscribed = subscribers.filter((s) => s.status === 'subscribed')
    const subscriberCounts = {
      subscribed: subscribed.length,
      unsubscribed: subscribers.filter((s) => s.status === 'unsubscribed').length,
      pending: subscribers.filter((s) => s.status === 'pending').length,
      paid: subscribed.filter((s) => s.tier === 'paid').length,
      free: subscribed.filter((s) => s.tier !== 'paid').length,
      total: subscribers.length,
    }

    // 30-day cumulative growth (UTC), ending today. One point per day so the
    // chart shape reflects actual signup dates rather than a mock series.
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setUTCDate(today.getUTCDate() - 29)
    const beforeWindow = subscribers.filter((s) => {
      const d = s.created_at ? new Date(s.created_at).getTime() : 0
      return d < start.getTime()
    }).length
    const growthSeries: Array<{ date: string; total: number }> = []
    let running = beforeWindow
    for (let i = 0; i < 30; i++) {
      const day = new Date(start)
      day.setUTCDate(start.getUTCDate() + i)
      const dayEnd = day.getTime() + 24 * 60 * 60 * 1000
      running += subscribers.filter((s) => {
        const d = s.created_at ? new Date(s.created_at).getTime() : 0
        return d >= day.getTime() && d < dayEnd
      }).length
      growthSeries.push({ date: day.toISOString().slice(0, 10), total: running })
    }

    const published = issues
      .filter((i) => i.status === 'published')
      .sort((a, b) => new Date(b.publish_at ?? 0).getTime() - new Date(a.publish_at ?? 0).getTime())
    const lastIssueRow = published[0] ?? null
    let lastIssue: Record<string, unknown> | null = null
    if (lastIssueRow) {
      const s = statsByIssue.get(lastIssueRow.id) ?? { delivered: 0, opened: 0, clicked: 0 }
      lastIssue = {
        id: lastIssueRow.id,
        subject: lastIssueRow.subject,
        publish_at: lastIssueRow.publish_at,
        delivered: s.delivered,
        opened: s.opened,
        clicked: s.clicked,
        open_rate: s.delivered > 0 ? Math.round((s.opened / s.delivered) * 1000) / 10 : 0,
      }
    }

    // Audience totals across every published issue (aggregate reach).
    const totals = stats.reduce(
      (acc, s) => ({
        delivered: acc.delivered + Number(s.delivered ?? 0),
        opened: acc.opened + Number(s.opened ?? 0),
        clicked: acc.clicked + Number(s.clicked ?? 0),
      }),
      { delivered: 0, opened: 0, clicked: 0 },
    )

    res.json({
      subscriberCounts,
      growthSeries,
      issueCounts: {
        draft: issues.filter((i) => i.status === 'draft').length,
        scheduled: issues.filter((i) => i.status === 'scheduled').length,
        published: published.length,
      },
      lastIssue,
      totals: {
        ...totals,
        open_rate:
          totals.delivered > 0 ? Math.round((totals.opened / totals.delivered) * 1000) / 10 : 0,
        click_rate:
          totals.delivered > 0 ? Math.round((totals.clicked / totals.delivered) * 1000) / 10 : 0,
      },
    })
  } catch (err) {
    console.error('[stats.overview]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Kept for parity with the donor's analytics surface shape — total subscriber
// count only, so lightweight consumers don't pull the full overview.
router.get('/subscribers-count', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const total = await count('subscribers', [])
    res.json({ total })
  } catch (err) {
    console.error('[stats.subscribersCount]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
