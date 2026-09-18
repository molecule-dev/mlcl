/**
 * Prompts handler — owns the user prompt library (saved prompts, scaffolds
 * and reusable seeds). Backed by `public.prompt_library` (migration 0010).
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({
  title: z.string().min(1).max(120),
  prompt_text: z.string().min(1).max(4000),
  negative_prompt: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
})

const updateSchema = createSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'position', direction: 'asc' }]
    const prompts = await findMany<Record<string, unknown>>('prompt_library', {
      where,
      orderBy,
    })
    res.json(prompts)
  } catch (error) {
    logger.error('prompts.list', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const body = req.body as z.infer<typeof createSchema>
    const created = await create('prompt_library', {
      user_id: userId,
      title: body.title,
      prompt_text: body.prompt_text,
      negative_prompt: body.negative_prompt ?? null,
      // jsonb columns expect a JSON-encoded string; node-postgres serializes
      // a raw JS array into Postgres array syntax (`{a,b}`), which Postgres
      // rejects when the column is jsonb.
      tags: JSON.stringify(body.tags ?? []),
      position: 0,
      last_used_at: null,
    })
    res.status(201).json(created.data)
  } catch (error) {
    logger.error('prompts.create', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
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
        return res.status(401).json({
          error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
        })
      }
      const id = String(req.params.id)
      const found = await findById<Record<string, unknown>>('prompt_library', id)
      if (!found || found.user_id !== userId) {
        return res.status(404).json({
          error: t('prompts.notFound', {}, { defaultValue: 'Prompt not found' }),
        })
      }
      const body = req.body as z.infer<typeof updateSchema>
      const patch: Record<string, unknown> = { ...body, updated_at: new Date() }
      // Same jsonb caveat as in the create path — JSON-encode the array.
      if (Array.isArray(patch.tags)) patch.tags = JSON.stringify(patch.tags)
      const updated = await updateById('prompt_library', id, patch)
      res.json(updated.data)
    } catch (error) {
      logger.error('prompts.update', error)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post('/:id/use', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const id = String(req.params.id)
    const found = await findById<Record<string, unknown>>('prompt_library', id)
    if (!found || found.user_id !== userId) {
      return res.status(404).json({
        error: t('prompts.notFound', {}, { defaultValue: 'Prompt not found' }),
      })
    }
    const updated = await updateById('prompt_library', id, {
      last_used_at: new Date(),
      updated_at: new Date(),
    })
    res.json(updated.data)
  } catch (error) {
    logger.error('prompts.use', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const id = String(req.params.id)
    const found = await findById<Record<string, unknown>>('prompt_library', id)
    if (!found || found.user_id !== userId) {
      return res.status(404).json({
        error: t('prompts.notFound', {}, { defaultValue: 'Prompt not found' }),
      })
    }
    await deleteById('prompt_library', id)
    res.status(204).end()
  } catch (error) {
    logger.error('prompts.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
