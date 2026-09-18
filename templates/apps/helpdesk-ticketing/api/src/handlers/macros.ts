import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'
import type { HelpdeskLimits } from '../tiers.js'

const router = Router()

// Macros are shared, operator-owned agent automations. Reads require an
// authenticated session. Because created_by provenance is NOT enforced on
// read/update/delete (GET /macros lists ALL macros to every authenticated
// user, and the created_by column is ignored on PATCH/DELETE), every mutation
// — create, update and delete — is operator-only and gated behind
// `requireAdmin`. An authenticated session alone is NOT sufficient to author,
// edit or remove a macro: otherwise any registered user (including an end
// customer who just filed a ticket) could inject automations that run against
// the whole queue. The upstream verifyMiddleware
// populates res.locals.session for valid tokens; anonymous requests land
// here with res.locals.session === undefined and must be 401-ed before any
// DB call.

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createMacroSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  actions: z.array(z.record(z.string(), z.unknown())),
  reply_template: z.string().optional(),
})

const updateMacroSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  actions: z.array(z.record(z.string(), z.unknown())).optional(),
  reply_template: z.string().nullable().optional(),
})

// ---------------------------------------------------------------------------
// GET / — List macros
// ---------------------------------------------------------------------------

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const macros = await findMany('macros', {
      orderBy: [{ field: 'name', direction: 'asc' }],
    })

    res.json(macros)
  } catch (err) {
    console.error('Failed to list macros', err)
    res
      .status(500)
      .json({ error: t('macros.listFailed', {}, { defaultValue: 'Failed to list macros' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id — Get macro by ID
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const macro = await findById('macros', id)

    if (!macro) {
      return res
        .status(404)
        .json({ error: t('macros.notFound', {}, { defaultValue: 'Macro not found' }) })
    }

    res.json(macro)
  } catch (err) {
    console.error('Failed to get macro', err)
    res
      .status(500)
      .json({ error: t('macros.getFailed', {}, { defaultValue: 'Failed to get macro' }) })
  }
})

// ---------------------------------------------------------------------------
// POST / — Create macro
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireAdmin,
  enforceLimit<HelpdeskLimits>({
    limitType: 'maxMacros',
    getLimit: (limits) => limits.maxMacros,
    getCurrent: async (userId) =>
      count('macros', [{ field: 'created_by', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createMacroSchema),
  async (req: Request, res: Response) => {
    try {
      // requireAdmin guarantees an authenticated operator session here; the
      // in-handler check is defense-in-depth so the handler fails closed even
      // if the route middleware is ever dropped (mirrors articles.ts).
      const userId = getUserId(res)
      if (!userId) return unauthorized(res)
      const { name, description, actions, reply_template } = req.body

      const result = await create('macros', {
        name,
        description: description ?? null,
        // node-postgres serialises JS arrays as PG ARRAYs, not JSONB. The
        // `actions` column is JSONB, so stringify before insert (the driver
        // only auto-stringifies when the parameter is a plain object, not
        // when it's an array).
        actions: JSON.stringify(actions),
        reply_template: reply_template ?? null,
        created_by: userId,
      })

      res.status(201).json(result.data)
    } catch (err) {
      console.error('Failed to create macro', err)
      res
        .status(500)
        .json({ error: t('macros.createFailed', {}, { defaultValue: 'Failed to create macro' }) })
    }
  },
)

// ---------------------------------------------------------------------------
// PATCH /:id — Update macro
// ---------------------------------------------------------------------------

router.patch(
  '/:id',
  requireAdmin,
  validateBody(updateMacroSchema),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string
      const macro = await findById('macros', id)

      if (!macro) {
        return res
          .status(404)
          .json({ error: t('macros.notFound', {}, { defaultValue: 'Macro not found' }) })
      }

      // Same JSONB caveat as POST — stringify `actions` if the patch
      // includes it, otherwise leave the column untouched.
      const patch: Record<string, unknown> = { ...req.body }
      if (patch.actions !== undefined) {
        patch.actions = JSON.stringify(patch.actions)
      }
      const result = await updateById('macros', id, patch)

      res.json(result.data)
    } catch (err) {
      console.error('Failed to update macro', err)
      res
        .status(500)
        .json({ error: t('macros.updateFailed', {}, { defaultValue: 'Failed to update macro' }) })
    }
  },
)

// ---------------------------------------------------------------------------
// DELETE /:id — Delete macro
// ---------------------------------------------------------------------------

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const macro = await findById('macros', id)

    if (!macro) {
      return res
        .status(404)
        .json({ error: t('macros.notFound', {}, { defaultValue: 'Macro not found' }) })
    }

    await deleteById('macros', id)

    res.status(204).send()
  } catch (err) {
    console.error('Failed to delete macro', err)
    res
      .status(500)
      .json({ error: t('macros.deleteFailed', {}, { defaultValue: 'Failed to delete macro' }) })
  }
})

export default router
