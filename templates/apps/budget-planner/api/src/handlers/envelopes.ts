import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const assignSchema = z.object({
  category_id: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  assigned: z.number(),
})

const moveSchema = z.object({
  from_category_id: z.string().min(1),
  to_category_id: z.string().min(1),
  amount: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const { month, year } = req.query
  const now = new Date()
  const m = Number(month) || now.getUTCMonth() + 1
  const y = Number(year) || now.getUTCFullYear()

  const envelopes = await findMany('envelopes', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'month', operator: '=', value: m },
      { field: 'year', operator: '=', value: y },
    ],
    orderBy: [{ field: 'category_id', direction: 'asc' }],
  })
  res.json(envelopes)
})

router.post('/assign', validateBody(assignSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const { category_id, month, year, assigned } = req.body

  const existing = await findMany<Record<string, unknown>>('envelopes', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'category_id', operator: '=', value: category_id },
      { field: 'month', operator: '=', value: month },
      { field: 'year', operator: '=', value: year },
    ],
  })

  if (existing.length > 0) {
    const updated = await updateById('envelopes', existing[0].id as string, { assigned })
    return res.json(updated.data)
  }

  const result = await create('envelopes', {
    user_id: userId,
    category_id,
    month,
    year,
    assigned,
    activity: 0,
    created_at: new Date(),
  })
  res.status(201).json(result.data)
})

router.post('/move', validateBody(moveSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const { from_category_id, to_category_id, amount, month, year } = req.body

  const fromEnvelopes = await findMany<Record<string, unknown>>('envelopes', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'category_id', operator: '=', value: from_category_id },
      { field: 'month', operator: '=', value: month },
      { field: 'year', operator: '=', value: year },
    ],
  })
  const toEnvelopes = await findMany<Record<string, unknown>>('envelopes', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'category_id', operator: '=', value: to_category_id },
      { field: 'month', operator: '=', value: month },
      { field: 'year', operator: '=', value: year },
    ],
  })

  if (fromEnvelopes.length === 0) {
    return res.status(404).json({ error: t('envelopes.sourceNotFound') })
  }

  // Move money between envelopes with EXPRESSION-based atomic updates rather
  // than the read → compute (`fromAssigned - amount`) → write-absolute pattern,
  // which is a TOCTOU lost-update: two concurrent moves both read the same
  // `assigned`, both compute from that stale base, and the later write clobbers
  // the earlier one — money silently appears/disappears. `SET assigned =
  // assigned - $1` is applied by the DB against the current row value, so
  // concurrent moves compose correctly. Scoped by user_id as defense in depth.
  const fromId = fromEnvelopes[0].id as string
  await query(`UPDATE envelopes SET assigned = assigned - $1 WHERE id = $2 AND user_id = $3`, [
    amount,
    fromId,
    userId,
  ])

  if (toEnvelopes.length > 0) {
    const toId = toEnvelopes[0].id as string
    await query(`UPDATE envelopes SET assigned = assigned + $1 WHERE id = $2 AND user_id = $3`, [
      amount,
      toId,
      userId,
    ])
  } else {
    await create('envelopes', {
      user_id: userId,
      category_id: to_category_id,
      month,
      year,
      assigned: amount,
      activity: 0,
      created_at: new Date(),
    })
  }
  res.json({ success: true })
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const idParam = req.params.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  const envelope = await findById<Record<string, unknown>>('envelopes', id)
  if (!envelope || envelope.user_id !== userId) {
    return res.status(404).json({ error: t('envelopes.notFound') })
  }
  res.json(envelope)
})

export default router
