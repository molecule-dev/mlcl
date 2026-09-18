import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { SecretsManagerLimits } from '../tiers.js'

const router = Router()

const paramId = (req: Request): string => {
  const id = req.params.id
  return Array.isArray(id) ? id[0] : id
}

const PERMISSION = z.enum(['read', 'write', 'rotate', 'delete'])

const createPolicySchema = z.object({
  name: z.string().min(1).max(120),
  vault_id: z.string().uuid().nullable().optional(),
  path_pattern: z.string().min(1).default('/*'),
  permissions: z.array(PERMISSION).min(1).default(['read']),
  allowed_environments: z.array(z.string()).default(['*']),
  expires_at: z.string().datetime().nullable().optional(),
})

const updatePolicySchema = createPolicySchema.partial()

router.get('/access-policies', async (_req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const rows = await findMany<Record<string, unknown>>('access_policies', {
      where: [{ field: 'user_id', operator: '=', value: uid }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(rows)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/access-policies/:id', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const policy = await findById<Record<string, unknown>>('access_policies', id)
    if (!policy || policy.user_id !== uid) {
      return res.status(404).json({
        error: t('policies.notFound', undefined, { defaultValue: 'Access policy not found' }),
      })
    }
    res.json(policy)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/access-policies',
  // Enforce the per-tier access-policy cap (tiers.ts maxAccessPolicies) — defined + advertised in
  // CATALOG but never enforced, while the sibling maxSecrets IS enforced on POST /secrets.
  enforceLimit<SecretsManagerLimits>({
    limitType: 'maxAccessPolicies',
    getLimit: (limits) => limits.maxAccessPolicies,
    getCurrent: async (uid) =>
      count('access_policies', [{ field: 'user_id', operator: '=', value: uid }]),
  }) as unknown as RequestHandler,
  validateBody(createPolicySchema),
  async (req: Request, res: Response) => {
    try {
      const uid = getUserId(res)
      if (!uid)
        return res
          .status(401)
          .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

      const body = req.body as z.infer<typeof createPolicySchema>
      const result = await create<Record<string, unknown>>('access_policies', {
        user_id: uid,
        vault_id: body.vault_id ?? null,
        name: body.name,
        path_pattern: body.path_pattern,
        permissions: JSON.stringify(body.permissions),
        allowed_environments: JSON.stringify(body.allowed_environments),
        expires_at: body.expires_at ?? null,
      })
      res.status(201).json(result.data ?? {})
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/access-policies/:id',
  validateBody(updatePolicySchema),
  async (req: Request, res: Response) => {
    try {
      const uid = getUserId(res)
      if (!uid)
        return res
          .status(401)
          .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

      const id = paramId(req)
      const existing = await findById<Record<string, unknown>>('access_policies', id)
      if (!existing || existing.user_id !== uid) {
        return res.status(404).json({
          error: t('policies.notFound', undefined, { defaultValue: 'Access policy not found' }),
        })
      }

      const body = req.body as z.infer<typeof updatePolicySchema>
      const updates: Record<string, unknown> = {}
      if (body.name !== undefined) updates.name = body.name
      if (body.vault_id !== undefined) updates.vault_id = body.vault_id
      if (body.path_pattern !== undefined) updates.path_pattern = body.path_pattern
      if (body.permissions !== undefined) updates.permissions = JSON.stringify(body.permissions)
      if (body.allowed_environments !== undefined) {
        updates.allowed_environments = JSON.stringify(body.allowed_environments)
      }
      if (body.expires_at !== undefined) updates.expires_at = body.expires_at

      const result = await updateById<Record<string, unknown>>('access_policies', id, updates)
      res.json(result.data ?? {})
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/access-policies/:id', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const existing = await findById<Record<string, unknown>>('access_policies', id)
    if (!existing || existing.user_id !== uid) {
      return res.status(404).json({
        error: t('policies.notFound', undefined, { defaultValue: 'Access policy not found' }),
      })
    }
    await deleteById('access_policies', id)
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
