/**
 * Activity feed handler — derives a recent-activity feed for the
 * authenticated user from translation_segments + translation_projects +
 * notifications. Returns a normalized shape consumed by the dashboard
 * activity timeline and the notifications page.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface ActivityRow {
  id: string
  actor: string
  actor_initials: string
  kind: 'approved' | 'uploaded' | 'mt_pass' | 'commented' | 'glossary_updated' | 'review_requested'
  text: string
  project?: { id: string; name: string }
  timestamp: string
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const projects = (await findMany<Record<string, unknown>>('translation_projects', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 20,
    })) as Array<Record<string, unknown>>
    const notifs = (await findMany<Record<string, unknown>>('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 20,
    })) as Array<Record<string, unknown>>

    const out: ActivityRow[] = []
    for (const n of notifs) {
      out.push({
        id: String(n.id),
        actor: String(n.title ?? 'Workspace'),
        actor_initials: '',
        kind: ((): ActivityRow['kind'] => {
          const k = String(n.kind ?? 'info')
          if (k === 'review_requested' || k === 'approved' || k === 'commented') {
            return k as ActivityRow['kind']
          }
          return 'commented'
        })(),
        text: String(n.body ?? ''),
        timestamp:
          n.created_at instanceof Date ? n.created_at.toISOString() : String(n.created_at ?? ''),
      })
    }
    for (const p of projects.slice(0, 10)) {
      out.push({
        id: `proj_${String(p.id)}`,
        actor: String(p.name ?? 'Project'),
        actor_initials: '',
        kind: 'uploaded',
        text: 'updated project',
        project: { id: String(p.id), name: String(p.name ?? '') },
        timestamp:
          p.updated_at instanceof Date ? p.updated_at.toISOString() : String(p.updated_at ?? ''),
      })
    }
    res.json(out)
  } catch (error) {
    logger.error('activity.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
