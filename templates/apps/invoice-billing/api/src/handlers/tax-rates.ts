import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { ensureDemoSeeded } from './_seed.js'

const router = Router()

const createTaxRateSchema = z.object({
  name: z.string().min(1),
  rate_pct: z.number().min(0).max(100),
  region: z.string().optional(),
})

const updateTaxRateSchema = z.object({
  name: z.string().min(1).optional(),
  rate_pct: z.number().min(0).max(100).optional(),
  region: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    await ensureDemoSeeded(userId)

    const rates = await findMany('tax_rates', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(rates)
  } catch (error) {
    logger.error('taxRates.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const rate = await findById<Record<string, unknown>>('tax_rates', id)
    if (!rate || rate.user_id !== userId) {
      return res.status(404).json({ error: t('taxRates.notFound') })
    }
    res.json(rate)
  } catch (error) {
    logger.error('taxRates.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createTaxRateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const { name, rate_pct, region } = req.body
    const result = await create('tax_rates', {
      user_id: userId,
      name,
      rate_pct,
      region,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('taxRates.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateTaxRateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('tax_rates', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('taxRates.notFound') })
    }

    const { name, rate_pct, region } = req.body
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (rate_pct !== undefined) updates.rate_pct = rate_pct
    if (region !== undefined) updates.region = region

    const result = await updateById('tax_rates', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('taxRates.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('tax_rates', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('taxRates.notFound') })
    }
    await deleteById('tax_rates', id)
    res.status(204).end()
  } catch (error) {
    logger.error('taxRates.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
