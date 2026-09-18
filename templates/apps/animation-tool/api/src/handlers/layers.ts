import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

// --- Schemas ---

const ALLOWED_TYPES = ['shape', 'text', 'image', 'group', 'mask'] as const

const listQuerySchema = z.object({
  projectId: z.string().min(1),
})

const createLayerSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(200),
  type: z.enum(ALLOWED_TYPES).default('shape'),
  parentId: z.string().optional(),
  zIndex: z.coerce.number().int().optional(),
  transform: z.record(z.string(), z.unknown()).optional(),
})

const updateLayerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(ALLOWED_TYPES).optional(),
  parentId: z.string().nullable().optional(),
  zIndex: z.coerce.number().int().optional(),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
  transform: z.record(z.string(), z.unknown()).optional(),
})

// --- Helpers ---

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function projectOwnedBy(projectId: string, userId: string): Promise<boolean> {
  if (!UUID_RX.test(projectId)) return false
  try {
    const project = await findById<Record<string, unknown>>('animation_projects', projectId)
    return Boolean(project && project.owner_id === userId)
  } catch (_error) {
    // DB lookup failed; caller treats false as "not found / not owned"
    return false
  }
}

// --- Routes ---

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { projectId } = req.query as unknown as z.infer<typeof listQuerySchema>
    if (!(await projectOwnedBy(projectId, userId))) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const layers = await findMany('layers', {
      where: [{ field: 'project_id', operator: '=', value: projectId }],
      orderBy: [{ field: 'z_index', direction: 'asc' }],
    })
    res.json(layers)
  } catch (error) {
    logger.error('GET /api/layers failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createLayerSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createLayerSchema>
    if (!(await projectOwnedBy(body.projectId, userId))) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const result = await create('layers', {
      project_id: body.projectId,
      parent_id: body.parentId ?? null,
      name: body.name,
      type: body.type,
      z_index: body.zIndex ?? 0,
      locked: false,
      hidden: false,
      transform: body.transform ? JSON.stringify(body.transform) : null,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('POST /api/layers failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateLayerSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('layers', id)
    if (!existing) {
      res.status(404).json({ error: t('layers.notFound', {}, { defaultValue: 'Layer not found' }) })
      return
    }
    if (!(await projectOwnedBy(String(existing.project_id), userId))) {
      res.status(404).json({ error: t('layers.notFound', {}, { defaultValue: 'Layer not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateLayerSchema>
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.type !== undefined) updates.type = body.type
    if (body.parentId !== undefined) updates.parent_id = body.parentId
    if (body.zIndex !== undefined) updates.z_index = body.zIndex
    if (body.locked !== undefined) updates.locked = body.locked
    if (body.hidden !== undefined) updates.hidden = body.hidden
    if (body.transform !== undefined) updates.transform = JSON.stringify(body.transform)
    const result = await updateById('layers', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('PUT /api/layers/:id failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('layers', id)
    if (!existing) {
      res.status(404).json({ error: t('layers.notFound', {}, { defaultValue: 'Layer not found' }) })
      return
    }
    if (!(await projectOwnedBy(String(existing.project_id), userId))) {
      res.status(404).json({ error: t('layers.notFound', {}, { defaultValue: 'Layer not found' }) })
      return
    }
    await deleteById('layers', id)
    res.status(204).end()
  } catch (error) {
    logger.error('DELETE /api/layers/:id failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
