/**
 * Company-settings handler — single row per user.
 *
 * The Settings page surfaces these fields (legal name, EIN, address,
 * pay-schedule cadence). The seed writes one row on first sign-up; this
 * handler upserts the same row on PUT (UNIQUE user_id keeps it 1:1).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const updateSchema = z.object({
  legal_name: z.string().optional(),
  ein: z.string().optional(),
  address: z.string().optional(),
  fiscal_year: z.string().optional(),
  cadence: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']).optional(),
  cycle_end_day: z.string().optional(),
  pay_date_offset: z.number().int().min(0).max(7).optional(),
  holiday_behavior: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  await seedDemoForUser(userId)

  const rows = await findMany<Record<string, unknown>>('company_settings', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  if (rows.length === 0) {
    // No row yet — return the schema's defaults so the UI has something to render.
    return res.json({
      user_id: userId,
      legal_name: '',
      ein: '',
      address: '',
      fiscal_year: 'January – December',
      cadence: 'biweekly',
      cycle_end_day: 'Friday',
      pay_date_offset: 3,
      holiday_behavior: 'Pay one business day early',
    })
  }
  res.json(rows[0])
})

router.put('/', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const updates = req.body
  const existing = await findMany<Record<string, unknown>>('company_settings', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  if (existing.length > 0 && existing[0].id) {
    const result = await updateById('company_settings', existing[0].id as string, {
      ...updates,
      updatedAt: new Date(),
    })
    return res.json(result.data)
  }
  const result = await create('company_settings', {
    user_id: userId,
    legal_name: updates.legal_name ?? '',
    ein: updates.ein ?? '',
    address: updates.address ?? '',
    fiscal_year: updates.fiscal_year ?? 'January – December',
    cadence: updates.cadence ?? 'biweekly',
    cycle_end_day: updates.cycle_end_day ?? 'Friday',
    pay_date_offset: updates.pay_date_offset ?? 3,
    holiday_behavior: updates.holiday_behavior ?? 'Pay one business day early',
    created_at: new Date(),
  })
  res.status(201).json(result.data)
})

export default router
