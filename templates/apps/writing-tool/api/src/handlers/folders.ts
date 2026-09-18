/**
 * Folder handlers — owner-scoped CRUD over `folders`.
 *
 * Folders form a per-user tree (parent_id self-FK). Documents may live
 * inside a folder (or be unfiled). Authorization scopes every query and
 * mutation by `owner_id` — the user can never see another user's folder
 * tree, regardless of guessed ids (no IDOR).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type FolderRow,
  internalError,
  requireFolder,
  requireUser,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const listSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
})

const createSchema = z.object({
  name: z.string().min(1).max(255),
  parent_id: z.string().uuid().nullable().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  position: z.number().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = listSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
    if (parsed.data.parent_id === undefined) {
      // No filter — return entire flat tree.
    } else if (parsed.data.parent_id === null) {
      where.push({ field: 'parent_id', operator: 'is_null' })
    } else {
      where.push({ field: 'parent_id', operator: '=', value: parsed.data.parent_id })
    }
    const items = await findMany<FolderRow>('folders', {
      where,
      orderBy: [
        { field: 'position', direction: 'asc' },
        { field: 'name', direction: 'asc' },
      ],
    })
    res.json(items)
  } catch (error) {
    logger.error('folders.list', error)
    internalError(res)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const folder = await requireFolder(id.data.id, ownerId)
    if (!folder) {
      res
        .status(404)
        .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
      return
    }
    res.json(folder)
  } catch (error) {
    logger.error('folders.get', error)
    internalError(res)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    if (parsed.data.parent_id) {
      const parent = await requireFolder(parsed.data.parent_id, ownerId)
      if (!parent) {
        res
          .status(404)
          .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
        return
      }
    }
    const result = await create<FolderRow>('folders', {
      owner_id: ownerId,
      parent_id: parsed.data.parent_id ?? null,
      name: parsed.data.name,
      position: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('folders.create', error)
    internalError(res)
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const folder = await requireFolder(id.data.id, ownerId)
    if (!folder) {
      res
        .status(404)
        .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
      return
    }
    if (body.data.parent_id) {
      const parent = await requireFolder(body.data.parent_id, ownerId)
      if (!parent) {
        res
          .status(404)
          .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
        return
      }
      if (parent.id === folder.id) {
        res.status(400).json({
          error: t('folder.cycleRefused', {}, { defaultValue: 'Cannot move folder under itself' }),
        })
        return
      }
    }
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.data.name !== undefined) updates.name = body.data.name
    if (body.data.parent_id !== undefined) updates.parent_id = body.data.parent_id
    if (body.data.position !== undefined) updates.position = body.data.position
    const result = await updateById<FolderRow>('folders', id.data.id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('folders.update', error)
    internalError(res)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const folder = await requireFolder(id.data.id, ownerId)
    if (!folder) {
      res
        .status(404)
        .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
      return
    }
    await deleteById('folders', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('folders.delete', error)
    internalError(res)
  }
})

export default router
