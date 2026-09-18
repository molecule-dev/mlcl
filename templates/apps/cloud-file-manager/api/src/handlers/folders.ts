/**
 * Folders handler — folder CRUD with breadcrumbs and recursive delete.
 *
 * All endpoints scope by `owner_id = res.locals.session.userId` to prevent
 * IDOR (G6). Input validated via zod (G5). DataStore only — no raw SQL (G3).
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  deleteMany,
  findById,
  findMany,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { CloudFileManagerLimits } from '../tiers.js'

const router = Router()

interface FolderRow {
  id: string
  owner_id: string
  parent_id: string | null
  name: string
  color: string | null
  created_at: Date
  updated_at: Date
}

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parent_id: z.string().uuid().nullable().optional(),
  color: z.string().max(32).nullable().optional(),
})

const updateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  color: z.string().max(32).nullable().optional(),
})

const moveFolderSchema = z.object({
  parent_id: z.string().uuid().nullable(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const { parent_id } = req.query
    const where: Array<{ field: string; operator: '=' | 'is_null'; value?: unknown }> = [
      { field: 'owner_id', operator: '=', value: userId },
    ]
    if (parent_id) {
      where.push({ field: 'parent_id', operator: '=', value: String(parent_id) })
    } else {
      where.push({ field: 'parent_id', operator: 'is_null' })
    }

    const folders = await findMany<FolderRow>('folders', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(folders)
  } catch (error) {
    logger.error('folders.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const id = getParamId(req)
    const folder = await findById<FolderRow>('folders', id)
    if (!folder || folder.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
      return
    }

    const breadcrumbs = await getBreadcrumbs(folder.id, userId)
    res.json({ ...folder, breadcrumbs })
  } catch (error) {
    logger.error('folders.read', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<CloudFileManagerLimits>({
    limitType: 'maxFolders',
    getLimit: (limits) => limits.maxFolders,
    getCurrent: async (userId) =>
      count('folders', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createFolderSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
        return
      }

      const { name, parent_id, color } = req.body as z.infer<typeof createFolderSchema>

      if (parent_id) {
        const parent = await findById<FolderRow>('folders', parent_id)
        if (!parent || parent.owner_id !== userId) {
          res.status(404).json({
            error: t('folder.parentNotFound', {}, { defaultValue: 'Parent folder not found' }),
          })
          return
        }
      }

      const result = await create<FolderRow>('folders', {
        owner_id: userId,
        parent_id: parent_id ?? null,
        name,
        color: color ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('folders.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.patch('/:id', validateBody(updateFolderSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const id = getParamId(req)
    const existing = await findById<FolderRow>('folders', id)
    if (!existing || existing.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
      return
    }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    const body = req.body as z.infer<typeof updateFolderSchema>
    if (body.name !== undefined) updates.name = body.name
    if (body.color !== undefined) updates.color = body.color

    const result = await updateById<FolderRow>('folders', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('folders.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/move', validateBody(moveFolderSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const id = getParamId(req)
    const existing = await findById<FolderRow>('folders', id)
    if (!existing || existing.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
      return
    }

    const { parent_id } = req.body as z.infer<typeof moveFolderSchema>
    if (parent_id) {
      const parent = await findById<FolderRow>('folders', parent_id)
      if (!parent || parent.owner_id !== userId) {
        res.status(404).json({
          error: t('folder.parentNotFound', {}, { defaultValue: 'Parent folder not found' }),
        })
        return
      }
    }

    const result = await updateById<FolderRow>('folders', id, {
      parent_id: parent_id ?? null,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('folders.move', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const id = getParamId(req)
    const existing = await findById<FolderRow>('folders', id)
    if (!existing || existing.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
      return
    }

    await deleteFolderRecursive(id, userId)
    res.status(204).end()
  } catch (error) {
    logger.error('folders.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

async function getBreadcrumbs(
  folderId: string,
  ownerId: string,
): Promise<Array<{ id: string; name: string }>> {
  const out: Array<{ id: string; name: string }> = []
  let currentId: string | null = folderId
  // Bound the walk to defend against accidental cycles or deep trees.
  for (let i = 0; i < 64 && currentId; i++) {
    const folder: FolderRow | null = await findById<FolderRow>('folders', currentId)
    if (!folder || folder.owner_id !== ownerId) break
    out.unshift({ id: folder.id, name: folder.name })
    currentId = folder.parent_id
  }
  return out
}

async function deleteFolderRecursive(folderId: string, ownerId: string): Promise<void> {
  const subfolders = await findMany<FolderRow>('folders', {
    where: [
      { field: 'parent_id', operator: '=', value: folderId },
      { field: 'owner_id', operator: '=', value: ownerId },
    ],
  })
  for (const sub of subfolders) {
    await deleteFolderRecursive(sub.id, ownerId)
  }
  // Cascade files in this folder owned by the same user.
  await deleteMany('files', [
    { field: 'folder_id', operator: '=', value: folderId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
  await deleteById('folders', folderId)
}

export default router
