/**
 * Templates handler — pre-built project templates browseable by any
 * authenticated user. "Use this template" creates a fresh project pre-
 * populated from the template snapshot.
 *
 * Authorization: read open to all authenticated users (templates are a
 * shared library); writes are intentionally not exposed (admins seed via
 * `0012_video_editor_seed_templates.sql`). The `/use` endpoint is owner-
 * scoped — the resulting project is owned by the requester.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const useSchema = z.object({
  name: z.string().min(1).max(200).optional(),
})

interface TemplateRow extends Record<string, unknown> {
  id: string
  name: string
  project_snapshot: Record<string, unknown>
}

const router = Router()

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  try {
    const where: Array<{ field: string; operator: '='; value: unknown }> = []
    if (req.query.category) {
      where.push({ field: 'category', operator: '=', value: String(req.query.category) })
    }
    const templates = await findMany('templates', {
      where,
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 200,
    })
    res.json(templates)
  } catch (error) {
    logger.error('templates.list', error)
    res.status(500).json({
      error: t('templates.listError', undefined, { defaultValue: 'Failed to list templates' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tpl = await findById<TemplateRow>('templates', req.params.id as string)
    if (!tpl) {
      res.status(404).json({
        error: t('templates.notFound', undefined, { defaultValue: 'Template not found' }),
      })
      return
    }
    res.json(tpl)
  } catch (error) {
    logger.error('templates.read', error)
    res.status(500).json({
      error: t('templates.readError', undefined, { defaultValue: 'Failed to read template' }),
    })
  }
})

router.post('/:id/use', async (req: Request, res: Response) => {
  const parsed = useSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const tpl = await findById<TemplateRow>('templates', req.params.id as string)
    if (!tpl) {
      res.status(404).json({
        error: t('templates.notFound', undefined, { defaultValue: 'Template not found' }),
      })
      return
    }
    const snap = (tpl.project_snapshot ?? {}) as {
      width?: number
      height?: number
      fps?: number
      tracks?: Array<{ name?: string; type?: string; position?: number }>
    }
    const now = new Date().toISOString()
    const projectResult = await create('video_projects', {
      owner_id: userId,
      name:
        parsed.data.name ??
        tpl.name ??
        t('projects.untitled', undefined, { defaultValue: 'Untitled Video' }),
      width: snap.width ?? 1920,
      height: snap.height ?? 1080,
      fps: snap.fps ?? 30,
      duration_ms: 0,
      template_id: tpl.id,
      created_at: now,
      updated_at: now,
    })
    const newProject = projectResult.data as { id?: string } | undefined
    if (newProject?.id && Array.isArray(snap.tracks)) {
      for (const trk of snap.tracks) {
        try {
          await create('tracks', {
            project_id: newProject.id,
            owner_id: userId,
            name: trk.name ?? t('timeline.defaultTrackName', undefined, { defaultValue: 'Track' }),
            type: trk.type ?? 'video',
            muted: false,
            locked: false,
            position: trk.position ?? 0,
            created_at: now,
          })
        } catch (_error) {
          // non-fatal — per-track create failure still yields a usable empty project
        }
      }
    }
    res.status(201).json(newProject)
  } catch (error) {
    logger.error('templates.use', error)
    res.status(500).json({
      error: t('templates.useError', undefined, { defaultValue: 'Failed to use template' }),
    })
  }
})

export default router
