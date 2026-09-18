/**
 * Tools handler — registry of callable tools that agents can invoke.
 *
 * Backs the `/tools` page. Owner-scoped CRUD over the `tools` table.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).default(''),
  type: z.enum(['http', 'function', 'mcp', 'builtin']).default('http'),
  schema_json: z.record(z.string(), z.unknown()).default({}),
  handler_config_json: z.record(z.string(), z.unknown()).default({}),
})

const updateSchema = createSchema.partial()

interface ToolRow {
  id: string
  user_id: string
  name: string
  description: string
  type: string
  schema_json: unknown
  handler_config_json: unknown
  created_at?: Date | string
  updated_at?: Date | string
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const items = await findMany<ToolRow>('tools', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (err) {
    logger.error('tools.list failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const tool = await findById<ToolRow>('tools', id)
    if (!tool || tool.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('tools.notFound', undefined, { defaultValue: 'Tool not found' }) })
      return
    }
    res.json(tool)
  } catch (err) {
    logger.error('tools.get failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createSchema>
    const result = await create<ToolRow>('tools', {
      user_id: userId,
      name: body.name,
      description: body.description,
      type: body.type,
      schema_json: JSON.stringify(body.schema_json),
      handler_config_json: JSON.stringify(body.handler_config_json),
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('tools.create failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const existing = await findById<ToolRow>('tools', id)
      if (!existing || existing.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('tools.notFound', undefined, { defaultValue: 'Tool not found' }) })
        return
      }
      const body = req.body as z.infer<typeof updateSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.name !== undefined) updates.name = body.name
      if (body.description !== undefined) updates.description = body.description
      if (body.type !== undefined) updates.type = body.type
      if (body.schema_json !== undefined) updates.schema_json = JSON.stringify(body.schema_json)
      if (body.handler_config_json !== undefined)
        updates.handler_config_json = JSON.stringify(body.handler_config_json)
      const result = await updateById<ToolRow>('tools', id, updates)
      res.json(result.data)
    } catch (err) {
      logger.error('tools.update failed', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<ToolRow>('tools', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('tools.notFound', undefined, { defaultValue: 'Tool not found' }) })
      return
    }
    await deleteById('tools', id)
    res.status(204).end()
  } catch (err) {
    logger.error('tools.delete failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
