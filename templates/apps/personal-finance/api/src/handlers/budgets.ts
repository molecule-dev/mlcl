import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createBudgetSchema = z.object({
  category_id: z.string().min(1),
  amount: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
})

const updateBudgetSchema = z.object({
  amount: z.number().positive(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const { month, year } = req.query

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]

    if (month) {
      where.push({ field: 'month', operator: '=', value: Number(month) })
    }
    if (year) {
      where.push({ field: 'year', operator: '=', value: Number(year) })
    }

    const budgets = await findMany('budgets', {
      where,
      orderBy: [{ field: 'category_id', direction: 'asc' }],
    })

    res.json(budgets)
  } catch (error) {
    logger.error('budgets.handler', error)
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
    const budget = await findById<Record<string, unknown>>('budgets', id)

    if (!budget || budget.user_id !== userId) {
      return res.status(404).json({ error: t('budgets.notFound') })
    }

    res.json(budget)
  } catch (error) {
    logger.error('budgets.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createBudgetSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const { category_id, amount, month, year } = req.body

    const result = await create('budgets', {
      user_id: userId,
      category_id,
      amount,
      month,
      year,
      created_at: new Date(),
    })

    res.status(201).json(result.data)
  } catch (error) {
    logger.error('budgets.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateBudgetSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('budgets', id)

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('budgets.notFound') })
    }

    const { amount } = req.body

    const result = await updateById('budgets', id, { amount })

    res.json(result.data)
  } catch (error) {
    logger.error('budgets.handler', error)
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
    const existing = await findById<Record<string, unknown>>('budgets', id)

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('budgets.notFound') })
    }

    await deleteById('budgets', id)
    res.status(204).end()
  } catch (error) {
    logger.error('budgets.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
