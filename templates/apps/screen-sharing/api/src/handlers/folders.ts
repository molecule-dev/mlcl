/**
 * Folders handler — library organisation. Owner-scoped CRUD; folders may
 * optionally live inside a workspace and are restricted to the creator.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  workspace_id: z.string().min(1).optional(),
  parent_id: z.string().min(1).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  parent_id: z.string().min(1).nullable().optional(),
})

const router = Router()

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'owner_id', operator: '=', value: userId },
    ]
    if (req.query.workspace_id) {
      where.push({ field: 'workspace_id', operator: '=', value: String(req.query.workspace_id) })
    }
    const folders = await findMany('folders', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit: 500,
    })
    res.json(folders)
  } catch (error) {
    logger.error('folders.list', error)
    res.status(500).json({
      error: t('folders.listError', undefined, { defaultValue: 'Failed to list folders' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const folder = await findById<Record<string, unknown>>('folders', req.params.id as string)
    if (!folder || String(folder.owner_id) !== String(userId)) {
      res.status(404).json({
        error: t('folders.notFound', undefined, { defaultValue: 'Folder not found' }),
      })
      return
    }
    res.json(folder)
  } catch (error) {
    logger.error('folders.read', error)
    res.status(500).json({
      error: t('folders.readError', undefined, { defaultValue: 'Failed to read folder' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const result = await create('folders', {
      owner_id: userId,
      workspace_id: parsed.data.workspace_id ?? null,
      name: parsed.data.name,
      parent_id: parsed.data.parent_id ?? null,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('folders.create', error)
    res.status(500).json({
      error: t('folders.createError', undefined, { defaultValue: 'Failed to create folder' }),
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const folder = await findById<Record<string, unknown>>('folders', req.params.id as string)
    if (!folder || String(folder.owner_id) !== String(userId)) {
      res.status(404).json({
        error: t('folders.notFound', undefined, { defaultValue: 'Folder not found' }),
      })
      return
    }
    const result = await updateById('folders', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('folders.update', error)
    res.status(500).json({
      error: t('folders.updateError', undefined, { defaultValue: 'Failed to update folder' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const folder = await findById<Record<string, unknown>>('folders', req.params.id as string)
    if (!folder || String(folder.owner_id) !== String(userId)) {
      res.status(404).json({
        error: t('folders.notFound', undefined, { defaultValue: 'Folder not found' }),
      })
      return
    }
    await deleteById('folders', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('folders.delete', error)
    res.status(500).json({
      error: t('folders.deleteError', undefined, { defaultValue: 'Failed to delete folder' }),
    })
  }
})

export default router
