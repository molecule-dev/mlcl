/**
 * Leads handler — buyer / renter contact requests addressed to an agent.
 *
 * Two access patterns:
 *
 * 1. Public POST `/leads` — the lead-capture form on `/property/:id` and
 *    `/agent/:id`. Anonymous; the form provides the (name, email, phone,
 *    message) payload directly.
 * 2. Agent-scoped GET / PUT / DELETE — the `/admin/leads` table; the
 *    agent who owns the lead reads and updates pipeline status.
 *
 * Authorization: every read / mutate by id is scoped by `agent_id == userId`
 * (agent_id is treated as the owner here; v1 collapses agent ↔ user one-to-one).
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const leadSourceEnum = z.enum(['property_page', 'agent_page', 'direct', 'zillow_import'])
const leadStatusEnum = z.enum(['new', 'contacted', 'qualified', 'lost'])

const createLeadSchema = z.object({
  agent_id: z.string().min(1),
  property_id: z.string().nullable().optional(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().max(5000).optional(),
  source: leadSourceEnum.optional().default('direct'),
})

const updateLeadSchema = z.object({
  status: leadStatusEnum.optional(),
  assigned_to: z.string().nullable().optional(),
  message: z.string().max(5000).optional(),
})

const listLeadsQuery = z.object({
  status: leadStatusEnum.optional(),
  source: leadSourceEnum.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
})

/** Returns the authenticated user (== agent in v1) id, or null if anonymous. */

// ---------------------------------------------------------------------------
// POST / — Public lead-capture (no auth required).
// ---------------------------------------------------------------------------

router.post('/', validateBody(createLeadSchema), async (req: Request, res: Response) => {
  try {
    const data = req.body as z.infer<typeof createLeadSchema>
    const result = await create('leads', {
      ...data,
      property_id: data.property_id ?? null,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('leads.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET / — Agent-only: list MY leads.
// ---------------------------------------------------------------------------

router.get('/', validateQuery(listLeadsQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { status, source, page, limit } = req.query as unknown as z.infer<typeof listLeadsQuery>
    const where: WhereCondition[] = [{ field: 'agent_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (source) where.push({ field: 'source', operator: '=', value: source })
    const leads = await findMany('leads', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const total = await count('leads', where)
    res.json({ data: leads, total, page })
  } catch (error) {
    logger.error('leads.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id — Agent-only: read MY lead.
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const lead = await findById<Record<string, unknown>>('leads', req.params.id as string)
    if (!lead) {
      return res
        .status(404)
        .json({ error: t('lead.notFound', {}, { defaultValue: 'Lead not found' }) })
    }
    if (lead.agent_id !== userId) {
      // 404 not 403 to avoid IDOR leakage: a different agent should not even
      // know this id exists. Same convention as the other ownership-scoped
      // resources in the molecule stack.
      return res
        .status(404)
        .json({ error: t('lead.notFound', {}, { defaultValue: 'Lead not found' }) })
    }
    res.json(lead)
  } catch (error) {
    logger.error('leads.getById', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// PUT /:id — Agent-only: update MY lead (pipeline status changes).
// ---------------------------------------------------------------------------

router.put('/:id', validateBody(updateLeadSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('leads', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('lead.notFound', {}, { defaultValue: 'Lead not found' }) })
    }
    if (existing.agent_id !== userId) {
      return res
        .status(404)
        .json({ error: t('lead.notFound', {}, { defaultValue: 'Lead not found' }) })
    }
    const result = await updateById('leads', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('leads.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// DELETE /:id — Agent-only: delete MY lead.
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('leads', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('lead.notFound', {}, { defaultValue: 'Lead not found' }) })
    }
    if (existing.agent_id !== userId) {
      return res
        .status(404)
        .json({ error: t('lead.notFound', {}, { defaultValue: 'Lead not found' }) })
    }
    await deleteById('leads', id)
    res.status(204).send()
  } catch (error) {
    logger.error('leads.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
