/**
 * Knowledge bases handler — vector indexes that ground agent responses.
 *
 * Backs the `/knowledge-bases` page. Owner-scoped CRUD plus a touch
 * (PUT /:id) helper that the "Re-sync" UI button uses to bump the
 * `updated_at` timestamp without changing other fields.
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
  embedding_model: z.string().min(1).max(255).default('text-embedding-3-small'),
})

const updateSchema = createSchema.partial()

interface KnowledgeBaseRow {
  id: string
  user_id: string
  name: string
  description: string
  embedding_model: string
  document_count: number
  ingested_at?: Date | string | null
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
    const items = await findMany<KnowledgeBaseRow>('knowledge_bases', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (err) {
    logger.error('knowledge-bases.list failed', err)
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
    const kb = await findById<KnowledgeBaseRow>('knowledge_bases', id)
    if (!kb || kb.user_id !== userId) {
      res.status(404).json({
        error: t('knowledgeBases.notFound', undefined, {
          defaultValue: 'Knowledge base not found',
        }),
      })
      return
    }
    res.json(kb)
  } catch (err) {
    logger.error('knowledge-bases.get failed', err)
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
    const result = await create<KnowledgeBaseRow>('knowledge_bases', {
      user_id: userId,
      name: body.name,
      description: body.description,
      embedding_model: body.embedding_model,
      document_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('knowledge-bases.create failed', err)
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
      const existing = await findById<KnowledgeBaseRow>('knowledge_bases', id)
      if (!existing || existing.user_id !== userId) {
        res.status(404).json({
          error: t('knowledgeBases.notFound', undefined, {
            defaultValue: 'Knowledge base not found',
          }),
        })
        return
      }
      const body = req.body as z.infer<typeof updateSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.name !== undefined) updates.name = body.name
      if (body.description !== undefined) updates.description = body.description
      if (body.embedding_model !== undefined) updates.embedding_model = body.embedding_model
      const result = await updateById<KnowledgeBaseRow>('knowledge_bases', id, updates)
      res.json(result.data)
    } catch (err) {
      logger.error('knowledge-bases.update failed', err)
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
    const existing = await findById<KnowledgeBaseRow>('knowledge_bases', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('knowledgeBases.notFound', undefined, {
          defaultValue: 'Knowledge base not found',
        }),
      })
      return
    }
    await deleteById('knowledge_bases', id)
    res.status(204).end()
  } catch (err) {
    logger.error('knowledge-bases.delete failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
