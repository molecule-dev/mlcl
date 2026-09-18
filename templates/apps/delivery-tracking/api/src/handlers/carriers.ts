import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { type CarrierRow, decorateCarrier, decorateCarriers } from '../lib/decorate.js'
import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

function fail(res: Response, where: string, err: unknown): void {
  logger.error?.(`carriers.${where} failed: ${(err as Error)?.stack ?? err}`)
  res.status(500).json({
    error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
  })
}

const createCarrierSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  tracking_url_template: z.string().optional(),
  webhook_url: z.string().optional(),
  logo_url: z.string().optional(),
  base_url: z.string().optional(),
})

const updateCarrierSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  tracking_url_template: z.string().optional(),
  webhook_url: z.string().optional(),
  logo_url: z.string().optional(),
  base_url: z.string().optional(),
  status: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const carriers = await findMany<CarrierRow>('carriers', {
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(await decorateCarriers(carriers, userId))
  } catch (err) {
    fail(res, 'list', err)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const carrier = await findById<CarrierRow>('carriers', id)
    if (!carrier) {
      res
        .status(404)
        .json({ error: t('carriers.notFound', undefined, { defaultValue: 'Carrier not found' }) })
      return
    }
    res.json(await decorateCarrier(carrier, userId))
  } catch (err) {
    fail(res, 'get', err)
  }
})

router.post(
  '/',
  requireAdmin,
  validateBody(createCarrierSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const { name, code, tracking_url_template, webhook_url, logo_url, base_url } = req.body
      const result = await create<CarrierRow>('carriers', {
        name,
        code,
        tracking_url_template: tracking_url_template || null,
        webhook_url: webhook_url || null,
        logo_url: logo_url || null,
        base_url: base_url || null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      })
      const created = result.data as CarrierRow | undefined
      res.status(201).json(created ? await decorateCarrier(created, userId) : null)
    } catch (err) {
      fail(res, 'create', err)
    }
  },
)

router.put(
  '/:id',
  requireAdmin,
  validateBody(updateCarrierSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const id = getParamId(req)
      const carrier = await findById<CarrierRow>('carriers', id)
      if (!carrier) {
        res
          .status(404)
          .json({ error: t('carriers.notFound', undefined, { defaultValue: 'Carrier not found' }) })
        return
      }
      // Defense-in-depth: write only an explicit allow-list of fields rather
      // than spreading `...req.body`, so a future schema addition can't silently
      // widen the writable surface. validateBody already stripped unknown keys;
      // this keeps the persisted set pinned regardless.
      const { name, code, tracking_url_template, webhook_url, logo_url, base_url, status } =
        req.body
      const updates: Partial<CarrierRow> = { updated_at: new Date() }
      if (name !== undefined) updates.name = name
      if (code !== undefined) updates.code = code
      if (tracking_url_template !== undefined) updates.tracking_url_template = tracking_url_template
      if (webhook_url !== undefined) updates.webhook_url = webhook_url
      if (logo_url !== undefined) updates.logo_url = logo_url
      if (base_url !== undefined) updates.base_url = base_url
      if (status !== undefined) updates.status = status
      const result = await updateById<CarrierRow>('carriers', id, updates)
      const updated = result.data as CarrierRow | undefined
      res.json(updated ? await decorateCarrier(updated, userId) : null)
    } catch (err) {
      fail(res, 'update', err)
    }
  },
)

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const carrier = await findById('carriers', id)
    if (!carrier) {
      res
        .status(404)
        .json({ error: t('carriers.notFound', undefined, { defaultValue: 'Carrier not found' }) })
      return
    }
    await deleteById('carriers', id)
    res.status(204).end()
  } catch (err) {
    fail(res, 'delete', err)
  }
})

export default router
