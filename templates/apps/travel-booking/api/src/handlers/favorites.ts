import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteMany, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const propertyIdParam = z.object({ propertyId: z.string().min(1) })

interface BookmarkRow {
  id: string
  userId: string
  resourceType: string
  resourceId: string
  folder: string | null
  createdAt: string
  updatedAt: string
}

interface PropertyRow {
  id: string
  name: string
  city: string
  country: string
  rating: number
  review_count: number
  price_per_night_cents: number
  thumbnail_url: string | null
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const bookmarks = (await findMany('bookmarks', {
    where: [
      { field: 'userId', operator: '=', value: userId },
      { field: 'resourceType', operator: '=', value: 'property' },
    ],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit: 200,
  })) as BookmarkRow[]
  const out: Array<Record<string, unknown>> = []
  for (const b of bookmarks) {
    const property = (await findById('properties', b.resourceId)) as PropertyRow | null
    if (!property) continue
    out.push({
      id: b.id,
      property_id: property.id,
      name: property.name,
      city: property.city,
      country: property.country,
      rating: Number(property.rating),
      review_count: property.review_count,
      price_per_night_cents: property.price_per_night_cents,
      thumbnail_url: property.thumbnail_url,
      saved_at: b.createdAt,
    })
  }
  res.json({ data: out })
})

router.post(
  '/:propertyId',
  validateParams(propertyIdParam),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const propertyId = String(req.params.propertyId)
    const property = await findById('properties', propertyId)
    if (!property) {
      res
        .status(404)
        .json({ error: t('property.notFound', {}, { defaultValue: 'Property not found' }) })
      return
    }
    const existing = (await findMany('bookmarks', {
      where: [
        { field: 'userId', operator: '=', value: userId },
        { field: 'resourceType', operator: '=', value: 'property' },
        { field: 'resourceId', operator: '=', value: propertyId },
      ],
      limit: 1,
    })) as BookmarkRow[]
    if (existing[0]) {
      res.status(200).json({ data: { id: existing[0].id, propertyId, bookmarked: true } })
      return
    }
    const result = await create('bookmarks', {
      userId,
      resourceType: 'property',
      resourceId: propertyId,
    })
    res.status(201).json({
      data: { id: (result.data as { id?: string })?.id ?? null, propertyId, bookmarked: true },
    })
  },
)

router.delete(
  '/:propertyId',
  validateParams(propertyIdParam),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const propertyId = String(req.params.propertyId)
    const where: WhereCondition[] = [
      { field: 'userId', operator: '=', value: userId },
      { field: 'resourceType', operator: '=', value: 'property' },
      { field: 'resourceId', operator: '=', value: propertyId },
    ]
    await deleteMany('bookmarks', where)
    res.json({ data: { propertyId, bookmarked: false } })
  },
)

export default router
