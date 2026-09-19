/**
 * Vendor checklist — category-grouped vendors with a booking pipeline.
 *
 * GET    /       the caller's vendors, grouped by category, with per-status counts
 * POST   /       add a vendor
 * PUT    /:id    edit a vendor (incl. status: researching|contacted|booked|paid)
 * DELETE /:id    remove a vendor
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { findWeddingForUser } from './_seed.js'

const router = Router()

export const VENDOR_CATEGORIES = [
  'venue',
  'catering',
  'photography',
  'videography',
  'attire',
  'flowers',
  'music',
  'beauty',
  'transportation',
  'other',
] as const

export const VENDOR_STATUSES = ['researching', 'contacted', 'booked', 'paid'] as const

const createVendorSchema = z.object({
  category: z.enum(VENDOR_CATEGORIES).optional(),
  name: z.string().min(1).max(200),
  contact: z.string().max(200).optional().nullable(),
  status: z.enum(VENDOR_STATUSES).optional(),
  notes: z.string().max(500).optional().nullable(),
})

const updateVendorSchema = createVendorSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const vendors = await findMany('vendors', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit: 200,
    })
    const statusCounts: Record<string, number> = {}
    for (const status of VENDOR_STATUSES) statusCounts[status] = 0
    for (const v of vendors) {
      const s = String(v.status ?? 'researching')
      statusCounts[s] = (statusCounts[s] ?? 0) + 1
    }
    res.json({ vendors, status_counts: statusCounts })
  } catch (err) {
    logger.error('vendors GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createVendorSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const wedding = await findWeddingForUser(userId)
    if (!wedding) {
      return res
        .status(404)
        .json({ error: t('wedding.notFound', {}, { defaultValue: 'Wedding not found' }) })
    }
    const result = await create('vendors', {
      ...req.body,
      user_id: userId,
      wedding_id: String(wedding.id),
      category: req.body.category ?? 'other',
      status: req.body.status ?? 'researching',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('vendors POST failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateVendorSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = getParamId(req)
      const vendor = await findById<Record<string, unknown>>('vendors', id)
      if (!vendor || String(vendor.user_id) !== userId) {
        return res
          .status(404)
          .json({ error: t('vendors.notFound', {}, { defaultValue: 'Vendor not found' }) })
      }
      const result = await updateById('vendors', id, {
        ...req.body,
        updated_at: new Date().toISOString(),
      })
      res.json(result.data)
    } catch (err) {
      logger.error('vendors PUT :id failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const vendor = await findById<Record<string, unknown>>('vendors', id)
    if (!vendor || String(vendor.user_id) !== userId) {
      return res
        .status(404)
        .json({ error: t('vendors.notFound', {}, { defaultValue: 'Vendor not found' }) })
    }
    await deleteById('vendors', id)
    res.status(204).end()
  } catch (err) {
    logger.error('vendors DELETE :id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
