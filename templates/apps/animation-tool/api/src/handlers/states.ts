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

const listQuerySchema = z.object({
  projectId: z.string().min(1),
})

const createStateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  animationId: z.string().optional(),
  transitions: z.array(z.unknown()).optional(),
  isInitial: z.boolean().optional(),
})

const updateStateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  animationId: z.string().optional(),
  transitions: z.array(z.unknown()).optional(),
  isInitial: z.boolean().optional(),
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
    const states = await findMany('animation_states', {
      where: [{ field: 'project_id', operator: '=', value: projectId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(states)
  } catch (error) {
    logger.error('GET /api/states failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const state = await findById<Record<string, unknown>>('animation_states', getParamId(req))
    if (!state) {
      res.status(404).json({ error: t('states.notFound', {}, { defaultValue: 'State not found' }) })
      return
    }
    if (!(await projectOwnedBy(String(state.project_id), userId))) {
      res.status(404).json({ error: t('states.notFound', {}, { defaultValue: 'State not found' }) })
      return
    }
    res.json(state)
  } catch (error) {
    logger.error('GET /api/states/:id failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createStateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { projectId, name, animationId, transitions, isInitial } = req.body as z.infer<
      typeof createStateSchema
    >
    if (!(await projectOwnedBy(projectId, userId))) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const result = await create('animation_states', {
      project_id: projectId,
      name: name ?? t('states.defaultName', {}, { defaultValue: 'New State' }),
      animation_id: animationId ?? null,
      transitions: transitions ? JSON.stringify(transitions) : '[]',
      is_initial: isInitial === true,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('POST /api/states failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateStateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('animation_states', id)
    if (!existing) {
      res.status(404).json({ error: t('states.notFound', {}, { defaultValue: 'State not found' }) })
      return
    }
    if (!(await projectOwnedBy(String(existing.project_id), userId))) {
      res.status(404).json({ error: t('states.notFound', {}, { defaultValue: 'State not found' }) })
      return
    }
    const updates: Record<string, unknown> = {}
    if (req.body.name !== undefined) updates.name = req.body.name
    if (req.body.animationId !== undefined) updates.animation_id = req.body.animationId
    if (req.body.transitions !== undefined)
      updates.transitions = JSON.stringify(req.body.transitions)
    if (req.body.isInitial !== undefined) updates.is_initial = req.body.isInitial
    const result = await updateById('animation_states', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('PUT /api/states/:id failed', error)
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
    const existing = await findById<Record<string, unknown>>('animation_states', id)
    if (!existing) {
      res.status(404).json({ error: t('states.notFound', {}, { defaultValue: 'State not found' }) })
      return
    }
    if (!(await projectOwnedBy(String(existing.project_id), userId))) {
      res.status(404).json({ error: t('states.notFound', {}, { defaultValue: 'State not found' }) })
      return
    }
    await deleteById('animation_states', id)
    res.status(204).end()
  } catch (error) {
    logger.error('DELETE /api/states/:id failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
