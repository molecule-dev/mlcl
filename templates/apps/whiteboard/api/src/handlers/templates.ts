/**
 * Board templates handler — system-seeded + user-saved board templates
 * with instantiate-into-new-board.
 *
 * Authorization:
 *  - System templates (`is_system = true`): readable by anyone authed.
 *  - User templates: readable / writable by their owner only.
 *
 * @module
 */
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema, requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).default(''),
  snapshot: z.record(z.string(), z.unknown()).default({}),
})

const instantiateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
})

interface TemplateRow {
  id: string
  owner_id?: string | null
  user_id?: string | null
  name: string
  description?: string
  snapshot: unknown
  is_system?: boolean
  created_at?: Date | string
  updated_at?: Date | string
}

interface BoardRow {
  id: string
  owner_id: string
  user_id: string
}

interface ElementRow {
  id: string
  board_id: string
  user_id: string
  created_by: string
}

router.use(requireAuth)

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const where: WhereCondition[] = [{ field: 'is_system', operator: '=', value: true }]
    const system = await findMany<TemplateRow>('board_templates', { where, limit: 200 })
    const user = await findMany<TemplateRow>('board_templates', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 200,
    })
    res.json([...system, ...user])
  } catch (error) {
    logger.error('templates.list', error)
    res.status(500).json({
      error: t('templates.listError', undefined, { defaultValue: 'Failed to list templates' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const id = String(req.params.id)
    const template = await findById<TemplateRow>('board_templates', id)
    if (!template) {
      res.status(404).json({
        error: t('templates.notFound', undefined, { defaultValue: 'Template not found' }),
      })
      return
    }
    if (!template.is_system && template.user_id !== userId && template.owner_id !== userId) {
      res.status(404).json({
        error: t('templates.notFound', undefined, { defaultValue: 'Template not found' }),
      })
      return
    }
    res.json(template)
  } catch (error) {
    logger.error('templates.read', error)
    res.status(500).json({
      error: t('templates.readError', undefined, { defaultValue: 'Failed to read template' }),
    })
  }
})

router.post('/', validateBody(createTemplateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const body = req.body as z.infer<typeof createTemplateSchema>
    const result = await create<TemplateRow>('board_templates', {
      owner_id: userId,
      user_id: userId,
      name: body.name,
      description: body.description,
      snapshot: JSON.stringify(body.snapshot),
      is_system: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('templates.create', error)
    res.status(500).json({
      error: t('templates.createError', undefined, {
        defaultValue: 'Failed to create template',
      }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const id = String(req.params.id)
    const existing = await findById<TemplateRow>('board_templates', id)
    if (!existing || existing.is_system || existing.user_id !== userId) {
      res.status(404).json({
        error: t('templates.notFound', undefined, { defaultValue: 'Template not found' }),
      })
      return
    }
    await deleteById('board_templates', id)
    res.status(204).end()
  } catch (error) {
    logger.error('templates.delete', error)
    res.status(500).json({
      error: t('templates.deleteError', undefined, {
        defaultValue: 'Failed to delete template',
      }),
    })
  }
})

router.post(
  '/:id/instantiate',
  validateParams(idParamSchema),
  validateBody(instantiateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      const id = String(req.params.id)
      const template = await findById<TemplateRow>('board_templates', id)
      if (!template) {
        res.status(404).json({
          error: t('templates.notFound', undefined, { defaultValue: 'Template not found' }),
        })
        return
      }
      if (!template.is_system && template.user_id !== userId && template.owner_id !== userId) {
        res.status(404).json({
          error: t('templates.notFound', undefined, { defaultValue: 'Template not found' }),
        })
        return
      }
      const body = req.body as z.infer<typeof instantiateSchema>
      const board = await create<BoardRow>('boards', {
        owner_id: userId,
        user_id: userId,
        title: body.title ?? template.name,
        description: template.description ?? '',
        background: '#ffffff',
        is_public: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      const newBoardId = (board.data as BoardRow | undefined)?.id
      const snapshot =
        typeof template.snapshot === 'string'
          ? (JSON.parse(template.snapshot) as { elements?: ElementRow[] })
          : (template.snapshot as { elements?: ElementRow[] })
      if (newBoardId && Array.isArray(snapshot?.elements)) {
        for (const el of snapshot.elements) {
          const { id: _omit, ...rest } = el
          await create('board_elements', {
            ...rest,
            board_id: newBoardId,
            user_id: userId,
            created_by: userId,
          })
        }
      }
      res.status(201).json(board.data)
    } catch (error) {
      logger.error('templates.instantiate', error)
      res.status(500).json({
        error: t('templates.instantiateError', undefined, {
          defaultValue: 'Failed to instantiate template',
        }),
      })
    }
  },
)

export default router
