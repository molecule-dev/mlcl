import { Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { create, deleteMany, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { wrap } from './_async.js'

const router = Router()

const customizeSchema = z.object({
  selections: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive().optional().default(1),
    }),
  ),
})

router.get(
  '/mine/upcoming',
  wrap(async (_req, res) => {
    const userId = requireUser(res)
    if (!userId) return

    const boxes = await findMany<Record<string, unknown>>('boxes', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: 'in', value: ['pending', 'customizing', 'ready'] },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 1,
    })

    if (!boxes.length) {
      res.json(null)
      return
    }
    const box = boxes[0]
    const items = await findMany<Record<string, unknown>>('box_items', {
      where: [{ field: 'box_id', operator: '=', value: box.id as string }],
    })
    res.json({ ...box, items })
  }),
)

router.get(
  '/mine/history',
  wrap(async (req, res) => {
    const userId = requireUser(res)
    if (!userId) return

    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20

    const boxes = await findMany<Record<string, unknown>>('boxes', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: 'in', value: ['shipped', 'delivered'] },
      ],
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json({ data: boxes, page, limit })
  }),
)

router.get(
  '/:id',
  wrap(async (req, res) => {
    const userId = requireUser(res)
    if (!userId) return

    const box = (await findById('boxes', String(req.params.id))) as Record<string, unknown> | null
    if (!box) {
      res.status(404).json({ error: t('box.notFound', {}, { defaultValue: 'Box not found' }) })
      return
    }
    if (box.user_id !== userId) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }

    const items = await findMany<Record<string, unknown>>('box_items', {
      where: [{ field: 'box_id', operator: '=', value: box.id as string }],
    })
    res.json({ ...box, items })
  }),
)

router.put(
  '/mine/customize',
  validateBody(customizeSchema),
  wrap(async (req, res) => {
    const userId = requireUser(res)
    if (!userId) return
    const { selections } = req.body as z.infer<typeof customizeSchema>

    const box = await findOne<Record<string, unknown>>('boxes', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: 'in', value: ['pending', 'customizing'] },
    ])
    if (!box) {
      res.status(404).json({
        error: t('box.notFound', {}, { defaultValue: 'No customizable box found' }),
      })
      return
    }

    const sub = await findOne<Record<string, unknown>>('subscriptions', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'active' },
    ])
    if (!sub) {
      res.status(403).json({
        error: t('subscription.notFound', {}, { defaultValue: 'No active subscription' }),
      })
      return
    }

    const plan = (await findById('subscription_plans', sub.plan_id as string)) as Record<
      string,
      unknown
    > | null
    const max = (plan?.max_customizations as number) ?? 0
    if (selections.length > max) {
      res.status(400).json({
        error: t(
          'box.tooManyCustomizations',
          { max },
          { defaultValue: 'Exceeded maximum customizations for your plan' },
        ),
      })
      return
    }

    await deleteMany('box_items', [
      { field: 'box_id', operator: '=', value: box.id as string },
      { field: 'is_custom', operator: '=', value: true },
    ])

    for (const selection of selections) {
      await create('box_items', {
        box_id: box.id,
        product_id: selection.productId,
        quantity: selection.quantity ?? 1,
        is_custom: true,
      })
    }

    const updated = await updateById('boxes', box.id as string, { status: 'customizing' })
    res.json(updated.data ?? updated)
  }),
)

router.post(
  '/mine/finalize',
  wrap(async (_req, res) => {
    const userId = requireUser(res)
    if (!userId) return

    const box = await findOne<Record<string, unknown>>('boxes', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: 'in', value: ['pending', 'customizing'] },
    ])
    if (!box) {
      res.status(404).json({ error: t('box.notFound', {}, { defaultValue: 'No box to finalize' }) })
      return
    }

    const updated = await updateById('boxes', box.id as string, { status: 'ready' })
    res.json(updated.data ?? updated)
  }),
)

export default router
