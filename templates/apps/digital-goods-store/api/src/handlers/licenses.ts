/**
 * Licenses handler — list / verify / activate / revoke per-product
 * license keys. Buyer reads their own; only the product creator may
 * revoke a license issued for their product.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const verifySchema = z.object({
  licenseKey: z.string().min(1),
  productId: z.string().min(1).optional(),
})

const activateSchema = z.object({
  licenseKey: z.string().min(1),
  deviceId: z.string().min(1).optional(),
})

const revokeSchema = z.object({
  reason: z.string().optional(),
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
    const licenses = await findMany<Record<string, unknown>>('licenses', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const hydrated = await Promise.all(
      licenses.map(async (license) => ({
        ...license,
        product: await findById('products', license.product_id as string),
      })),
    )
    res.json({ data: hydrated })
  } catch (err) {
    logger.error('licenses.list', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/verify', validateBody(verifySchema), async (req: Request, res: Response) => {
  try {
    const { licenseKey, productId } = req.body as z.infer<typeof verifySchema>
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'license_key', operator: '=', value: licenseKey },
    ]
    if (productId) where.push({ field: 'product_id', operator: '=', value: productId })
    const matches = await findMany<Record<string, unknown>>('licenses', { where, limit: 1 })
    const license = matches[0]
    if (!license) {
      res.status(404).json({
        valid: false,
        error: t('license.invalid', undefined, { defaultValue: 'Invalid license key' }),
      })
      return
    }
    if (license.status !== 'active') {
      res.json({
        valid: false,
        error: t('license.revoked', undefined, { defaultValue: 'This license has been revoked' }),
      })
      return
    }
    if ((license.activations as number) >= (license.max_activations as number)) {
      res.json({
        valid: false,
        error: t('license.maxActivations', undefined, {
          defaultValue: 'Maximum activations reached',
        }),
      })
      return
    }
    res.json({ valid: true, license })
  } catch (err) {
    logger.error('licenses.verify', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/activate', validateBody(activateSchema), async (req: Request, res: Response) => {
  try {
    const { licenseKey, deviceId } = req.body as z.infer<typeof activateSchema>
    const matches = await findMany<Record<string, unknown>>('licenses', {
      where: [{ field: 'license_key', operator: '=', value: licenseKey }],
      limit: 1,
    })
    const license = matches[0]
    if (!license) {
      res
        .status(404)
        .json({ error: t('license.invalid', undefined, { defaultValue: 'Invalid license key' }) })
      return
    }
    if (license.status !== 'active') {
      res.status(400).json({
        error: t('license.revoked', undefined, { defaultValue: 'This license has been revoked' }),
      })
      return
    }
    if ((license.activations as number) >= (license.max_activations as number)) {
      res.status(400).json({
        error: t('license.maxActivations', undefined, {
          defaultValue: 'Maximum activations reached',
        }),
      })
      return
    }
    const updated = await updateById('licenses', license.id as string, {
      activations: (license.activations as number) + 1,
      last_activated_at: new Date(),
      last_device_id: deviceId ?? null,
    })
    res.json(updated.data)
  } catch (err) {
    logger.error('licenses.activate', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/revoke', validateBody(revokeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const license = await findById<Record<string, unknown>>('licenses', getParamId(req))
    if (!license) {
      res
        .status(404)
        .json({ error: t('license.notFound', undefined, { defaultValue: 'License not found' }) })
      return
    }
    const product = await findById<Record<string, unknown>>(
      'products',
      license.product_id as string,
    )
    if (!product || product.creator_id !== userId) {
      res
        .status(403)
        .json({ error: t('license.unauthorized', undefined, { defaultValue: 'Not authorized' }) })
      return
    }
    const reason = (req.body as z.infer<typeof revokeSchema>).reason ?? null
    const updated = await updateById('licenses', getParamId(req), {
      status: 'revoked',
      revoked_at: new Date(),
      revoke_reason: reason,
    })
    res.json(updated.data)
  } catch (err) {
    logger.error('licenses.revoke', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
