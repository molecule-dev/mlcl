import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { query as auditQuery } from '@molecule/api-audit'
import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  resource: z.string().optional(),
  resource_id: z.string().optional(),
  action: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(500).default(50),
})

/**
 * GET /audit-log — returns the caller's audit-trail entries.
 *
 * Always scoped to actor=session.userId — there's no IDOR vector. We expose
 * `secret_id` / `vault_id` aliases (mapped from `resource` + `resource_id`)
 * so the front-end can read entries without knowing the canonical schema.
 */
router.get('/audit-log', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const q = req.query as {
      resource?: string
      resource_id?: string
      action?: string
      page?: number
      perPage?: number
    }
    const result = await auditQuery({
      actor: uid,
      action: q.action,
      resource: q.resource,
      resourceId: q.resource_id,
      page: q.page ?? 1,
      perPage: q.perPage ?? 50,
    })

    const rows = result.data.map((r) => ({
      ...r,
      // Convenience aliases used by the secrets/vaults UI + e2e specs.
      secret_id: r.resource === 'secret' ? r.resourceId : null,
      vault_id: r.resource === 'vault' ? r.resourceId : null,
    }))
    res.json(rows)
  } catch (err) {
    logger.error(`auditLog.list failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
