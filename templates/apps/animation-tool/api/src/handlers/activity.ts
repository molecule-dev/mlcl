/**
 * Activity handler — derives a recent-activity feed from the current
 * user's project edits and exports.
 */
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(10),
})

interface ActivityItem {
  id: string
  type: 'project_edited' | 'export_completed' | 'export_started'
  text: string
  detail?: string
  ago: string
  occurredAt: string
  projectId?: string
}

function timeAgo(iso: string): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const seconds = Math.floor((Date.now() - then) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { limit } = req.query as unknown as z.infer<typeof listQuerySchema>

    const projects = await findMany<Record<string, unknown>>('animation_projects', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit,
    })

    const items: ActivityItem[] = []
    for (const p of projects) {
      const updated = String(p.updated_at ?? p.created_at ?? new Date().toISOString())
      items.push({
        id: `project-${p.id}`,
        type: 'project_edited',
        text: `Updated ${String(p.name ?? 'project')}`,
        ago: timeAgo(updated),
        occurredAt: updated,
        projectId: String(p.id),
      })
    }

    if (projects.length > 0) {
      const projectIds = projects.map((p) => String(p.id))
      const exportsList = await findMany<Record<string, unknown>>('animation_exports', {
        where: [{ field: 'project_id', operator: 'in', value: projectIds }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit,
      })
      for (const e of exportsList) {
        const created = String(e.created_at ?? new Date().toISOString())
        const status = String(e.status ?? 'pending')
        items.push({
          id: `export-${e.id}`,
          type: status === 'completed' ? 'export_completed' : 'export_started',
          text:
            status === 'completed'
              ? `Export completed (${String(e.format ?? 'lottie')})`
              : `Started export (${String(e.format ?? 'lottie')})`,
          ago: timeAgo(created),
          occurredAt: created,
          projectId: String(e.project_id),
        })
      }
    }

    items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    res.json(items.slice(0, limit))
  } catch (error) {
    logger.error('GET /api/activity failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
