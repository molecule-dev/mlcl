import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import {
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  query,
  updateById,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const companySchema = z.object({
  legal_name: z.string().optional(),
  billing_email: z.string().optional(),
  tax_id: z.string().optional(),
  address: z.string().optional(),
  default_tax_rate_pct: z.number().optional(),
  filing_method: z.string().optional(),
  fiscal_year_start: z.string().optional(),
  // Invoice-default preferences (migration 0012). The Settings page's
  // "Invoice defaults" section and the new-invoice rail persist these.
  currency: z.string().optional(),
  payment_terms: z.string().optional(),
  invoice_late_fee_enabled: z.boolean().optional(),
  invoice_recurring_enabled: z.boolean().optional(),
})

// Fallback shape for GET before the user has ever saved a profile, and the
// seed for create on first PUT. Must mirror the migration's column defaults.
const COMPANY_DEFAULTS = {
  legal_name: '',
  billing_email: '',
  tax_id: '',
  address: '',
  default_tax_rate_pct: 0,
  filing_method: 'cash',
  fiscal_year_start: 'January',
  currency: 'USD',
  payment_terms: 'net_30',
  invoice_late_fee_enabled: false,
  invoice_recurring_enabled: false,
}

router.get('/company', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    // company_profile uses user_id as the primary key, so findById doesn't
    // apply (it queries by `id`). Use findOne with a user_id filter instead.
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const row = await findOne<Record<string, unknown>>('company_profile', where)
    res.json(row ?? { user_id: userId, ...COMPANY_DEFAULTS })
  } catch (err) {
    console.error('GET /settings/company failed:', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/company', validateBody(companySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const existing = await findOne<Record<string, unknown>>('company_profile', where)
    const payload: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    if (existing) {
      // updateById on a table whose PK is user_id is not directly supported by
      // the @molecule/api-database CRUD helpers, so fall back to a parameterised
      // UPDATE statement that mutates only the supplied keys.
      const setKeys = Object.keys(payload)
      const setClause = setKeys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
      const values = [...setKeys.map((k) => payload[k]), userId]
      const result = await query<Record<string, unknown>>(
        `UPDATE "company_profile" SET ${setClause} WHERE "user_id" = $${setKeys.length + 1} RETURNING *`,
        values,
      )
      res.json(result.rows?.[0] ?? null)
    } else {
      const result = await create('company_profile', {
        user_id: userId,
        ...COMPANY_DEFAULTS,
        ...req.body,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json((result as { data?: unknown }).data ?? result)
    }
  } catch (err) {
    console.error('PUT /settings/company failed:', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/integrations', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
    const rows = await findMany('integrations', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error('settings.integrations.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

const integrationSchema = z.object({
  name: z.string().min(1),
  status: z.string().optional(),
})

router.post(
  '/integrations',
  validateBody(integrationSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
      const result = await create('integrations', {
        user_id: userId,
        name: req.body.name,
        status: req.body.status ?? 'connected',
        last_synced_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json((result as { data?: unknown }).data ?? result)
    } catch (error) {
      logger.error('settings.integrations.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

const integrationUpdateSchema = z.object({
  status: z.string().optional(),
  last_synced_at: z.string().optional(),
})

router.put(
  '/integrations/:id',
  validateBody(integrationUpdateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('integrations', id)
      if (!existing || existing.user_id !== userId) {
        return res.status(404).json({ error: t('errors.notFound') })
      }
      const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
      if (typeof req.body.last_synced_at === 'string')
        updates.last_synced_at = new Date(req.body.last_synced_at)
      const result = await updateById('integrations', id, updates)
      res.json((result as { data?: unknown }).data ?? result)
    } catch (error) {
      logger.error('settings.integrations.update', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.get('/team', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'asc' }]
    const rows = await findMany('team_members', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error('settings.team.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

const teamMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  role: z.string().optional(),
})

router.post('/team', validateBody(teamMemberSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const result = await create('team_members', {
      user_id: userId,
      name: req.body.name,
      email: req.body.email,
      role: req.body.role ?? 'member',
      created_at: new Date(),
    })
    res.status(201).json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('settings.team.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/team/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('team_members', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('errors.notFound') })
    }
    await deleteById('team_members', id)
    res.status(204).end()
  } catch (error) {
    logger.error('settings.team.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

void query

export default router
