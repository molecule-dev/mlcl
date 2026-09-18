/**
 * `/api/favorites` — owner-scoped wrapper around the shared
 * `bookmarks` table. Each row represents a property a user has
 * starred. The frontend (Favorites.tsx, PropertyDetail save button)
 * calls these endpoints; the table itself is a generic resource so the
 * URL keeps a domain name.
 *
 * Routes:
 *   GET    /api/favorites              — list current user's saved properties
 *   POST   /api/favorites              — save a property by `{ property_id }`
 *   DELETE /api/favorites/:propertyId  — unsave a property
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteMany, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { decorateFavorites } from './_decorate.js'

const router = Router()

const createSchema = z.object({ property_id: z.string().min(1) })
const idParamSchema = z.object({ propertyId: z.string().min(1) })

function getParamPropertyId(req: Request): string {
  const id = req.params.propertyId
  return Array.isArray(id) ? id[0] : id
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const rows = await findMany<Record<string, unknown>>('bookmarks', {
    where: [
      { field: 'userId', operator: '=', value: userId },
      { field: 'resourceType', operator: '=', value: 'hotel' },
    ],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit: 200,
  })
  res.json({ data: await decorateFavorites(rows) })
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const { property_id } = req.body as z.infer<typeof createSchema>
  const existing = await findOne<Record<string, unknown>>('bookmarks', [
    { field: 'userId', operator: '=', value: userId },
    { field: 'resourceType', operator: '=', value: 'hotel' },
    { field: 'resourceId', operator: '=', value: property_id },
  ])
  if (existing) {
    res.status(200).json({ favored: true, property_id })
    return
  }
  await create('bookmarks', {
    userId,
    resourceType: 'hotel',
    resourceId: property_id,
  })
  res.status(201).json({ favored: true, property_id })
})

router.delete(
  '/:propertyId',
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    await deleteMany('bookmarks', [
      { field: 'userId', operator: '=', value: userId },
      { field: 'resourceType', operator: '=', value: 'hotel' },
      { field: 'resourceId', operator: '=', value: getParamPropertyId(req) },
    ])
    res.json({ favored: false, property_id: getParamPropertyId(req) })
  },
)

router.get('/count', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const total = await count('bookmarks', [
    { field: 'userId', operator: '=', value: userId },
    { field: 'resourceType', operator: '=', value: 'hotel' },
  ])
  res.json({ total })
})

export default router
