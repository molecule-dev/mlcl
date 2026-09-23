import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { isUuid } from '../lib/is-uuid.js'
import type { ApiDocumentationLimits } from '../tiers.js'

const router = Router()

// NOTE: Unlike the globally-visible catalogs (sdks, api_errors) — which are
// shown to EVERY developer and therefore gate writes behind `requireAdmin`
// (security finding P2H-2: a non-admin write is cross-user content injection)
// — `api_specs` is strictly per-user. Every GET filters by `user_id`, every
// write scopes/owns by `user_id`, and `is_public` defaults to false, so a
// user editing their own spec can never affect another user's view. The
// correct authorization here is per-user ownership (enforced in every handler
// below), NOT the admin allow-list; gating these writes behind `requireAdmin`
// would lock every developer out of their own spec workspace.

const createSpecSchema = z.object({
  title: z.string().min(1),
  name: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  spec_content: z.unknown().optional(),
  base_url: z.string().optional(),
  project_id: z.string().optional(),
  is_public: z.boolean().optional(),
})

const updateSpecSchema = createSpecSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
    const rows = await findMany('api_specs', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    if (!isUuid(getParamId(req))) return res.status(404).json({ error: t('specs.notFound') })
    const row = await findById<Record<string, unknown>>('api_specs', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('specs.notFound') })
    }
    res.json(row)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

// Enforce the per-tier spec cap (tiers.ts maxSpecs) — defined + shown on Pricing but enforceLimit was
// never called (this route is not admin-gated), so any user could create unlimited specs.
const enforceSpecLimit = enforceLimit<ApiDocumentationLimits>({
  limitType: 'maxSpecs',
  getLimit: (limits) => limits.maxSpecs,
  getCurrent: async (userId) =>
    count('api_specs', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceSpecLimit,
  validateBody(createSpecSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
      const { spec_content, ...rest } = req.body
      const result = await create('api_specs', {
        ...rest,
        user_id: userId,
        version: rest.version ?? '1.0.0',
        spec_content:
          spec_content === undefined
            ? null
            : typeof spec_content === 'string'
              ? spec_content
              : JSON.stringify(spec_content),
        is_public: rest.is_public ?? false,
        is_published: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json((result as { data?: unknown }).data ?? result)
    } catch (error) {
      logger.error(error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateSpecSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    if (!isUuid(id)) return res.status(404).json({ error: t('specs.notFound') })
    const existing = await findById<Record<string, unknown>>('api_specs', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('specs.notFound') })
    }
    const { spec_content, ...rest } = req.body
    const updates: Record<string, unknown> = { ...rest, updated_at: new Date() }
    if (spec_content !== undefined) {
      updates.spec_content =
        typeof spec_content === 'string' ? spec_content : JSON.stringify(spec_content)
    }
    const result = await updateById('api_specs', id, updates)
    res.json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    if (!isUuid(id)) return res.status(404).json({ error: t('specs.notFound') })
    const existing = await findById<Record<string, unknown>>('api_specs', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('specs.notFound') })
    }
    await deleteById('api_specs', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
