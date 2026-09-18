/**
 * Video projects handler — list/read/create/update/delete projects.
 *
 * Authorization: every project is owner-scoped via `owner_id = session.userId`.
 * Reads of another user's project return 404 to avoid leaking existence.
 */

import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireProjectOwner } from '../lib/authz.js'
import type { VideoEditorLimits } from '../tiers.js'

const createSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2_000).optional(),
  width: z.number().int().min(120).max(7_680).optional().default(1920),
  height: z.number().int().min(120).max(4_320).optional().default(1080),
  fps: z.number().int().min(10).max(120).optional().default(30),
  cover_url: z.string().max(2_000).optional(),
  template_id: z.string().min(1).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2_000).nullable().optional(),
  width: z.number().int().min(120).max(7_680).optional(),
  height: z.number().int().min(120).max(4_320).optional(),
  fps: z.number().int().min(10).max(120).optional(),
  duration_ms: z.number().int().min(0).optional(),
  cover_url: z.string().max(2_000).nullable().optional(),
})

const router = Router()

router.use(requireAuth)

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const projects = await findMany('video_projects', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(projects)
  } catch (error) {
    logger.error('projects.list', error)
    res.status(500).json({
      error: t('projects.listError', undefined, { defaultValue: 'Failed to list projects' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireProjectOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('projects.notFound', undefined, { defaultValue: 'Project not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (error) {
    logger.error('projects.read', error)
    res.status(500).json({
      error: t('projects.readError', undefined, { defaultValue: 'Failed to read project' }),
    })
  }
})

// Free-tier project cap — advertised on the Pricing page + defined in tiers.ts, but the create
// route never enforced it (the entitlements provider was wired at boot yet read by no handler).
const enforceProjectLimit = enforceLimit<VideoEditorLimits>({
  limitType: 'maxProjects',
  getLimit: (limits) => limits.maxProjects,
  getCurrent: async (userId) =>
    count('video_projects', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceProjectLimit, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const now = new Date().toISOString()
    const result = await create('video_projects', {
      owner_id: userId,
      name:
        parsed.data.name ?? t('projects.untitled', undefined, { defaultValue: 'Untitled Video' }),
      description: parsed.data.description ?? null,
      width: parsed.data.width ?? 1920,
      height: parsed.data.height ?? 1080,
      fps: parsed.data.fps ?? 30,
      duration_ms: 0,
      cover_url: parsed.data.cover_url ?? null,
      template_id: parsed.data.template_id ?? null,
      created_at: now,
      updated_at: now,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('projects.create', error)
    res.status(500).json({
      error: t('projects.createError', undefined, { defaultValue: 'Failed to create project' }),
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireProjectOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('projects.notFound', undefined, { defaultValue: 'Project not found' }),
      })
      return
    }
    const result = await updateById('video_projects', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('projects.update', error)
    res.status(500).json({
      error: t('projects.updateError', undefined, { defaultValue: 'Failed to update project' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireProjectOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('projects.notFound', undefined, { defaultValue: 'Project not found' }),
      })
      return
    }
    await deleteById('video_projects', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('projects.delete', error)
    res.status(500).json({
      error: t('projects.deleteError', undefined, { defaultValue: 'Failed to delete project' }),
    })
  }
})

export default router
