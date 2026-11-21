import { Router } from 'express'

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'
import {
  addBookmark,
  createBookmarkSchema,
  getBookmarks,
  getFolders,
  isBookmarked,
  removeBookmark,
} from '@molecule/api-resource-bookmark'

// Edit paths, request fields and JSON here. The services in @molecule/api-resource-bookmark own storage.

/**
 * Adds a bookmark for the current user. Idempotent.
 *
 * @param req - The request with bookmark body (resourceType, resourceId, folder?).
 * @param res - The response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized.' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const parsed = createBookmarkSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'bookmark.error.validationFailed' })
    return
  }

  try {
    const bookmark = await addBookmark(
      userId,
      parsed.data.resourceType,
      parsed.data.resourceId,
      parsed.data.folder,
    )
    res.status(201).json(bookmark)
  } catch (error) {
    logger.error('Failed to add bookmark', { userId, error })
    res.status(500).json({
      error: t('bookmark.error.createFailed', undefined, {
        defaultValue: 'Failed to add bookmark',
      }),
      errorKey: 'bookmark.error.createFailed',
    })
  }
}

/** Upper bound for the list page size — an uncapped `limit` is a table-dump primitive (e.g. `?limit=999999999`). */
const MAX_LIST_LIMIT = 500

/**
 * Lists the current user's bookmarks with optional filtering and pagination.
 *
 * @param req - The request with optional query params (resourceType, folder, limit, offset).
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized.' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const resourceType = req.query.resourceType as string | undefined
  const folder = req.query.folder as string | undefined
  const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, parseInt(req.query.limit as string, 10) || 20))
  const offset = parseInt(req.query.offset as string, 10) || 0

  try {
    const result = await getBookmarks(userId, { resourceType, folder, limit, offset })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list bookmarks', { userId, error })
    res.status(500).json({
      error: t('bookmark.error.listFailed', undefined, {
        defaultValue: 'Failed to list bookmarks',
      }),
      errorKey: 'bookmark.error.listFailed',
    })
  }
}

/**
 * Checks whether the current user has bookmarked a resource.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object.
 */
export async function check(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized.' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { resourceType, resourceId } = req.params
  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('bookmark.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'bookmark.error.missingResource',
    })
    return
  }

  try {
    const bookmarked = await isBookmarked(userId, resourceType, resourceId)
    res.json({ bookmarked })
  } catch (error) {
    logger.error('Failed to check bookmark', { userId, resourceType, resourceId, error })
    res.status(500).json({
      error: t('bookmark.error.checkFailed', undefined, {
        defaultValue: 'Failed to check bookmark',
      }),
      errorKey: 'bookmark.error.checkFailed',
    })
  }
}

/**
 * Lists all unique folder names for the current user's bookmarks.
 *
 * @param _req - The request (unused).
 * @param res - The response object.
 */
export async function folders(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized.' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  try {
    const result = await getFolders(userId)
    res.json({ folders: result })
  } catch (error) {
    logger.error('Failed to list bookmark folders', { userId, error })
    res.status(500).json({
      error: t('bookmark.error.foldersFailed', undefined, {
        defaultValue: 'Failed to list folders',
      }),
      errorKey: 'bookmark.error.foldersFailed',
    })
  }
}

/**
 * Removes a bookmark by resource type and ID.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized.' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { resourceType, resourceId } = req.params
  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('bookmark.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'bookmark.error.missingResource',
    })
    return
  }

  try {
    await removeBookmark(userId, resourceType, resourceId)
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to remove bookmark', { userId, resourceType, resourceId, error })
    res.status(500).json({
      error: t('bookmark.error.deleteFailed', undefined, {
        defaultValue: 'Failed to remove bookmark',
      }),
      errorKey: 'bookmark.error.deleteFailed',
    })
  }
}

const router = Router()

router.post('/bookmarks', create)
router.get('/bookmarks', list)
router.get('/bookmarks/folders', folders)
router.get('/bookmarks/check/:resourceType/:resourceId', check)
router.delete('/bookmarks/:resourceType/:resourceId', del)

export default router
