/**
 * Discover handler — derives top-by groupings (top files, top releases,
 * top user-impact, top regressions) from the user's issues + an event-log
 * search endpoint that the Discover page's "Run query" button hits.
 *
 * GET /api/discover           — aggregations payload
 * GET /api/discover/events    — flat event list filtered by level/env/release/q
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { seedDemoForUser } from './_seed.js'

const router = Router()

interface IssueRow {
  id: string
  title: string
  culprit?: string | null
  release?: string | null
  level: string
  status: string
  is_regression: boolean
  event_count?: number | null
  user_count?: number | null
  last_seen: string | Date
}

const tally = (
  issues: IssueRow[],
  keyOf: (i: IssueRow) => string | null | undefined,
  valueOf: (i: IssueRow) => number,
): Array<{ key: string; value: number; label: string }> => {
  const map = new Map<string, number>()
  for (const i of issues) {
    const key = keyOf(i)
    if (!key) continue
    map.set(key, (map.get(key) ?? 0) + valueOf(i))
  }
  return [...map.entries()]
    .map(([key, value]) => ({ key, value, label: key }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

router.get('/', async (_req, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }
  await seedDemoForUser(userId)
  const issues = await findMany<IssueRow>('issues', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'last_seen', direction: 'desc' }],
    limit: 500,
  })
  // top_files: extract filename from culprit (text before " in ")
  const top_files = tally(
    issues,
    (i) => (i.culprit ? (i.culprit.split(' in ')[0] ?? i.culprit) : null),
    (i) => Number(i.event_count ?? 1),
  )
  const top_releases = tally(
    issues,
    (i) => i.release ?? null,
    (i) => Number(i.event_count ?? 1),
  )
  const top_users_impact = tally(
    issues,
    (i) => i.title,
    (i) => Number(i.user_count ?? 0),
  ).slice(0, 5)
  const regressions = issues
    .filter((i) => i.is_regression && i.status !== 'resolved')
    .slice(0, 10)
    .map((i) => ({
      id: i.id,
      title: i.title,
      last_seen: i.last_seen,
      release: i.release ?? null,
    }))

  res.json({ top_files, top_releases, top_users_impact, regressions })
})

interface ErrorEventRow {
  id: string
  user_id: string
  issue_id: string
  message: string | null
  level: string
  environment: string | null
  release: string | null
  tags: { user_id?: string; user_email?: string } | null
  user_agent: string | null
  created_at: string | Date
}

/**
 * Parse a Sentry-ish key:value query string. Falls back to a plain text
 * substring match when no key:value tokens match. Returns the structured
 * filters and the residual free-text fragment.
 */
const parseQuery = (
  q: string,
): {
  level?: string
  environment?: string
  release?: string
  text?: string
} => {
  if (!q) return {}
  const tokens = q.match(/(\w+):\S+|"[^"]+"|\S+/g) ?? []
  const filters: { level?: string; environment?: string; release?: string; text?: string } = {}
  const text: string[] = []
  for (const raw of tokens) {
    const m = raw.match(/^(\w+):(.+)$/)
    if (m) {
      const key = m[1]?.toLowerCase()
      const value = m[2]
      if (!key || !value) continue
      if (key === 'level') filters.level = value
      else if (key === 'environment' || key === 'env') filters.environment = value
      else if (key === 'release') filters.release = value
      else text.push(raw)
    } else {
      text.push(raw.replace(/^"|"$/g, ''))
    }
  }
  if (text.length > 0) filters.text = text.join(' ')
  return filters
}

router.get('/events', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }
  await seedDemoForUser(userId)
  const q = String(req.query.q ?? '').trim()
  const parsed = parseQuery(q)
  const where: Array<{ field: string; operator: '='; value: unknown }> = [
    { field: 'user_id', operator: '=', value: userId },
  ]
  if (parsed.level) where.push({ field: 'level', operator: '=', value: parsed.level })
  if (parsed.environment)
    where.push({ field: 'environment', operator: '=', value: parsed.environment })
  if (parsed.release) where.push({ field: 'release', operator: '=', value: parsed.release })
  const limit = Math.max(1, Math.min(200, Number(req.query.limit ?? 100)))
  const events = await findMany<ErrorEventRow>('error_events', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit,
  })
  // Apply text filter in-memory (cheap given the limit cap).
  const text = parsed.text?.toLowerCase()
  const filtered = text
    ? events.filter((e) =>
        String(e.message ?? '')
          .toLowerCase()
          .includes(text),
      )
    : events
  res.json({
    query: q,
    parsed,
    count: filtered.length,
    events: filtered.map((e) => ({
      id: e.id,
      issue_id: e.issue_id,
      timestamp: e.created_at,
      level: e.level,
      message: e.message ?? '',
      release: e.release ?? '',
      environment: e.environment ?? '',
      user_email: e.tags?.user_email ?? '',
      user_agent: e.user_agent ?? '',
    })),
  })
})

export default router
