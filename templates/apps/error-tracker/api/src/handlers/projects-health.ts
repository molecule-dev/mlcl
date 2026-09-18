/**
 * Projects health handler — derives per-project summary stats (issues
 * unresolved, recent events, last release) from the user's data so the
 * Projects page renders meaningful rows instead of a list of names.
 *
 * @module
 */

import { type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { seedDemoForUser } from './_seed.js'

const router = Router()

interface ProjectRow {
  id: string
  name: string
  slug: string
  projectType?: string | null
  framework?: string | null
}

interface IssueRow {
  project_id: string
  status: string
  level: string
  event_count?: number | null
  last_seen?: string | Date | null
}

interface ReleaseRow {
  project_id: string
  version: string
  deployed_at: string | Date
  health?: string | null
}

router.get('/', async (_req, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }
  await seedDemoForUser(userId)
  const projects = await findMany<ProjectRow>('projects', {
    where: [{ field: 'userId', operator: '=', value: userId }],
    limit: 100,
  })
  if (projects.length === 0) {
    res.json([])
    return
  }
  const issues = await findMany<IssueRow>('issues', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1000,
  })
  const releases = await findMany<ReleaseRow>('releases', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'deployed_at', direction: 'desc' }],
    limit: 200,
  })

  const result = projects.map((p) => {
    const projectIssues = issues.filter((i) => i.project_id === p.id)
    const unresolved = projectIssues.filter((i) => i.status === 'unresolved').length
    const critical = projectIssues.filter(
      (i) => i.level === 'fatal' && i.status === 'unresolved',
    ).length
    const events24h = projectIssues.reduce((acc, i) => {
      const lastSeen = i.last_seen ? new Date(i.last_seen).getTime() : 0
      if (Date.now() - lastSeen < 24 * 60 * 60_000) {
        return acc + Number(i.event_count ?? 0)
      }
      return acc
    }, 0)
    const projectReleases = releases.filter((r) => r.project_id === p.id)
    const latestRelease = projectReleases[0] ?? null
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      type: p.projectType ?? 'app',
      framework: p.framework ?? null,
      unresolved,
      critical,
      events_24h: events24h,
      latest_release: latestRelease
        ? {
            version: latestRelease.version,
            deployed_at: latestRelease.deployed_at,
            health: latestRelease.health ?? 'healthy',
          }
        : null,
    }
  })
  res.json(result)
})

export default router
