import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createFolderSchema = z.object({
  name: z.string().min(1),
  parent_id: z.string().uuid().nullable().optional(),
})

const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  parent_id: z.string().uuid().nullable().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const folders = await findMany('folders', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(folders)
  } catch (error) {
    logger.error('folders.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const folder = await findById<Record<string, unknown>>('folders', id)
    if (!folder || folder.user_id !== userId) {
      return res.status(404).json({
        error: t('folders.notFound', undefined, { defaultValue: 'Folder not found.' }),
      })
    }
    res.json(folder)
  } catch (error) {
    logger.error('folders.get', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(createFolderSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof createFolderSchema>
    const result = await create('folders', {
      user_id: userId,
      name: body.name,
      parent_id: body.parent_id ?? null,
      created_at: new Date(),
    })
    res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('folders.create', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.put('/:id', validateBody(updateFolderSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('folders', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('folders.notFound', undefined, { defaultValue: 'Folder not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateFolderSchema>
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.parent_id !== undefined) updates.parent_id = body.parent_id
    const result = await updateById('folders', id, updates)
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('folders.update', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('folders', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('folders.notFound', undefined, { defaultValue: 'Folder not found.' }),
      })
    }
    await deleteById('folders', id)
    res.status(204).end()
  } catch (error) {
    logger.error('folders.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
