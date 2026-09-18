import { Router } from 'express'
import { z } from 'zod'

import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'
import { wrap } from './_async.js'

const router = Router()

const createPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  price: z.number().nonnegative(),
  interval: z.enum(['month', 'quarter', 'year']).default('month'),
  intervalCount: z.number().int().positive().optional().default(1),
  features: z.array(z.string()).optional().default([]),
  maxCustomizations: z.number().int().nonnegative().optional().default(0),
})

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  features: z.array(z.string()).optional(),
  maxCustomizations: z.number().int().nonnegative().optional(),
  status: z.enum(['active', 'archived']).optional(),
})

router.get(
  '/',
  wrap(async (_req, res) => {
    const plans = await findMany<Record<string, unknown>>('subscription_plans', {
      where: [{ field: 'status', operator: '=', value: 'active' }],
      orderBy: [
        { field: 'sort_order', direction: 'asc' },
        { field: 'price', direction: 'asc' },
      ],
    })
    res.json({ data: plans })
  }),
)

router.get(
  '/:id',
  wrap(async (req, res) => {
    const plan = await findById('subscription_plans', String(req.params.id))
    if (!plan) {
      res.status(404).json({ error: t('plans.notFound', {}, { defaultValue: 'Plan not found' }) })
      return
    }
    res.json(plan)
  }),
)

router.post(
  '/',
  requireAdmin,
  validateBody(createPlanSchema),
  wrap(async (req, res) => {
    const { name, description, price, interval, intervalCount, features, maxCustomizations } =
      req.body as z.infer<typeof createPlanSchema>

    const plan = await create('subscription_plans', {
      name,
      description: description ?? '',
      price: Math.round(Number(price) * 100),
      interval,
      interval_count: intervalCount,
      features: JSON.stringify(features),
      max_customizations: maxCustomizations,
      status: 'active',
    })

    res.status(201).json(plan.data ?? plan)
  }),
)

router.put(
  '/:id',
  requireAdmin,
  validateBody(updatePlanSchema),
  wrap(async (req, res) => {
    const body = req.body as z.infer<typeof updatePlanSchema>
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.price !== undefined) updates.price = Math.round(Number(body.price) * 100)
    if (body.features !== undefined) updates.features = JSON.stringify(body.features)
    if (body.maxCustomizations !== undefined) updates.max_customizations = body.maxCustomizations
    if (body.status !== undefined) updates.status = body.status

    const plan = await updateById('subscription_plans', String(req.params.id), updates)
    if (!plan?.data) {
      res.status(404).json({ error: t('plans.notFound', {}, { defaultValue: 'Plan not found' }) })
      return
    }
    res.json(plan.data)
  }),
)

export default router
