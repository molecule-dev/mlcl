import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

// SLA policies are a global, owner-less config table (no per-user owner
// column). Reads require an authenticated session; the verifyMiddleware
// mounted upstream rejects unauthenticated requests, so reading
// res.locals.session is safe — but we still guard reads explicitly to
// surface 401 cleanly. WRITES (create/update/delete) mutate the whole
// org's SLA targets, so they are gated behind `requireAdmin`: an
// authenticated session alone is NOT sufficient.

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const priorityEnum = z.enum(['low', 'medium', 'high', 'urgent'])

const createSlaSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  first_response_hours: z.number().positive(),
  resolution_hours: z.number().positive(),
  priority: priorityEnum.optional().default('medium'),
  active: z.boolean().optional().default(true),
})

const updateSlaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  first_response_hours: z.number().positive().optional(),
  resolution_hours: z.number().positive().optional(),
  priority: priorityEnum.optional(),
  active: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// GET / — List SLA policies
// ---------------------------------------------------------------------------

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const policies = await findMany('sla_policies', {
      orderBy: [{ field: 'name', direction: 'asc' }],
    })

    res.json(policies)
  } catch (err) {
    console.error('Failed to list SLA policies', err)
    res
      .status(500)
      .json({ error: t('sla.listFailed', {}, { defaultValue: 'Failed to list SLA policies' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id — Get SLA policy by ID
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const id = req.params.id as string
    const policy = await findById('sla_policies', id)

    if (!policy) {
      return res
        .status(404)
        .json({ error: t('sla.notFound', {}, { defaultValue: 'SLA policy not found' }) })
    }

    res.json(policy)
  } catch (err) {
    console.error('Failed to get SLA policy', err)
    res
      .status(500)
      .json({ error: t('sla.getFailed', {}, { defaultValue: 'Failed to get SLA policy' }) })
  }
})

// ---------------------------------------------------------------------------
// POST / — Create SLA policy
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireAdmin,
  validateBody(createSlaSchema),
  async (req: Request, res: Response) => {
    try {
      const { name, description, first_response_hours, resolution_hours, priority, active } =
        req.body

      const result = await create('sla_policies', {
        name,
        description: description ?? null,
        first_response_hours,
        resolution_hours,
        priority,
        active,
      })

      res.status(201).json(result.data)
    } catch (err) {
      console.error('Failed to create SLA policy', err)
      res
        .status(500)
        .json({ error: t('sla.createFailed', {}, { defaultValue: 'Failed to create SLA policy' }) })
    }
  },
)

// ---------------------------------------------------------------------------
// PATCH /:id — Update SLA policy
// ---------------------------------------------------------------------------

router.patch(
  '/:id',
  requireAdmin,
  validateBody(updateSlaSchema),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string
      const policy = await findById('sla_policies', id)

      if (!policy) {
        return res
          .status(404)
          .json({ error: t('sla.notFound', {}, { defaultValue: 'SLA policy not found' }) })
      }

      const result = await updateById('sla_policies', id, req.body)

      res.json(result.data)
    } catch (err) {
      console.error('Failed to update SLA policy', err)
      res
        .status(500)
        .json({ error: t('sla.updateFailed', {}, { defaultValue: 'Failed to update SLA policy' }) })
    }
  },
)

// ---------------------------------------------------------------------------
// DELETE /:id — Delete SLA policy
// ---------------------------------------------------------------------------

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const policy = await findById('sla_policies', id)

    if (!policy) {
      return res
        .status(404)
        .json({ error: t('sla.notFound', {}, { defaultValue: 'SLA policy not found' }) })
    }

    await deleteById('sla_policies', id)

    res.status(204).send()
  } catch (err) {
    console.error('Failed to delete SLA policy', err)
    res
      .status(500)
      .json({ error: t('sla.deleteFailed', {}, { defaultValue: 'Failed to delete SLA policy' }) })
  }
})

export default router
